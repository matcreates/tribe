import { NextRequest, NextResponse } from "next/server";
import { getBearerToken, verifyMobileToken } from "@/lib/mobileAuth";
import { sendEmail } from "@/lib/actions";

export async function POST(request: NextRequest) {
  try {
    const token = getBearerToken(request.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

    await verifyMobileToken(token);

    const body = (await request.json()) as {
      subject?: string;
      body?: string;
    };

    if (!body.subject || !body.body) {
      return NextResponse.json({ error: "Missing subject/body" }, { status: 400 });
    }

    const result = await sendEmail(body.subject, body.body);
    return NextResponse.json({ ok: true, campaign: result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 }
    );
  }
}
