import { NextRequest, NextResponse } from "next/server";
import { getBearerToken, verifyMobileToken } from "@/lib/mobileAuth";
import {
  getGiftsByTribeId,
  getGiftCountByTribeId,
  createGift,
  getGiftMemberCounts,
  deleteGift as dbDeleteGift,
} from "@/lib/db";

const MAX_GIFTS = 5;

export async function GET(request: NextRequest) {
  try {
    const token = getBearerToken(request.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

    const { tribeId } = await verifyMobileToken(token);

    const [gifts, count, memberCounts] = await Promise.all([
      getGiftsByTribeId(tribeId),
      getGiftCountByTribeId(tribeId),
      getGiftMemberCounts(tribeId),
    ]);

    return NextResponse.json({
      ok: true,
      count,
      maxGifts: MAX_GIFTS,
      gifts: gifts.map((g) => ({
        id: g.id,
        file_name: g.file_name,
        file_url: g.file_url,
        file_size: g.file_size,
        thumbnail_url: g.thumbnail_url,
        short_code: g.short_code,
        created_at: g.created_at,
        member_count: memberCounts[g.id] || 0,
      })),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getBearerToken(request.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

    const { tribeId } = await verifyMobileToken(token);

    const count = await getGiftCountByTribeId(tribeId);
    if (count >= MAX_GIFTS) {
      return NextResponse.json({ error: `You can only upload ${MAX_GIFTS} gifts` }, { status: 400 });
    }

    const body = (await request.json()) as {
      fileName?: string;
      fileUrl?: string;
      fileSize?: number;
      thumbnailUrl?: string | null;
    };

    if (!body.fileName || !body.fileUrl || typeof body.fileSize !== "number") {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const gift = await createGift(
      tribeId,
      body.fileName,
      body.fileUrl,
      body.fileSize,
      body.thumbnailUrl ?? null
    );

    return NextResponse.json({ ok: true, gift });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// Convenience delete via query param (?id=)
export async function DELETE(request: NextRequest) {
  try {
    const token = getBearerToken(request.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

    const { tribeId } = await verifyMobileToken(token);
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

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
