import { NextRequest, NextResponse } from "next/server";
import { getBearerToken, verifyMobileToken } from "@/lib/mobileAuth";
import { getSentEmailById } from "@/lib/db";

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

    return NextResponse.json({
      ok: true,
      email: {
        id: email.id,
        subject: email.subject,
        recipient_count: email.recipient_count,
        open_count: email.open_count ?? 0,
        sent_at: email.sent_at,
        body: email.body,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 }
    );
  }
}
