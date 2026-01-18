import { NextRequest, NextResponse } from "next/server";
import { verifySubscriber, getGiftById } from "@/lib/db";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/verified?status=error&message=missing-token", request.url));
  }

  try {
    const subscriber = await verifySubscriber(token);

    if (!subscriber) {
      return NextResponse.redirect(new URL("/verified?status=error&message=invalid-token", request.url));
    }

    // Check if this subscriber joined via a gift page
    if (subscriber.gift_id) {
      const gift = await getGiftById(subscriber.gift_id);
      if (gift) {
        // Redirect to gift download page with file URL
        const downloadUrl = `/gift-download?file=${encodeURIComponent(gift.file_url)}&name=${encodeURIComponent(gift.file_name)}`;
        return NextResponse.redirect(new URL(downloadUrl, request.url));
      }
    }

    return NextResponse.redirect(new URL("/verified?status=success", request.url));
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.redirect(new URL("/verified?status=error&message=server-error", request.url));
  }
}

