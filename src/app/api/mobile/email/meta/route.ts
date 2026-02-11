import { NextRequest, NextResponse } from "next/server";
import { getBearerToken, verifyMobileToken } from "@/lib/mobileAuth";
import {
  getVerifiedSubscriberCount,
  getSubscriberCount,
  getTribeById,
  pool,
} from "@/lib/db";

const WEEKLY_EMAIL_LIMIT = 2;

export async function GET(request: NextRequest) {
  try {
    const token = getBearerToken(request.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

    const { tribeId } = await verifyMobileToken(token);

    // Get start of current week (Monday 00:00:00 UTC)
    const now = new Date();
    const dayOfWeek = now.getUTCDay();
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const startOfWeek = new Date(now);
    startOfWeek.setUTCDate(now.getUTCDate() - daysFromMonday);
    startOfWeek.setUTCHours(0, 0, 0, 0);
    const nextMonday = new Date(startOfWeek);
    nextMonday.setUTCDate(startOfWeek.getUTCDate() + 7);

    const [verified, all, tribe, weeklyResult] = await Promise.all([
      getVerifiedSubscriberCount(tribeId),
      getSubscriberCount(tribeId),
      getTribeById(tribeId),
      pool.query(
        `SELECT COUNT(*) FROM sent_emails WHERE tribe_id = $1 AND status = 'sent' AND sent_at >= $2`,
        [tribeId, startOfWeek.toISOString()]
      ),
    ]);

    const emailsSentThisWeek = parseInt(weeklyResult.rows[0].count) || 0;

    return NextResponse.json({
      ok: true,
      recipients: {
        verified,
        nonVerified: all - verified,
        all,
      },
      signature: tribe?.email_signature || "",
      weeklyStatus: {
        emailsSentThisWeek,
        limit: WEEKLY_EMAIL_LIMIT,
        canSendEmail: emailsSentThisWeek < WEEKLY_EMAIL_LIMIT,
        nextResetDate: nextMonday.toISOString(),
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 }
    );
  }
}
