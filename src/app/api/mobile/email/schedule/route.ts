import { NextRequest, NextResponse } from "next/server";
import { getBearerToken, verifyMobileToken } from "@/lib/mobileAuth";
import { scheduleEmail } from "@/lib/actions";

export async function POST(request: NextRequest) {
  try {
    const token = getBearerToken(request.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

    await verifyMobileToken(token);

    const body = (await request.json()) as {
      subject?: string;
      body?: string;
      allowReplies?: boolean;
      scheduledAt?: string;
    };

    if (!body.subject || !body.body || !body.scheduledAt) {
      return NextResponse.json({ error: "Missing subject/body/scheduledAt" }, { status: 400 });
    }

    const scheduledAt = new Date(body.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) {
      return NextResponse.json({ error: "Invalid scheduledAt" }, { status: 400 });
    }

    const result = await scheduleEmail(body.subject, body.body, scheduledAt, "verified", body.allowReplies ?? true);
    return NextResponse.json({ ok: true, scheduled: result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 }
    );
  }
}
