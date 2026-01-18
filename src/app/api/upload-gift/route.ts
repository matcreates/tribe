import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { auth } from "@/lib/auth";
import { getTribeByUserId, getGiftCountByTribeId, createGift } from "@/lib/db";

const MAX_GIFTS = 5;
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_THUMBNAIL_SIZE = 2 * 1024 * 1024; // 2MB

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

    // Check gift limit
    const giftCount = await getGiftCountByTribeId(tribe.id);
    if (giftCount >= MAX_GIFTS) {
      return NextResponse.json(
        { error: `You can only upload ${MAX_GIFTS} gifts` },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const thumbnail = formData.get("thumbnail") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size must be less than 20MB" },
        { status: 400 }
      );
    }

    // Validate thumbnail if provided
    if (thumbnail) {
      if (!thumbnail.type.startsWith("image/")) {
        return NextResponse.json(
          { error: "Thumbnail must be an image" },
          { status: 400 }
        );
      }
      if (thumbnail.size > MAX_THUMBNAIL_SIZE) {
        return NextResponse.json(
          { error: "Thumbnail size must be less than 2MB" },
          { status: 400 }
        );
      }
    }

    // Upload gift file to Vercel Blob
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop() || 'bin';
    const fileBlob = await put(
      `gifts/${tribe.id}/${timestamp}-${file.name}`,
      file,
      {
        access: 'public',
        contentType: file.type || 'application/octet-stream',
      }
    );

    // Upload thumbnail if provided
    let thumbnailUrl: string | null = null;
    if (thumbnail) {
      const thumbExtension = thumbnail.name.split('.').pop() || 'jpg';
      const thumbBlob = await put(
        `gifts/${tribe.id}/thumb-${timestamp}.${thumbExtension}`,
        thumbnail,
        {
          access: 'public',
          contentType: thumbnail.type,
        }
      );
      thumbnailUrl = thumbBlob.url;
    }

    // Save gift to database
    const gift = await createGift(
      tribe.id,
      file.name,
      fileBlob.url,
      file.size,
      thumbnailUrl
    );

    return NextResponse.json({
      success: true,
      gift: {
        id: gift.id,
        file_name: gift.file_name,
        file_url: gift.file_url,
        file_size: gift.file_size,
        thumbnail_url: gift.thumbnail_url,
        created_at: gift.created_at,
      },
    });
  } catch (error) {
    console.error("Upload gift error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to upload gift",
      },
      { status: 500 }
    );
  }
}
