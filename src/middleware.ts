import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Simple in-memory rate limiter
// Note: On serverless, each instance has its own map - not globally consistent
// but still protects against aggressive abuse from single IPs per edge node
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function isRateLimited(ip: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  
  // Clean up old entries periodically (every 100th check)
  if (Math.random() < 0.01) {
    for (const [key, value] of rateLimitMap.entries()) {
      if (now > value.resetTime) rateLimitMap.delete(key);
    }
  }
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return false;
  }
  
  record.count++;
  if (record.count > limit) {
    return true;
  }
  
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // CRITICAL: Allow webhook endpoints without ANY processing
  // This must be checked FIRST before any auth logic
  if (
    pathname.includes("/api/inbound") || 
    pathname.includes("/webhook") ||  // Matches /api/stripe/webhook, /api/webhook-inbound, etc.
    pathname.includes("/api/test") ||
    pathname.includes("/api/cleanup")
  ) {
    return NextResponse.next();
  }
  
  // Rate limit sensitive endpoints
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
             request.headers.get("x-real-ip") || 
             "unknown";
  
  // Rate limit auth endpoints: 10 requests per minute
  if (pathname === "/api/auth/signup" || pathname.includes("/api/auth/callback")) {
    if (isRateLimited(`auth:${ip}`, 10, 60000)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }
  }
  
  // Rate limit join endpoint: 20 requests per minute
  if (pathname === "/api/join") {
    if (isRateLimited(`join:${ip}`, 20, 60000)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }
  }
  
  // Allow all other API routes
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }
  
  // Allow public pages
  const isPublicJoinPage = pathname.startsWith("/j/") || pathname.startsWith("/g/") || pathname.startsWith("/@");
  const isPublicPage = pathname === "/" || pathname === "/verified" || pathname === "/unsubscribed" || pathname === "/gift-download";
  
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
    // Exclude static files, images, favicon, AND webhook endpoints
    // Note: Using broader patterns to catch all webhook paths
    "/((?!_next/static|_next/image|favicon.ico|api/inbound|api/stripe/webhook|api/webhook-inbound|api/test|api/cleanup|.*\\..*).*)",
  ],
};


