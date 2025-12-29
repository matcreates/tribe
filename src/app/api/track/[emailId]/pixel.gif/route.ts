import { NextResponse } from "next/server";
import { incrementEmailOpenCount } from "@/lib/db";

// 1x1 transparent GIF
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ emailId: string }> }
) {
  const { emailId } = await params;

  // Increment open count in background (don't block response)
  incrementEmailOpenCount(emailId).catch((err) => {
    console.error("Failed to increment open count:", err);
  });

  // Return tracking pixel with cache headers to prevent double-counting on refresh
  return new NextResponse(PIXEL, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  });
}

