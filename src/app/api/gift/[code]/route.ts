import { NextRequest, NextResponse } from "next/server";
import { getGiftByShortCode, getTribeById } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  const gift = await getGiftByShortCode(code);
  if (!gift) {
    return NextResponse.json({ error: "Gift not found" }, { status: 404 });
  }

  const tribe = await getTribeById(gift.tribe_id);
  if (!tribe) {
    return NextResponse.json({ error: "Tribe not found" }, { status: 404 });
  }

  return NextResponse.json({
    gift: {
      id: gift.id,
      fileName: gift.file_name,
      thumbnailUrl: gift.thumbnail_url,
      shortCode: gift.short_code,
    },
    tribe: {
      id: tribe.id,
      name: tribe.name,
      slug: tribe.slug,
      ownerName: tribe.owner_name || "Anonymous",
      ownerAvatar: tribe.owner_avatar,
      description: tribe.join_description,
    },
  });
}
