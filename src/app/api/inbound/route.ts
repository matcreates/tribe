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
    console.log("Raw body length:", rawBody.length);
    console.log("Raw body preview:", rawBody.substring(0, 500));
    
    let body;
    try {
      body = JSON.parse(rawBody);
    } catch {
      console.log("Failed to parse JSON, trying as form data");
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    
    console.log("Parsed body keys:", Object.keys(body));
    console.log("Full parsed body:", JSON.stringify(body, null, 2));

    // Handle Resend's event wrapper format
    // Resend sends: { type: "email.received", data: { ... } } or direct format
    const emailData = body.type === 'email.received' ? body.data : (body.data || body);
    
    console.log("Email data keys:", Object.keys(emailData || {}));

    // Extract "to" address
    const toAddress = extractEmail(emailData.to) || extractEmail(body.to);
    console.log("Extracted TO:", toAddress);
    
    // Extract "from" address  
    const fromAddress = extractEmail(emailData.from) || extractEmail(body.from);
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

    // Extract and sanitize the reply text
    const rawText = extractPlainText(emailData);
    console.log("Raw text length:", rawText.length);
    console.log("Raw text preview:", rawText.substring(0, 200));
    
    const sanitizedText = sanitizeReplyText(rawText);
    console.log("Sanitized text length:", sanitizedText.length);

    if (!sanitizedText.trim()) {
      console.log("WARNING: Empty reply after sanitization");
      // Still save with a placeholder
      await createEmailReply(emailId, fromAddress, "[Empty reply]");
      return NextResponse.json({ received: true, message: "Empty reply saved" });
    }

    // Save the reply
    await createEmailReply(emailId, fromAddress, sanitizedText);
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
