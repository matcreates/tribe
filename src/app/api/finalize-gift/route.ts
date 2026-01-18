import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTribeByUserId, getGiftCountByTribeId, createGift } from "@/lib/db";

const MAX_GIFTS = 5;

// This endpoint is called after client-side upload to save the gift to database
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const tribe = await getTribeByUserId(session.user.id);
    if (!tribe) {
      return NextResponse.json(
        { error: "Tribe not found" },
        { status: 404 }
      );
    }

    // Check gift limit again
    const giftCount = await getGiftCountByTribeId(tribe.id);
    if (giftCount >= MAX_GIFTS) {
      return NextResponse.json(
        { error: `You can only upload ${MAX_GIFTS} gifts` },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { fileName, fileUrl, fileSize, thumbnailUrl } = body;

    if (!fileName || !fileUrl || typeof fileSize !== 'number') {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Save gift to database
    const gift = await createGift(
      tribe.id,
      fileName,
      fileUrl,
      fileSize,
      thumbnailUrl || null
    );

    return NextResponse.json({
      success: true,
      gift: {
        id: gift.id,
        file_name: gift.file_name,
        file_url: gift.file_url,
        file_size: gift.file_size,
        thumbnail_url: gift.thumbnail_url,
        short_code: gift.short_code,
        created_at: gift.created_at,
      },
    });
  } catch (error) {
    console.error("Finalize gift error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to save gift",
      },
      { status: 500 }
    );
  }
}
