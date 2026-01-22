import { NextRequest, NextResponse } from "next/server";
import { setPasswordResetToken } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";

// Rate limiting: track requests per IP
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 5; // 5 requests per window

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }
  
  record.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Get IP for rate limiting
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || 
               request.headers.get("x-real-ip") || 
               "unknown";
    
    // Check rate limit
    if (!checkRateLimit(ip)) {
      console.log(`Rate limit exceeded for IP: ${ip}`);
      // Return success anyway to prevent user enumeration
      return NextResponse.json({ 
        success: true,
        message: "If an account exists with this email, you will receive a password reset link."
      });
    }
    
    const body = await request.json();
    const { email, baseUrl } = body;
    
    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }
    
    // Always return success to prevent user enumeration
    // (don't reveal if email exists or not)
    const successResponse = { 
      success: true,
      message: "If an account exists with this email, you will receive a password reset link."
    };
    
    // Try to create reset token (returns null if user doesn't exist)
    const result = await setPasswordResetToken(email);
    
    if (!result) {
      // User doesn't exist, but we return success anyway
      console.log(`Password reset requested for non-existent email: ${email}`);
      // Add a small delay to prevent timing attacks
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
      return NextResponse.json(successResponse);
    }
    
    // User exists, send the email
    const resolvedBaseUrl = baseUrl || process.env.NEXT_PUBLIC_BASE_URL || "https://www.madewithtribe.com";
    
    const emailResult = await sendPasswordResetEmail(
      email,
      result.token,
      resolvedBaseUrl
    );
    
    if (!emailResult.success) {
      console.error(`Failed to send password reset email to ${email}:`, emailResult.error);
      // Still return success to prevent user enumeration
      return NextResponse.json(successResponse);
    }
    
    console.log(`Password reset email sent to ${email}`);
    return NextResponse.json(successResponse);
    
  } catch (error) {
    console.error("Forgot password error:", error);
    // Return generic success to prevent information leakage
    return NextResponse.json({ 
      success: true,
      message: "If an account exists with this email, you will receive a password reset link."
    });
  }
}
