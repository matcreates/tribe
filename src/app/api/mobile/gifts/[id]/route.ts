import { NextRequest, NextResponse } from "next/server";
import { getBearerToken, verifyMobileToken } from "@/lib/mobileAuth";
import { deleteGift as dbDeleteGift } from "@/lib/db";

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const token = getBearerToken(request.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

    const { tribeId } = await verifyMobileToken(token);
    const { id } = await ctx.params;

    const ok = await dbDeleteGift(id, tribeId);
    if (!ok) return NextResponse.json({ error: "Gift not found" }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 }
    );
  }
}
