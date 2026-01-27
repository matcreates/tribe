import { NextRequest, NextResponse } from "next/server";
import { getBearerToken, verifyMobileToken } from "@/lib/mobileAuth";
import {
  getSubscriberCount,
  getVerifiedSubscriberCount,
  getTotalEmailsSent,
  getOpenRateSince,
} from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const token = getBearerToken(request.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

    const { tribeId } = await verifyMobileToken(token);

    const [totalSubscribers, verifiedSubscribers, totalEmailsSent] = await Promise.all([
      getSubscriberCount(tribeId),
      getVerifiedSubscriberCount(tribeId),
      getTotalEmailsSent(tribeId),
    ]);

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const { opens, sent } = await getOpenRateSince(tribeId, since);

    return NextResponse.json({
      totalSubscribers,
      verifiedSubscribers,
      totalEmailsSent,
      last7d: { opens, sent },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 }
    );
  }
}
