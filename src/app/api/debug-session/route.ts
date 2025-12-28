import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { cookies } from "next/headers";

export async function GET() {
  const session = await auth();
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  
  // Filter to show only auth-related cookies (names only, not values for security)
  const cookieNames = allCookies.map(c => c.name);
  
  return NextResponse.json({
    hasSession: !!session,
    session: session ? {
      userEmail: session.user?.email,
      userId: session.user?.id,
    } : null,
    cookies: cookieNames,
  });
}

