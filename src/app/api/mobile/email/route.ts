import { NextRequest, NextResponse } from "next/server";
import { getBearerToken, verifyMobileToken } from "@/lib/mobileAuth";

// MVP: no persisted drafts yet.
export async function GET(request: NextRequest) {
  try {
    const token = getBearerToken(request.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });
    await verifyMobileToken(token);

    return NextResponse.json({ ok: true, draft: null });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 }
    );
  }
}
