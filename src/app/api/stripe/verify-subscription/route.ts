import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTribeByUserId, updateTribeSubscription } from "@/lib/db";
import Stripe from "stripe";

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
    
    // Determine status
    let status: 'active' | 'canceled' | 'past_due' | 'free' = 'free';
    if (subscription.status === 'active' || subscription.status === 'trialing') {
      status = 'active';
    } else if (subscription.status === 'past_due') {
      status = 'past_due';
    } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
      status = 'canceled';
    }

    // Determine plan from price
    let plan: 'monthly' | 'yearly' | null = null;
    const priceId = subscription.items.data[0]?.price?.id;
    if (priceId === process.env.STRIPE_MONTHLY_PRICE_ID) {
      plan = 'monthly';
    } else if (priceId === process.env.STRIPE_YEARLY_PRICE_ID) {
      plan = 'yearly';
    }

    // Get period end - safely handle the timestamp
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const periodEndTimestamp = (subscription as any).current_period_end;
    let endsAt: Date | null = null;
    
    if (periodEndTimestamp && typeof periodEndTimestamp === 'number') {
      endsAt = new Date(periodEndTimestamp * 1000);
      // Validate the date is valid
      if (isNaN(endsAt.getTime())) {
        endsAt = null;
      }
    }

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
