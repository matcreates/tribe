import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const token = await getToken({ 
    req: request, 
    secret: process.env.AUTH_SECRET 
  });
  
  const isLoggedIn = !!token;
  const { pathname } = request.nextUrl;
  
  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/signup");
  const isPublicJoinPage = pathname.startsWith("/j/");
  const isApiRoute = pathname.startsWith("/api");
  const isInitDb = pathname === "/api/init-db";

  // Allow API routes and public join pages
  if (isApiRoute || isPublicJoinPage || isInitDb) {
    return NextResponse.next();
  }

  // Redirect logged-in users away from auth pages
  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Redirect non-logged-in users to login
  if (!isLoggedIn && !isAuthPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};

