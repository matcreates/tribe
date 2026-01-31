import { NextRequest, NextResponse } from "next/server";
import { getTribeBySlug, addSubscriber, getGiftByShortCode, getGiftById, getSubscriberByEmail, getVerifiedSubscriberCount } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";
import { TRIBE_SIZE_LIMITS, SubscriptionTier } from "@/lib/types";

// Helper to determine tier from plan
function getTierFromPlan(plan: string | null, status: string): SubscriptionTier {
  if (status !== 'active' && status !== 'canceled') return 'free';
  if (!plan) return 'free';
  if (plan.startsWith('big_')) return 'big';
  if (plan.startsWith('small_') || plan === 'monthly' || plan === 'yearly') return 'small';
  return 'free';
}

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

    // Check if tribe is full based on subscription tier
    const tier = getTierFromPlan(tribe.subscription_plan, tribe.subscription_status || 'free');
    const sizeLimit = TRIBE_SIZE_LIMITS[tier];
    
    if (sizeLimit !== null) {
      const currentSize = await getVerifiedSubscriberCount(tribe.id);
      if (currentSize >= sizeLimit) {
        return NextResponse.json(
          { error: "Tribe is full", tribeFull: true },
          { status: 403 }
        );
      }
    }

    // Resolve gift ID from code or direct ID
    let giftId: string | undefined;
    let gift = null;
    if (giftCode) {
      gift = await getGiftByShortCode(giftCode);
      if (gift && gift.tribe_id === tribe.id) {
        giftId = gift.id;
      }
    } else if (directGiftId) {
      gift = await getGiftById(directGiftId);
      if (gift && gift.tribe_id === tribe.id) {
        giftId = gift.id;
      }
    }

    // Check if user is already a verified member
    const existingSubscriber = await getSubscriberByEmail(tribe.id, email);
    if (existingSubscriber && existingSubscriber.verified && !existingSubscriber.unsubscribed) {
      // Already verified member - if there's a gift, let them download it directly
      if (giftId && gift) {
        return NextResponse.json({ 
          success: true, 
          alreadyVerified: true,
          giftUrl: gift.file_url,
          message: "You're already a member! Here's your download."
        });
      }
      // No gift, just tell them they're already subscribed
      return NextResponse.json(
        { error: "You're already a member of this tribe!" },
        { status: 409 }
      );
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

    const resolvedBaseUrl =
      baseUrl || process.env.NEXT_PUBLIC_BASE_URL || new URL(request.url).origin;

    if (subscriber.verification_token) {
      try {
        console.log("Attempting to send verification email...", {
          email,
          hasToken: !!subscriber.verification_token,
          baseUrl: resolvedBaseUrl,
          giftId,
        });
        const emailResult = await sendVerificationEmail(
          email,
          tribe.name,
          tribe.owner_name || "Anonymous",
          subscriber.verification_token,
          resolvedBaseUrl,
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
      emailError = "Missing verification token";
      console.log("Skipping email send - missing token", { email });
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

