import { NextRequest, NextResponse } from "next/server";
import { createEmailReply, getSentEmailById } from "@/lib/db";

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

// Extract plain text from various body formats - check all possible field names
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractPlainText(payload: any): string {
  // Log all available keys for debugging
  console.log("Extracting text from payload keys:", Object.keys(payload || {}));
  if (payload?.data) {
    console.log("Payload.data keys:", Object.keys(payload.data));
  }
  
  // Try all possible locations for text content
  const possibleTextFields = [
    payload?.text,
    payload?.data?.text,
    payload?.body,
    payload?.data?.body,
    payload?.content,
    payload?.data?.content,
    payload?.plain_text,
    payload?.data?.plain_text,
    payload?.plainText,
    payload?.data?.plainText,
  ];
  
  for (const field of possibleTextFields) {
    if (typeof field === 'string' && field.trim()) {
      console.log("Found text in field, length:", field.length);
      return field;
    }
  }
  
  // Try HTML as fallback
  const possibleHtmlFields = [
    payload?.html,
    payload?.data?.html,
  ];
  
  for (const field of possibleHtmlFields) {
    if (typeof field === 'string' && field.trim()) {
      console.log("Using HTML fallback, length:", field.length);
      return field.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    }
  }
  
  console.log("No text content found in payload");
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

    // Try to extract text from both the full body and emailData
    let rawText = extractPlainText(body);
    if (!rawText) {
      rawText = extractPlainText(emailData);
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
