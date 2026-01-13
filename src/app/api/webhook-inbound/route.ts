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

// Extract plain text from various body formats
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractPlainText(body: any): string {
  if (body.text) return body.text;
  if (body.data?.text) return body.data.text;
  if (body.body) return typeof body.body === 'string' ? body.body : '';
  if (body.html) return body.html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (body.data?.html) return body.data.html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return "";
}

export async function POST(request: NextRequest) {
  console.log("=== WEBHOOK-INBOUND RECEIVED ===");
  
  try {
    const rawBody = await request.text();
    console.log("Raw body:", rawBody.substring(0, 500));
    
    const body = JSON.parse(rawBody);
    const emailData = body.type === 'email.received' ? body.data : (body.data || body);

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

    let rawText = extractPlainText(emailData || {});
    if (!rawText && body.text) rawText = body.text;
    const sanitizedText = sanitizeReplyText(rawText) || "[Empty reply]";
    
    await createEmailReply(parsed.emailId, fromAddress, sanitizedText);
    console.log("SUCCESS: Reply saved");

    return NextResponse.json({ received: true, success: true });
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
