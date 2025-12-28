import { NextRequest, NextResponse } from "next/server";
import { verifySubscriber } from "@/lib/db";

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

    return NextResponse.redirect(new URL("/verified?status=success", request.url));
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.redirect(new URL("/verified?status=error&message=server-error", request.url));
  }
}

