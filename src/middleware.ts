import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  // Auth.js v5 uses different cookie names - try both secure and non-secure
  const token = await getToken({ 
    req: request, 
    secret: process.env.AUTH_SECRET,
    cookieName: "__Secure-authjs.session-token",
  }) || await getToken({ 
    req: request, 
    secret: process.env.AUTH_SECRET,
    cookieName: "authjs.session-token",
  });
  
  const isLoggedIn = !!token;
  const { pathname } = request.nextUrl;
  
  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/signup");
  const isPublicJoinPage = pathname.startsWith("/j/") || pathname.startsWith("/@");
  const isApiRoute = pathname.startsWith("/api");
  const isPublicPage = pathname === "/verified" || pathname === "/unsubscribed";

  // Allow API routes, public join pages, and other public pages
  if (isApiRoute || isPublicJoinPage || isPublicPage) {
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

