import { NextResponse } from "next/server";
import { query, pool } from "@/lib/db";

// Debug endpoint to check replies and webhook data
export async function GET() {
  try {
    // Get all replies
    const replies = await query<{
      id: string;
      email_id: string;
      subscriber_email: string;
      reply_text: string;
      received_at: Date;
    }>(`SELECT * FROM email_replies ORDER BY received_at DESC LIMIT 20`);

    // Get all sent emails to compare IDs
    const emails = await query<{
      id: string;
      subject: string;
      tribe_id: string;
      sent_at: Date;
    }>(`SELECT id, subject, tribe_id, sent_at FROM sent_emails ORDER BY sent_at DESC LIMIT 10`);

    // Get webhook debug logs
    let webhookLogs: { id: number; status: string; details: string; created_at: Date; raw_body_preview: string }[] = [];
    try {
      const logs = await query<{
        id: number;
        raw_body: string;
        status: string;
        details: string;
        created_at: Date;
      }>(`SELECT * FROM webhook_debug ORDER BY created_at DESC LIMIT 20`);
      webhookLogs = logs.map(l => ({
        id: l.id,
        status: l.status,
        details: l.details,
        created_at: l.created_at,
        raw_body_preview: l.raw_body?.substring(0, 500) || '',
      }));
    } catch {
      // Table might not exist yet
    }

    return NextResponse.json({
      repliesCount: replies.length,
      replies: replies.map(r => ({
        id: r.id,
        email_id: r.email_id,
        subscriber_email: r.subscriber_email,
        reply_preview: r.reply_text.substring(0, 100),
        received_at: r.received_at,
      })),
      sentEmails: emails.map(e => ({
        id: e.id,
        subject: e.subject,
        tribe_id: e.tribe_id,
        sent_at: e.sent_at,
      })),
      webhookLogs,
    });
  } catch (error) {
    console.error("Debug replies error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
