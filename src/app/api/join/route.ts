import { NextRequest, NextResponse } from "next/server";
import { getTribeBySlug, addSubscriber, getGiftByShortCode, getGiftById } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug, email, baseUrl, giftCode, giftId: directGiftId } = body;

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

    // Resolve gift ID from code or direct ID
    let giftId: string | undefined;
    if (giftCode) {
      const gift = await getGiftByShortCode(giftCode);
      if (gift && gift.tribe_id === tribe.id) {
        giftId = gift.id;
      }
    } else if (directGiftId) {
      const gift = await getGiftById(directGiftId);
      if (gift && gift.tribe_id === tribe.id) {
        giftId = gift.id;
      }
    }

    const subscriber = await addSubscriber(tribe.id, email, undefined, giftId);
    if (!subscriber) {
      return NextResponse.json(
        { error: "Already subscribed" },
        { status: 409 }
      );
    }

    // Send verification email
    let emailError: string | null = null;
    if (subscriber.verification_token && baseUrl) {
      try {
        console.log("Attempting to send verification email...", { email, hasToken: !!subscriber.verification_token, baseUrl, giftId });
        const emailResult = await sendVerificationEmail(
          email,
          tribe.name,
          tribe.owner_name || "Anonymous",
          subscriber.verification_token,
          baseUrl,
          giftId
        );
        console.log("Verification email sent successfully:", emailResult);
      } catch (err) {
        emailError = err instanceof Error ? err.message : String(err);
        console.error("Failed to send verification email:", err);
        // Log full error details
        console.error("Email error details:", JSON.stringify(err, null, 2));
      }
    } else {
      const missing = [];
      if (!subscriber.verification_token) missing.push("token");
      if (!baseUrl) missing.push("baseUrl");
      emailError = `Missing: ${missing.join(", ")}`;
      console.log("Skipping email send - missing:", { 
        hasToken: !!subscriber.verification_token, 
        baseUrl,
        email 
      });
    }

    // If email failed, return error so user knows
    if (emailError) {
      return NextResponse.json({ 
        success: false,
        error: `Failed to send verification email: ${emailError}`,
        needsVerification: true // Subscriber was added
      }, { status: 500 });
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

