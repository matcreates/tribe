import { NextRequest, NextResponse } from "next/server";
import { unsubscribeByToken } from "@/lib/db";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/unsubscribed?error=missing-token", request.url));
  }

  try {
    const result = await unsubscribeByToken(token);

    if (!result.success) {
      return NextResponse.redirect(new URL("/unsubscribed?error=invalid-token", request.url));
    }

    return NextResponse.redirect(new URL("/unsubscribed?success=true", request.url));
  } catch (error) {
    console.error("Unsubscribe error:", error);
    return NextResponse.redirect(new URL("/unsubscribed?error=server-error", request.url));
  }
}

