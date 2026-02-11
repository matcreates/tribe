import { NextRequest, NextResponse } from "next/server";
import { getBearerToken, verifyMobileToken } from "@/lib/mobileAuth";
import { pool, getSentEmailById, getEmailReplyById } from "@/lib/db";

function parseIntParam(v: string | null, fallback: number) {
  const n = v ? Number.parseInt(v, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const token = getBearerToken(request.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

    const { tribeId } = await verifyMobileToken(token);
    const { id } = await ctx.params;

    const email = await getSentEmailById(id);
    if (!email || email.tribe_id !== tribeId) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 });
    }

    const url = new URL(request.url);
    const page = Math.max(1, parseIntParam(url.searchParams.get("page"), 1));
    const pageSize = Math.min(50, Math.max(1, parseIntParam(url.searchParams.get("pageSize"), 10)));

    const countResult = await pool.query(
      `SELECT COUNT(*) as count FROM email_replies WHERE email_id = $1`,
      [id]
    );
    const total = Number.parseInt(countResult.rows[0].count, 10);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const offset = (safePage - 1) * pageSize;

    const result = await pool.query(
      `SELECT id, email_id, subscriber_email, reply_text, received_at
       FROM email_replies
       WHERE email_id = $1
       ORDER BY received_at DESC
       LIMIT $2 OFFSET $3`,
      [id, pageSize, offset]
    );

    return NextResponse.json({
      ok: true,
      replies: result.rows.map((r: any) => ({
        id: r.id,
        email_id: r.email_id,
        subscriber_email: r.subscriber_email,
        reply_text: r.reply_text,
        received_at: r.received_at,
      })),
      total,
      page: safePage,
      pageSize,
      totalPages,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const token = getBearerToken(request.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

    const { tribeId } = await verifyMobileToken(token);
    const { id: emailId } = await ctx.params;

    // Verify the email belongs to this tribe
    const email = await getSentEmailById(emailId);
    if (!email || email.tribe_id !== tribeId) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 });
    }

    const url = new URL(request.url);
    const replyId = url.searchParams.get("replyId");
    if (!replyId) {
      return NextResponse.json({ error: "Missing replyId" }, { status: 400 });
    }

    // Verify the reply belongs to this email
    const reply = await getEmailReplyById(replyId);
    if (!reply || reply.email_id !== emailId) {
      return NextResponse.json({ error: "Reply not found" }, { status: 404 });
    }

    await pool.query(`DELETE FROM email_replies WHERE id = $1`, [replyId]);

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 }
    );
  }
}
