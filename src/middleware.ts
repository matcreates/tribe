import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // CRITICAL: Allow webhook endpoints without ANY processing
  // This must be checked FIRST before any auth logic
  if (pathname === "/api/inbound" || pathname.startsWith("/api/inbound")) {
    console.log("Middleware: Allowing inbound webhook through");
    return NextResponse.next();
  }
  
  // Allow all API routes
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }
  
  // Allow public pages
  const isPublicJoinPage = pathname.startsWith("/j/") || pathname.startsWith("/@");
  const isPublicPage = pathname === "/" || pathname === "/verified" || pathname === "/unsubscribed";
  
  if (isPublicJoinPage || isPublicPage) {
    return NextResponse.next();
  }
  
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
  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/signup");

  // Redirect logged-in users away from auth pages to dashboard
  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Redirect non-logged-in users to login (except for public pages)
  if (!isLoggedIn && !isAuthPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Exclude static files, images, and favicon
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
