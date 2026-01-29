import { NextRequest, NextResponse } from "next/server";
import { getBearerToken, verifyMobileToken } from "@/lib/mobileAuth";
import {
  getVerifiedSubscriberCount,
  getSubscriberCount,
  getSubscriberCountSince,
  getTotalEmailsSent,
  getEmailsSentSince,
  getOpenRateSince,
  getTribeReplyCount,
  getSentEmailsByTribeId,
  getDailySubscriberCounts,
  getHourlySubscriberCounts,
} from "@/lib/db";

type Period = "24h" | "7d" | "30d";

function getPeriod(request: NextRequest): Period {
  const p = new URL(request.url).searchParams.get("period");
  if (p === "24h" || p === "7d" || p === "30d") return p;
  return "7d";
}

export async function GET(request: NextRequest) {
  try {
    const token = getBearerToken(request.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

    const { tribeId } = await verifyMobileToken(token);

    const period = getPeriod(request);
    const now = new Date();
    const since =
      period === "24h"
        ? new Date(now.getTime() - 24 * 60 * 60 * 1000)
        : period === "30d"
          ? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalSubscribers,
      verifiedSubscribers,
      periodSubscribers,
      totalEmailsSent,
      periodEmailsSent,
      openStats,
      totalReplies,
      periodReplies,
      sentEmails,
    ] = await Promise.all([
      // Keep both: some creators care about total (incl unverified), but show verified prominently
      getSubscriberCount(tribeId),
      getVerifiedSubscriberCount(tribeId),
      getSubscriberCountSince(tribeId, since),
      getTotalEmailsSent(tribeId),
      getEmailsSentSince(tribeId, since),
      getOpenRateSince(tribeId, since),
      getTribeReplyCount(tribeId),
      getTribeReplyCount(tribeId, since),
      getSentEmailsByTribeId(tribeId),
    ]);

    const openRate = openStats.sent > 0 ? Math.round((openStats.opens / openStats.sent) * 1000) / 10 : 0;

    let chartData: number[] = [];
    let chartLabels: string[] = [];

    if (period === "24h") {
      const hourly = await getHourlySubscriberCounts(tribeId);
      chartData = hourly.map((d) => d.count);
      chartLabels = hourly.map((d) => {
        const date = new Date(d.hour);
        const hours = date.getHours();
        const ampm = hours >= 12 ? "PM" : "AM";
        const hour12 = hours % 12 || 12;
        return `${hour12}${ampm}`;
      });
    } else {
      const days = period === "30d" ? 30 : 7;
      const daily = await getDailySubscriberCounts(tribeId, days);
      chartData = daily.map((d) => d.count);
      chartLabels = daily.map((d) => {
        const date = new Date(d.date);
        if (period === "7d") {
          return date.toLocaleDateString("en-US", { weekday: "short" });
        }
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      });
    }

    const recentEmails = sentEmails
      .filter((e) => e.sent_at)
      .slice(0, 3)
      .map((e) => ({
        id: e.id,
        subject: e.subject,
        recipient_count: e.recipient_count,
        sent_at: e.sent_at,
      }));

    return NextResponse.json({
      ok: true,
      period,
      totalSubscribers,
      verifiedSubscribers,
      periodSubscribers,
      totalEmailsSent,
      periodEmailsSent,
      openRate,
      periodOpens: openStats.opens,
      totalReplies,
      periodReplies,
      recentEmails,
      chartData,
      chartLabels,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 }
    );
  }
}
