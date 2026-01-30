import { NextRequest, NextResponse } from "next/server";
import { getBearerToken, verifyMobileToken } from "@/lib/mobileAuth";
import { getTribeById, getTribeBySlug, updateTribe } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const token = getBearerToken(request.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

    const { tribeId, email } = await verifyMobileToken(token);
    const tribe = await getTribeById(tribeId);
    if (!tribe) return NextResponse.json({ error: "Tribe not found" }, { status: 404 });

    return NextResponse.json({
      ok: true,
      settings: {
        userEmail: email,
        ownerName: tribe.owner_name || "Anonymous",
        slug: tribe.slug,
        ownerAvatar: tribe.owner_avatar,
        emailSignature: tribe.email_signature || "",
        joinDescription: tribe.join_description || "",
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

    const body = (await request.json()) as {
      ownerName?: string;
      slug?: string;
      ownerAvatar?: string | null;
      emailSignature?: string;
      joinDescription?: string;
    };

    if (body.slug) {
      const cleaned = body.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
      const existing = await getTribeBySlug(cleaned);
      if (existing && existing.id !== tribeId) {
        return NextResponse.json({ error: "Slug already taken" }, { status: 400 });
      }
      body.slug = cleaned;
    }

    await updateTribe(tribeId, {
      owner_name: body.ownerName,
      slug: body.slug,
      owner_avatar: body.ownerAvatar === null ? null : body.ownerAvatar,
      email_signature: body.emailSignature,
      join_description: body.joinDescription,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 }
    );
  }
}
