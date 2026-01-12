import { NextRequest, NextResponse } from "next/server";
import { createEmailReply, getSentEmailById, getSubscriberByEmailAndTribe } from "@/lib/db";

// Sanitize reply text - remove HTML, links, and dangerous content
function sanitizeReplyText(text: string): string {
  if (!text) return "";
  
  // Remove HTML tags
  let sanitized = text.replace(/<[^>]*>/g, "");
  
  // Remove URLs (http, https, ftp, etc.)
  sanitized = sanitized.replace(/(?:https?|ftp):\/\/[^\s]+/gi, "[link removed]");
  
  // Remove email addresses (to prevent spam harvesting display)
  // We keep the original sender's email separately
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

// Extract the plain text body from email
function extractPlainTextBody(email: ResendInboundEmail): string {
  // Prefer plain text body
  if (email.text) {
    return email.text;
  }
  
  // Fall back to HTML stripped of tags
  if (email.html) {
    return email.html.replace(/<[^>]*>/g, "");
  }
  
  return "";
}

// Parse the reply-to address to extract emailId
function parseReplyAddress(toAddress: string): { emailId: string } | null {
  // Format: reply-{emailId}@domain.com
  const match = toAddress.match(/^reply-([^@]+)@/i);
  if (!match) return null;
  
  return {
    emailId: match[1],
  };
}

// Extract email address from "From" header (handles "Name <email>" format)
function extractEmailFromHeader(from: string): string {
  const match = from.match(/<([^>]+)>/);
  if (match) return match[1].toLowerCase();
  return from.toLowerCase().trim();
}

interface ResendInboundEmail {
  from: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  headers?: Record<string, string>;
}

export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret if configured
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = request.headers.get("svix-signature");
      // For now, just check if the header exists
      // In production, you'd verify the full signature
      if (!signature) {
        console.log("Inbound webhook: Missing signature");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = await request.json();
    console.log("Inbound email received:", JSON.stringify(body, null, 2));

    // Resend sends the email data in the body
    const email: ResendInboundEmail = body;
    
    if (!email.to || !email.from) {
      console.log("Inbound webhook: Missing to or from");
      return NextResponse.json({ error: "Invalid email data" }, { status: 400 });
    }

    // Parse the "to" address to extract emailId
    const parsed = parseReplyAddress(email.to);
    if (!parsed) {
      console.log("Inbound webhook: Could not parse reply address:", email.to);
      // Not a reply to our emails, ignore silently
      return NextResponse.json({ success: true, message: "Not a reply address" });
    }

    const { emailId } = parsed;

    // Verify the email exists
    const sentEmail = await getSentEmailById(emailId);
    if (!sentEmail) {
      console.log("Inbound webhook: Email not found:", emailId);
      return NextResponse.json({ success: true, message: "Email not found" });
    }

    // Extract sender's email address
    const senderEmail = extractEmailFromHeader(email.from);
    console.log("Inbound webhook: Sender email:", senderEmail);

    // Find the subscriber by their email and the tribe
    const subscriber = await getSubscriberByEmailAndTribe(senderEmail, sentEmail.tribe_id);
    if (!subscriber) {
      console.log("Inbound webhook: Subscriber not found for email:", senderEmail);
      return NextResponse.json({ success: true, message: "Subscriber not found" });
    }

    // Extract and sanitize the reply text
    const rawText = extractPlainTextBody(email);
    const sanitizedText = sanitizeReplyText(rawText);

    if (!sanitizedText.trim()) {
      console.log("Inbound webhook: Empty reply after sanitization");
      return NextResponse.json({ success: true, message: "Empty reply" });
    }

    // Save the reply
    await createEmailReply(emailId, subscriber.email, sanitizedText);
    console.log("Inbound webhook: Reply saved for email", emailId, "from", subscriber.email);

    return NextResponse.json({ success: true, message: "Reply saved" });
  } catch (error) {
    console.error("Inbound webhook error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Also handle GET for Resend webhook verification
export async function GET() {
  return NextResponse.json({ status: "Inbound webhook endpoint active" });
}
