import { NextRequest, NextResponse } from "next/server";
import { getBearerToken, verifyMobileToken } from "@/lib/mobileAuth";
import { getSentEmailsByTribeId, getRepliesForEmailIds } from "@/lib/db";

/** Strip HTML tags and decode common entities for plain-text display. */
function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Strip quoted email content from replies (On ... wrote:, >, Original Message, etc.) */
function cleanReplyText(text: string | null | undefined): string {
  if (!text) return "";
  let result = text;

  // Remove "On ... wrote:" and everything after
  const onWroteMatch = result.search(/\r?\n\s*On\s+.+wrote:\s*/i);
  if (onWroteMatch > 0) result = result.substring(0, onWroteMatch);

  // Remove "-----Original Message-----" and everything after
  const origIdx = result.search(/\r?\n\s*-{3,}\s*Original Message\s*-{3,}/i);
  if (origIdx > 0) result = result.substring(0, origIdx);

  // Remove "---------- Forwarded message" and everything after
  const fwdIdx = result.search(/\r?\n\s*-{3,}\s*Forwarded message/i);
  if (fwdIdx > 0) result = result.substring(0, fwdIdx);

  // Remove "From:" header blocks and everything after
  const fromIdx = result.search(/\r?\n\s*From:\s+/i);
  if (fromIdx > 0) result = result.substring(0, fromIdx);

  // Remove trailing lines starting with ">"
  const lines = result.split("\n");
  while (lines.length > 0) {
    const last = lines[lines.length - 1].trim();
    if (last.startsWith(">") || last === "") lines.pop();
    else break;
  }

  return lines.join("\n").trim();
}

export async function GET(request: NextRequest) {
  try {
    const token = getBearerToken(request.headers.get("authorization"));
    if (!token)
      return NextResponse.json({ error: "Missing token" }, { status: 401 });

    const { tribeId } = await verifyMobileToken(token);

    // Get all sent emails (most recent 50) – include queued/sending/sent
    const allEmails = await getSentEmailsByTribeId(tribeId);
    const sentEmails = allEmails
      .filter((e) => ["sent", "queued", "sending"].includes(e.status))
      .slice(0, 50)
      .map((e) => ({
        id: e.id,
        subject: e.subject,
        body: stripHtml(e.body),
        recipientCount: e.recipient_count ?? 0,
        openCount: e.open_count ?? 0,
        sentAt: e.sent_at ?? e.created_at ?? new Date().toISOString(),
      }));

    // Get all replies for these emails in a single query
    const emailIds = sentEmails.map((e) => e.id);
    const rawReplies = await getRepliesForEmailIds(emailIds);

    return NextResponse.json({
      ok: true,
      emails: sentEmails,
      replies: rawReplies.map((r) => ({
        id: r.id,
        emailId: r.email_id,
        subscriberEmail: r.subscriber_email,
        replyText: cleanReplyText(r.reply_text),
        receivedAt: r.received_at ?? new Date().toISOString(),
      })),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 }
    );
  }
}
