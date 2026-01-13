import { NextRequest, NextResponse } from "next/server";
import { createEmailReply, getSentEmailById } from "@/lib/db";
import { Resend } from "resend";

// Initialize Resend client to fetch email content
function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY not set");
  }
  return new Resend(apiKey);
}

// Sanitize reply text - remove HTML, links, and dangerous content
function sanitizeReplyText(text: string): string {
  if (!text) return "";
  let sanitized = text.replace(/<[^>]*>/g, "");
  sanitized = sanitized.replace(/(?:https?|ftp):\/\/[^\s]+/gi, "[link removed]");
  sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[email removed]");
  sanitized = sanitized.replace(/[<>]/g, "");
  sanitized = sanitized.replace(/\n{3,}/g, "\n\n").trim();
  if (sanitized.length > 10000) {
    sanitized = sanitized.substring(0, 10000) + "... [truncated]";
  }
  return sanitized;
}

// Parse the reply-to address to extract emailId
function parseReplyAddress(toAddress: string): { emailId: string } | null {
  let match = toAddress.match(/reply-([a-f0-9-]+)@/i);
  if (match) return { emailId: match[1] };
  match = toAddress.match(/reply([a-f0-9-]+)@/i);
  if (match) return { emailId: match[1] };
  return null;
}

// Extract email address from various formats
function extractEmail(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') {
    const match = value.match(/<([^>]+)>/);
    if (match) return match[1].toLowerCase().trim();
    if (value.includes('@')) return value.toLowerCase().trim();
    return null;
  }
  if (Array.isArray(value) && value.length > 0) {
    return extractEmail(value[0]);
  }
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    if ('email' in obj) return extractEmail(obj.email);
    if ('address' in obj) return extractEmail(obj.address);
  }
  return null;
}

// Extract plain text from Resend inbound email payload
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractPlainText(payload: any, fullPayload: any): string {
  // Log the FULL payload structure to see all fields
  console.log("=== FULL PAYLOAD DUMP ===");
  console.log(JSON.stringify(fullPayload, null, 2).substring(0, 3000));
  
  // Check data object specifically
  const data = fullPayload?.data || payload;
  console.log("Data object keys:", Object.keys(data || {}));
  
  // Resend inbound emails use these field names
  const possibleTextFields = [
    // Direct fields
    data?.text,
    data?.body,
    data?.content,
    data?.plain,
    data?.plainText,
    data?.plain_text,
    // Top level
    fullPayload?.text,
    fullPayload?.body,
    // Nested in different structures
    data?.email?.text,
    data?.email?.body,
    data?.message?.text,
    data?.message?.body,
  ];
  
  for (let i = 0; i < possibleTextFields.length; i++) {
    const field = possibleTextFields[i];
    if (typeof field === 'string' && field.trim()) {
      console.log(`Found text in field index ${i}, length: ${field.length}, preview: ${field.substring(0, 100)}`);
      return field;
    }
  }
  
  // Try HTML as fallback
  const possibleHtmlFields = [
    data?.html,
    fullPayload?.html,
    data?.email?.html,
    data?.message?.html,
  ];
  
  for (const field of possibleHtmlFields) {
    if (typeof field === 'string' && field.trim()) {
      console.log("Using HTML fallback, length:", field.length);
      return field.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    }
  }
  
  // Last resort: check if subject contains the reply (some email clients put short replies in subject)
  const subject = data?.subject || fullPayload?.subject || "";
  if (subject && subject.startsWith("Re:")) {
    console.log("WARNING: No text body found, only subject available");
  }
  
  console.log("No text content found anywhere in payload");
  return "";
}

export async function POST(request: NextRequest) {
  console.log("=== WEBHOOK-INBOUND RECEIVED ===");
  
  try {
    const rawBody = await request.text();
    console.log("Raw body length:", rawBody.length);
    console.log("Raw body preview:", rawBody.substring(0, 1500));
    
    const body = JSON.parse(rawBody);
    console.log("Top-level keys:", Object.keys(body));
    
    const emailData = body.type === 'email.received' ? body.data : (body.data || body);
    console.log("emailData keys:", Object.keys(emailData || {}));

    let toAddress = extractEmail(emailData?.to) || extractEmail(body.to);
    let fromAddress = extractEmail(emailData?.from) || extractEmail(body.from);
    
    console.log("TO:", toAddress, "FROM:", fromAddress);
    
    if (!toAddress || !fromAddress) {
      return NextResponse.json({ received: true, error: "Missing to/from" });
    }

    const parsed = parseReplyAddress(toAddress);
    if (!parsed) {
      return NextResponse.json({ received: true, message: "Not a reply address" });
    }

    const sentEmail = await getSentEmailById(parsed.emailId);
    if (!sentEmail) {
      return NextResponse.json({ received: true, error: "Email not found" });
    }

    // The webhook only contains metadata - we need to fetch the full email content via API
    const resendEmailId = emailData?.email_id || body?.data?.email_id;
    console.log("Resend email_id for fetching content:", resendEmailId);
    
    let rawText = "";
    
    if (resendEmailId) {
      try {
        // Fetch the full email content from Resend API
        const resend = getResendClient();
        console.log("Fetching email content from Resend API...");
        
        // Use Resend's API to get the email - the emails.get endpoint
        const response = await fetch(`https://api.resend.com/emails/${resendEmailId}`, {
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          },
        });
        
        if (response.ok) {
          const emailContent = await response.json();
          console.log("Resend API response keys:", Object.keys(emailContent));
          console.log("Resend API response:", JSON.stringify(emailContent).substring(0, 1000));
          
          // Extract text from the fetched email
          rawText = emailContent.text || emailContent.body || emailContent.html?.replace(/<[^>]*>/g, " ") || "";
        } else {
          console.log("Resend API error:", response.status, await response.text());
        }
      } catch (apiError) {
        console.error("Failed to fetch email from Resend API:", apiError);
      }
    }
    
    // Fallback: try to extract from webhook payload (in case Resend changes their format)
    if (!rawText) {
      rawText = extractPlainText(emailData, body);
    }
    
    console.log("Extracted rawText length:", rawText.length);
    console.log("Extracted rawText preview:", rawText.substring(0, 200));
    
    const sanitizedText = sanitizeReplyText(rawText);
    const finalText = sanitizedText.trim() || "[Empty reply]";
    
    console.log("Final text to save:", finalText.substring(0, 100));
    
    await createEmailReply(parsed.emailId, fromAddress, finalText);
    console.log("SUCCESS: Reply saved with text length:", finalText.length);

    return NextResponse.json({ received: true, success: true, textLength: finalText.length });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ received: true, error: String(error) }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    status: "active",
    endpoint: "/api/webhook-inbound",
    timestamp: new Date().toISOString()
  });
}
