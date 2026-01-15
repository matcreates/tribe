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

// Sanitize reply text - remove HTML, links, and dangerous content
function sanitizeReplyText(text: string): string {
  if (!text) return "";
  
  // Remove HTML tags
  let sanitized = text.replace(/<[^>]*>/g, "");
  
  // Remove URLs (http, https, ftp, etc.)
  sanitized = sanitized.replace(/(?:https?|ftp):\/\/[^\s]+/gi, "[link removed]");
  
  // Remove email addresses (to prevent spam harvesting display)
  sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[email removed]");
  
  // Remove any remaining angle brackets
  sanitized = sanitized.replace(/[<>]/g, "");
  
  // Trim excessive whitespace
  sanitized = sanitized.replace(/\n{3,}/g, "\n\n").trim();
  
  // Limit length to prevent abuse (max 10000 characters)
  if (sanitized.length > 10000) {
    sanitized = sanitized.substring(0, 10000) + "... [truncated]";
  }
  
  return sanitized;
}

// Parse the reply-to address to extract emailId - try multiple formats
function parseReplyAddress(toAddress: string): { emailId: string } | null {
  // Format: reply-{emailId}@domain.com
  let match = toAddress.match(/reply-([a-f0-9-]+)@/i);
  if (match) return { emailId: match[1] };
  
  // Also try without the dash: reply{emailId}@domain.com
  match = toAddress.match(/reply([a-f0-9-]+)@/i);
  if (match) return { emailId: match[1] };
  
  return null;
}

// Extract email address from various formats
function extractEmail(value: unknown): string | null {
  if (!value) return null;
  
  if (typeof value === 'string') {
    // Handle "Name <email>" format
    const match = value.match(/<([^>]+)>/);
    if (match) return match[1].toLowerCase().trim();
    // Plain email
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
  // Direct text field
  if (body.text) return body.text;
  
  // Nested in data
  if (body.data?.text) return body.data.text;
  
  // Try body field
  if (body.body) return typeof body.body === 'string' ? body.body : '';
  
  // HTML fallback
  if (body.html) return body.html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (body.data?.html) return body.data.html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  
  return "";
}

export async function POST(request: NextRequest) {
  console.log("=== INBOUND EMAIL WEBHOOK RECEIVED ===");
  console.log("Timestamp:", new Date().toISOString());
  
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
    
    let body;
    try {
      body = JSON.parse(rawBody);
    } catch (parseError) {
      console.log("Failed to parse JSON:", parseError);
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    
    console.log("Parsed body keys:", Object.keys(body));

    // Handle Resend's event wrapper format
    // Resend sends: { type: "email.received", data: { ... } } or direct format
    const emailData = body.type === 'email.received' ? body.data : (body.data || body);
    
    console.log("Email data keys:", Object.keys(emailData || {}));
    console.log("Body type:", body.type);
    console.log("Has data field:", !!body.data);

    // Extract "to" address - try multiple paths
    let toAddress = extractEmail(emailData?.to);
    if (!toAddress) toAddress = extractEmail(body.to);
    if (!toAddress && body.data?.to) toAddress = extractEmail(body.data.to);
    console.log("Extracted TO:", toAddress);
    
    // Extract "from" address - try multiple paths
    let fromAddress = extractEmail(emailData?.from);
    if (!fromAddress) fromAddress = extractEmail(body.from);
    if (!fromAddress && body.data?.from) fromAddress = extractEmail(body.data.from);
    console.log("Extracted FROM:", fromAddress);
    
    if (!toAddress) {
      console.log("ERROR: Could not extract TO address");
      return NextResponse.json({ received: true, error: "No TO address" });
    }
    
    if (!fromAddress) {
      console.log("ERROR: Could not extract FROM address");
      return NextResponse.json({ received: true, error: "No FROM address" });
    }

    // Parse the "to" address to extract emailId
    const parsed = parseReplyAddress(toAddress);
    if (!parsed) {
      console.log("Not a reply address format:", toAddress);
      return NextResponse.json({ received: true, message: "Not a reply address" });
    }

    const { emailId } = parsed;
    console.log("Extracted emailId:", emailId);

    // Verify the email exists
    const sentEmail = await getSentEmailById(emailId);
    if (!sentEmail) {
      console.log("ERROR: Sent email not found for ID:", emailId);
      return NextResponse.json({ received: true, error: "Email not found" });
    }
    console.log("Found sent email - subject:", sentEmail.subject, "tribe_id:", sentEmail.tribe_id);

    // Extract and sanitize the reply text - try multiple paths
    let rawText = extractPlainText(emailData || {});
    if (!rawText && body.text) rawText = body.text;
    if (!rawText && body.html) rawText = body.html.replace(/<[^>]*>/g, " ");
    console.log("Raw text length:", rawText.length);
    console.log("Raw text preview:", rawText.substring(0, 200));
    
    const sanitizedText = sanitizeReplyText(rawText);
    console.log("Sanitized text length:", sanitizedText.length);

    const replyContent = sanitizedText.trim() || "[Empty reply]";
    
    // Save the reply
    await createEmailReply(emailId, fromAddress, replyContent);
    console.log("SUCCESS: Reply saved for email", emailId, "from", fromAddress);

    return NextResponse.json({ received: true, success: true, message: "Reply saved" });
  } catch (error) {
    console.error("INBOUND WEBHOOK ERROR:", error);
    return NextResponse.json({ received: true, error: String(error) }, { status: 500 });
  }
}

// GET endpoint for testing and webhook verification
export async function GET() {
  return NextResponse.json({ 
    status: "active",
    endpoint: "/api/inbound",
    message: "Inbound email webhook is ready. Configure this URL in Resend webhooks.",
    timestamp: new Date().toISOString()
  });
}
