import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTribeByUserId, updateTribeSubscription } from "@/lib/db";
import Stripe from "stripe";
import type { SubscriptionPlan } from "@/lib/types";

// Big Creator price IDs
const BIG_MONTHLY_PRICE_ID = "price_1SvejtP8Y5norXJQIC91Bmlu";
const BIG_YEARLY_PRICE_ID = "price_1SveklP8Y5norXJQtfPhay6V";

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

// This endpoint verifies and syncs subscription status from Stripe
// Used as a fallback when webhooks don't work
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tribe = await getTribeByUserId(session.user.id);
    if (!tribe) {
      return NextResponse.json({ error: "Tribe not found" }, { status: 404 });
    }

    // If no Stripe customer ID, nothing to verify
    if (!tribe.stripe_customer_id) {
      return NextResponse.json({ 
        status: 'free',
        synced: false,
        message: "No Stripe customer found" 
      });
    }

    const stripe = getStripe();

    // Get all subscriptions for this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: tribe.stripe_customer_id,
      status: 'all',
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      // No subscriptions found
      if (tribe.subscription_status !== 'free') {
        await updateTribeSubscription(tribe.id, {
          subscription_status: 'free',
          stripe_subscription_id: undefined,
          subscription_plan: null,
          subscription_ends_at: null,
        });
      }
      return NextResponse.json({ 
        status: 'free',
        synced: true,
        message: "No active subscription" 
      });
    }

    const subscription = subscriptions.data[0];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subAny = subscription as any;
    
    // Check cancel_at_period_end - be very explicit about the check
    const cancelAtPeriodEnd = subAny.cancel_at_period_end === true || subAny.cancel_at_period_end === 'true';
    const cancelAt = subAny.cancel_at; // Unix timestamp when subscription will be canceled
    
    console.log("=== SUBSCRIPTION SYNC DEBUG ===");
    console.log("Raw subscription object keys:", Object.keys(subAny));
    console.log("subscription.status:", subscription.status);
    console.log("subAny.cancel_at_period_end (raw):", subAny.cancel_at_period_end, "type:", typeof subAny.cancel_at_period_end);
    console.log("cancelAtPeriodEnd (computed):", cancelAtPeriodEnd);
    console.log("cancel_at:", cancelAt);
    console.log("current_period_end:", subAny.current_period_end);
    console.log("canceled_at:", subAny.canceled_at);
    
    // Determine status
    // If cancel_at_period_end is true OR cancel_at is set, treat as canceled (but still active until period end)
    let status: 'active' | 'canceled' | 'past_due' | 'free' = 'free';
    const isCanceled = subscription.status === 'canceled' || 
                       subscription.status === 'unpaid' || 
                       cancelAtPeriodEnd || 
                       (cancelAt && cancelAt > 0);
    
    console.log("isCanceled:", isCanceled);
    
    if (isCanceled) {
      status = 'canceled';
    } else if (subscription.status === 'active' || subscription.status === 'trialing') {
      status = 'active';
    } else if (subscription.status === 'past_due') {
      status = 'past_due';
    }
    
    console.log("Final status:", status);

    // Determine plan from price
    let plan: SubscriptionPlan = null;
    const priceId = subscription.items.data[0]?.price?.id;
    if (priceId === process.env.STRIPE_MONTHLY_PRICE_ID) {
      plan = 'small_monthly';
    } else if (priceId === process.env.STRIPE_YEARLY_PRICE_ID) {
      plan = 'small_yearly';
    } else if (priceId === BIG_MONTHLY_PRICE_ID) {
      plan = 'big_monthly';
    } else if (priceId === BIG_YEARLY_PRICE_ID) {
      plan = 'big_yearly';
    }

    // Get period end - safely handle the timestamp
    // For canceled subscriptions, use cancel_at if available, otherwise current_period_end
    const periodEndTimestamp = cancelAtPeriodEnd && subAny.cancel_at 
      ? subAny.cancel_at 
      : subAny.current_period_end;
    
    let endsAt: Date | null = null;
    
    if (periodEndTimestamp && typeof periodEndTimestamp === 'number') {
      endsAt = new Date(periodEndTimestamp * 1000);
      // Validate the date is valid
      if (isNaN(endsAt.getTime())) {
        endsAt = null;
      }
    }
    
    console.log("Computed endsAt:", endsAt?.toISOString());

    // Update database
    await updateTribeSubscription(tribe.id, {
      stripe_subscription_id: subscription.id,
      subscription_status: status,
      subscription_plan: plan,
      subscription_ends_at: endsAt,
    });

    return NextResponse.json({ 
      status,
      plan,
      endsAt: endsAt ? endsAt.toISOString() : null,
      synced: true,
      message: "Subscription synced from Stripe" 
    });

  } catch (error) {
    console.error("Verify subscription error:", error);
    return NextResponse.json(
      { error: "Failed to verify subscription" },
      { status: 500 }
    );
  }
}
