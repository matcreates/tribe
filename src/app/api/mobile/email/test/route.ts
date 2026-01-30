import { NextRequest, NextResponse } from "next/server";
import { getBearerToken, verifyMobileToken } from "@/lib/mobileAuth";
import { sendTestEmailAction } from "@/lib/actions";

export async function POST(request: NextRequest) {
  try {
    const token = getBearerToken(request.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

    await verifyMobileToken(token);

    const body = (await request.json()) as {
      to?: string;
      subject?: string;
      body?: string;
      allowReplies?: boolean;
    };

    if (!body.to || !body.subject || !body.body) {
      return NextResponse.json({ error: "Missing to/subject/body" }, { status: 400 });
    }

    const result = await sendTestEmailAction(body.to, body.subject, body.body, body.allowReplies ?? true);
    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to send test email" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 }
    );
  }
}
