import { NextRequest, NextResponse } from "next/server";
import { getTribeBySlug, getSubscribersByTribeId } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug, email } = body;

    if (!slug || !email) {
      return NextResponse.json(
        { error: "Missing slug or email" },
        { status: 400 }
      );
    }

    const tribe = await getTribeBySlug(slug);
    if (!tribe) {
      return NextResponse.json(
        { error: "Tribe not found" },
        { status: 404 }
      );
    }

    // Find the subscriber
    const subscribers = await getSubscribersByTribeId(tribe.id);
    const subscriber = subscribers.find(s => s.email.toLowerCase() === email.toLowerCase());

    if (!subscriber) {
      return NextResponse.json(
        { error: "Subscriber not found" },
        { status: 404 }
      );
    }

    if (!subscriber.verification_token) {
      return NextResponse.json(
        { error: "Subscriber already verified or no token" },
        { status: 400 }
      );
    }

    // Get base URL from headers
    const host = request.headers.get("host") || "tribe-omega.vercel.app";
    const protocol = host.includes("localhost") ? "http" : "https";
    const baseUrl = `${protocol}://${host}`;

    console.log("Sending test verification email...", { email, baseUrl, hasToken: !!subscriber.verification_token });

    try {
      const result = await sendVerificationEmail(
        email,
        tribe.name,
        tribe.owner_name || "Anonymous",
        subscriber.verification_token,
        baseUrl
      );
      
      return NextResponse.json({ 
        success: true,
        message: "Verification email sent",
        emailId: result.emailId,
        baseUrl,
        verificationUrl: `${baseUrl}/api/verify?token=${subscriber.verification_token}`
      });
    } catch (emailError) {
      console.error("Email send error:", emailError);
      return NextResponse.json(
        { 
          error: "Failed to send email",
          details: emailError instanceof Error ? emailError.message : String(emailError)
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Test verification email error:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Internal server error",
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}


