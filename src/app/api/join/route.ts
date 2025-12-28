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

    // Send verification email (non-blocking)
    if (subscriber.verification_token && baseUrl) {
      sendVerificationEmail(
        email,
        tribe.name,
        tribe.owner_name || "Anonymous",
        subscriber.verification_token,
        baseUrl
      ).then((result) => {
        console.log("Verification email sent:", result);
      }).catch((err) => {
        console.error("Failed to send verification email:", err);
      });
    } else {
      console.log("Skipping email send - missing token or baseUrl", { 
        hasToken: !!subscriber.verification_token, 
        baseUrl 
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

