import { NextRequest, NextResponse } from "next/server";
import { getTribeBySlug, addSubscriber } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug, email, baseUrl } = body;

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

    const subscriber = await addSubscriber(tribe.id, email);
    if (!subscriber) {
      return NextResponse.json(
        { error: "Already subscribed" },
        { status: 409 }
      );
    }

    // Send verification email
    if (subscriber.verification_token && baseUrl) {
      try {
        console.log("Attempting to send verification email...", { email, hasToken: !!subscriber.verification_token, baseUrl });
        const emailResult = await sendVerificationEmail(
          email,
          tribe.name,
          tribe.owner_name || "Anonymous",
          subscriber.verification_token,
          baseUrl
        );
        console.log("Verification email sent successfully:", emailResult);
      } catch (emailError) {
        console.error("Failed to send verification email:", emailError);
        // Still return success - subscriber is added, just email failed
        // But log it so we can see what went wrong
      }
    } else {
      console.log("Skipping email send - missing token or baseUrl", { 
        hasToken: !!subscriber.verification_token, 
        baseUrl,
        email 
      });
    }

    return NextResponse.json({ 
      success: true, 
      needsVerification: true 
    });
  } catch (error) {
    console.error("Join API error:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Internal server error" 
      },
      { status: 500 }
    );
  }
}

