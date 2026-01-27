import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { createEmailReply, getSentEmailById } from "@/lib/db";

// Verify webhook signature from Resend (uses Svix)
function verifyWebhookSignature(
  payload: string,
  headers: {
    svixId: string | null;
    svixTimestamp: string | null;
    svixSignature: string | null;
  }
): boolean {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    console.error("RESEND_WEBHOOK_SECRET is not configured");
    return false;
  }

  if (!headers.svixId || !headers.svixTimestamp || !headers.svixSignature) {
    console.error("Missing Svix headers");
    return false;
  }

  try {
    const wh = new Webhook(webhookSecret);
    wh.verify(payload, {
      "svix-id": headers.svixId,
      "svix-timestamp": headers.svixTimestamp,
      "svix-signature": headers.svixSignature,
    });
    return true;
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return false;
  }
}

// Sanitize reply text - remove HTML, links, quoted content, and dangerous content
function sanitizeReplyText(text: string): string {
  if (!text) return "";
  
  // Remove HTML tags
  let sanitized = text.replace(/<[^>]*>/g, " ");
  
  // Remove quoted reply sections (the original email that gets included)
  // Pattern 1: "On [date], [name] wrote:" and everything after
  sanitized = sanitized.replace(/On\s+[\d\w\s,]+,?\s+at\s+[\d:]+[^<]*wrote:[\s\S]*/gi, "");
  // Pattern 2: "On [date], [name] <email> wrote:" format
  sanitized = sanitized.replace(/On\s+\w+\s+\d+,\s+\d+[\s\S]*wrote:[\s\S]*/gi, "");
  // Pattern 3: Lines starting with ">" (quoted text)
  sanitized = sanitized.replace(/^>.*$/gm, "");
  // Pattern 4: "---------- Forwarded message" or "---------- Original Message"
  sanitized = sanitized.replace(/-{5,}\s*(Forwarded|Original)\s*(message|Message)[\s\S]*/gi, "");
  // Pattern 5: "From: ... Sent: ... To: ... Subject:" email headers
  sanitized = sanitized.replace(/From:[\s\S]*?Subject:[\s\S]*/gi, "");
  
  // Remove common email signatures
  sanitized = sanitized.replace(/Sent from my iPhone/gi, "");
  sanitized = sanitized.replace(/Sent from my iPad/gi, "");
  sanitized = sanitized.replace(/Sent from my Android/gi, "");
  sanitized = sanitized.replace(/Sent from Mail for Windows/gi, "");
  sanitized = sanitized.replace(/Get Outlook for iOS/gi, "");
  sanitized = sanitized.replace(/Get Outlook for Android/gi, "");
  
  // Remove URLs
  sanitized = sanitized.replace(/(?:https?|ftp):\/\/[^\s]+/gi, "");
  
  // Remove email addresses
  sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "");
  
  // Remove angle brackets
  sanitized = sanitized.replace(/[<>]/g, "");
  
  // Clean up whitespace
  sanitized = sanitized.replace(/\s+/g, " ").trim();
  
  // Limit length
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
    
    // Verify webhook signature FIRST before any processing
    const svixHeaders = {
      svixId: request.headers.get("svix-id"),
      svixTimestamp: request.headers.get("svix-timestamp"),
      svixSignature: request.headers.get("svix-signature"),
    };
    
    if (!verifyWebhookSignature(rawBody, svixHeaders)) {
      console.error("Webhook signature verification failed - rejecting request");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
    
    console.log("Webhook signature verified successfully");
    
    const body = JSON.parse(rawBody);
    console.log("Top-level keys:", Object.keys(body));
    
    const emailData = body.type === 'email.received' ? body.data : (body.data || body);
    console.log("emailData keys:", Object.keys(emailData || {}));

    const toAddress = extractEmail(emailData?.to) || extractEmail(body.to);
    const fromAddress = extractEmail(emailData?.from) || extractEmail(body.from);
    
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
        console.log("Fetching received email via Resend API...");
        
        // Correct endpoint: /emails/receiving/:id (not /received/)
        const url = `https://api.resend.com/emails/receiving/${resendEmailId}`;
        console.log("Calling:", url);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
        });
        
        console.log("Response status:", response.status);
        
        if (response.ok) {
          const emailContent = await response.json();
          console.log("SUCCESS! Response keys:", Object.keys(emailContent));
          console.log("Response data:", JSON.stringify(emailContent).substring(0, 2000));
          
          // Extract text - try html first since plain text might be null
          if (emailContent.html) {
            rawText = emailContent.html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
            console.log("Extracted from HTML, length:", rawText.length);
          } else if (emailContent.text) {
            rawText = emailContent.text;
            console.log("Extracted from text, length:", rawText.length);
          }
        } else {
          const errorText = await response.text();
          console.log("API error:", response.status, errorText);
        }
      } catch (apiError) {
        console.error("Failed to fetch email from Resend:", apiError);
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
