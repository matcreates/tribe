import { NextRequest, NextResponse } from "next/server";
import { getBearerToken, verifyMobileToken } from "@/lib/mobileAuth";
import { getSubscribersByTribeId } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const token = getBearerToken(request.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

    const { tribeId } = await verifyMobileToken(token);
    const subscribers = await getSubscribersByTribeId(tribeId);

    // Keep response small for MVP
    const out = subscribers
      .sort((a, b) => (b.created_at?.getTime?.() ?? 0) - (a.created_at?.getTime?.() ?? 0))
      .slice(0, 200)
      .map((s) => ({
        id: s.id,
        email: s.email,
        name: s.name,
        verified: s.verified,
        created_at: s.created_at,
      }));

    return NextResponse.json({ subscribers: out });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 }
    );
  }
}
