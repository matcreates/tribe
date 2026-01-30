import { NextRequest, NextResponse } from "next/server";
import { getBearerToken, verifyMobileToken } from "@/lib/mobileAuth";
import { getRecipientCounts, getEmailSignature } from "@/lib/actions";

export async function GET(request: NextRequest) {
  try {
    const token = getBearerToken(request.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

    await verifyMobileToken(token);

    const [counts, signature] = await Promise.all([getRecipientCounts(), getEmailSignature()]);

    return NextResponse.json({
      ok: true,
      recipients: counts,
      signature,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 }
    );
  }
}
