import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { auth } from "@/lib/auth";
import { getTribeByUserId, getGiftCountByTribeId, createGift } from "@/lib/db";

const MAX_GIFTS = 5;
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

// This endpoint handles client-side uploads via Vercel Blob
// It generates a signed URL for direct upload, bypassing serverless limits
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as HandleUploadBody;

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

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // Validate the upload before generating token
        return {
          allowedContentTypes: [
            'image/*',
            'application/pdf',
            'application/zip',
            'application/x-zip-compressed',
            'application/octet-stream',
            'video/*',
            'audio/*',
            'text/*',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          ],
          maximumSizeInBytes: MAX_FILE_SIZE,
          tokenPayload: JSON.stringify({
            tribeId: tribe.id,
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // This is called after the file is uploaded to Vercel Blob
        // We don't save to database here - that happens in the finalize endpoint
        console.log('Upload completed:', blob.pathname);
      },
    });

    return NextResponse.json(jsonResponse);
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
