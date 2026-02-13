import { NextRequest, NextResponse } from "next/server";
import { getBearerToken, verifyMobileToken } from "@/lib/mobileAuth";
import { getTribeById } from "@/lib/db";
import { sendTestEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const token = getBearerToken(request.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

    const payload = await verifyMobileToken(token);

    const body = (await request.json()) as {
      to?: string;
      subject?: string;
      body?: string;
      allowReplies?: boolean;
    };

    if (!body.to || !body.subject || !body.body) {
      return NextResponse.json({ error: "Missing to/subject/body" }, { status: 400 });
    }

    // Get tribe directly using mobile token payload instead of NextAuth session
    const tribe = await getTribeById(payload.tribeId);
    if (!tribe) {
      return NextResponse.json({ error: "Tribe not found" }, { status: 404 });
    }

    const ownerName = tribe.owner_name || "Anonymous";
    const emailSignature = tribe.email_signature || undefined;

    const result = await sendTestEmail(
      body.to,
      body.subject,
      body.body,
      ownerName,
      emailSignature,
      body.allowReplies ?? true
    );

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
