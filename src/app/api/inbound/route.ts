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

// Parse the reply-to address to extract emailId
function parseReplyAddress(toAddress: string): { emailId: string } | null {
  // Format: reply-{emailId}@domain.com
  const match = toAddress.match(/reply-([^@]+)@/i);
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

// Extract first "to" address from various formats
function extractToAddress(to: unknown): string | null {
  if (typeof to === 'string') {
    return to;
  }
  if (Array.isArray(to) && to.length > 0) {
    const first = to[0];
    if (typeof first === 'string') return first;
    if (typeof first === 'object' && first && 'email' in first) {
      return (first as { email: string }).email;
    }
  }
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractPlainText(body: any): string {
  // Try various possible locations for text content
  if (body.text) return body.text;
  if (body.data?.text) return body.data.text;
  if (body.html) return body.html.replace(/<[^>]*>/g, "");
  if (body.data?.html) return body.data.html.replace(/<[^>]*>/g, "");
  return "";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("=== INBOUND EMAIL WEBHOOK ===");
    console.log("Full body:", JSON.stringify(body, null, 2));

    // Handle both direct format and wrapped format (Resend might wrap in "data" or send event types)
    const emailData = body.data || body;
    
    // Extract "to" address - could be string, array of strings, or array of objects
    const toRaw = emailData.to || body.to;
    const toAddress = extractToAddress(toRaw);
    
    // Extract "from" address
    const fromRaw = emailData.from || body.from;
    const fromAddress = typeof fromRaw === 'string' ? fromRaw : 
      (Array.isArray(fromRaw) && fromRaw.length > 0) ? 
        (typeof fromRaw[0] === 'string' ? fromRaw[0] : fromRaw[0]?.email) : null;

    console.log("Parsed to:", toAddress);
    console.log("Parsed from:", fromAddress);
    
    if (!toAddress || !fromAddress) {
      console.log("Inbound webhook: Missing to or from address");
      return NextResponse.json({ error: "Invalid email data - missing to/from" }, { status: 400 });
    }

    // Parse the "to" address to extract emailId
    const parsed = parseReplyAddress(toAddress);
    if (!parsed) {
      console.log("Inbound webhook: Could not parse reply address:", toAddress);
      // Not a reply to our emails, ignore silently
      return NextResponse.json({ success: true, message: "Not a reply address" });
    }

    const { emailId } = parsed;
    console.log("Parsed emailId:", emailId);

    // Verify the email exists
    const sentEmail = await getSentEmailById(emailId);
    if (!sentEmail) {
      console.log("Inbound webhook: Email not found:", emailId);
      return NextResponse.json({ success: true, message: "Email not found" });
    }
    console.log("Found sent email, tribe_id:", sentEmail.tribe_id);

    // Extract sender's email address
    const senderEmail = extractEmailFromHeader(fromAddress);
    console.log("Inbound webhook: Sender email:", senderEmail);

    // Find the subscriber by their email and the tribe
    const subscriber = await getSubscriberByEmailAndTribe(senderEmail, sentEmail.tribe_id);
    if (!subscriber) {
      console.log("Inbound webhook: Subscriber not found for email:", senderEmail, "in tribe:", sentEmail.tribe_id);
      // Save reply anyway with the sender email (they might have replied from a different email)
      const rawText = extractPlainText(emailData);
      const sanitizedText = sanitizeReplyText(rawText);
      
      if (sanitizedText.trim()) {
        await createEmailReply(emailId, senderEmail, sanitizedText);
        console.log("Inbound webhook: Reply saved (non-subscriber) for email", emailId, "from", senderEmail);
        return NextResponse.json({ success: true, message: "Reply saved (non-subscriber)" });
      }
      return NextResponse.json({ success: true, message: "Subscriber not found, empty reply" });
    }

    // Extract and sanitize the reply text
    const rawText = extractPlainText(emailData);
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
