import { NextRequest, NextResponse } from "next/server";
import { getBearerToken, verifyMobileToken } from "@/lib/mobileAuth";
import { getTribeById, updateTribe } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const token = getBearerToken(request.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

    const { tribeId } = await verifyMobileToken(token);

    const tribe = await getTribeById(tribeId);
    if (!tribe) return NextResponse.json({ error: "Tribe not found" }, { status: 404 });

    return NextResponse.json({
      ok: true,
      join: {
        slug: tribe.slug,
        ownerName: tribe.owner_name || "Anonymous",
        ownerAvatar: tribe.owner_avatar,
        description: tribe.join_description || "A tribe is a group of people who choose to follow your work, support your ideas, and stay connected.",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const token = getBearerToken(request.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

    const { tribeId } = await verifyMobileToken(token);

    const body = (await request.json()) as { description?: string };
    if (typeof body.description !== "string") {
      return NextResponse.json({ error: "Missing description" }, { status: 400 });
    }

    await updateTribe(tribeId, { join_description: body.description });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 }
    );
  }
}
