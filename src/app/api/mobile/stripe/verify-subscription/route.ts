import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getBearerToken, verifyMobileToken } from "@/lib/mobileAuth";
import { getTribeById, updateTribeSubscription, getVerifiedSubscriberCount } from "@/lib/db";
import { TRIBE_SIZE_LIMITS, SubscriptionTier, SubscriptionPlan } from "@/lib/types";

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

// Big Creator price IDs
const BIG_MONTHLY_PRICE_ID = "price_1SvejtP8Y5norXJQIC91Bmlu";
const BIG_YEARLY_PRICE_ID = "price_1SveklP8Y5norXJQtfPhay6V";

// Helper to get tier from plan
function getTierFromPlan(plan: SubscriptionPlan, status: string): SubscriptionTier {
  if (status !== 'active' && status !== 'canceled') return 'free';
  if (!plan) return 'free';
  if (plan.startsWith('big_')) return 'big';
  if (plan.startsWith('small_')) return 'small';
  return 'free';
}

export async function POST(request: Request) {
  try {
    const token = getBearerToken(request.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

    const { tribeId } = await verifyMobileToken(token);
    const tribe = await getTribeById(tribeId);
    if (!tribe) return NextResponse.json({ error: "Tribe not found" }, { status: 404 });

    if (!tribe.stripe_customer_id) {
      const currentTribeSize = await getVerifiedSubscriberCount(tribe.id);
      const tribeSizeLimit = TRIBE_SIZE_LIMITS.free;
      const isTribeFull = tribeSizeLimit !== null && currentTribeSize >= tribeSizeLimit;
      return NextResponse.json({ 
        status: "free", 
        tier: "free",
        plan: null,
        tribeSizeLimit,
        currentTribeSize,
        isTribeFull,
        canSendEmails: false,
        synced: false, 
        message: "No Stripe customer found" 
      });
    }

    const stripe = getStripe();

    const subscriptions = await stripe.subscriptions.list({
      customer: tribe.stripe_customer_id,
      status: "all",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      if (tribe.subscription_status !== "free") {
        await updateTribeSubscription(tribe.id, {
          subscription_status: "free",
          stripe_subscription_id: undefined,
          subscription_plan: null,
          subscription_ends_at: null,
        });
      }
      const currentTribeSize = await getVerifiedSubscriberCount(tribe.id);
      const tribeSizeLimit = TRIBE_SIZE_LIMITS.free;
      const isTribeFull = tribeSizeLimit !== null && currentTribeSize >= tribeSizeLimit;
      return NextResponse.json({ 
        status: "free", 
        tier: "free",
        plan: null,
        tribeSizeLimit,
        currentTribeSize,
        isTribeFull,
        canSendEmails: false,
        synced: true, 
        message: "No active subscription" 
      });
    }

    const subscription = subscriptions.data[0] as any;
    const cancelAtPeriodEnd = subscription.cancel_at_period_end === true || subscription.cancel_at_period_end === "true";
    const cancelAt = subscription.cancel_at;

    let status: "active" | "canceled" | "past_due" | "free" = "free";
    const isCanceled =
      subscription.status === "canceled" ||
      subscription.status === "unpaid" ||
      cancelAtPeriodEnd ||
      (cancelAt && cancelAt > 0);

    if (isCanceled) status = "canceled";
    else if (subscription.status === "active" || subscription.status === "trialing") status = "active";
    else if (subscription.status === "past_due") status = "past_due";

    // Detect plan from price ID
    let plan: SubscriptionPlan = null;
    const priceId = subscription.items?.data?.[0]?.price?.id;
    if (priceId === process.env.STRIPE_MONTHLY_PRICE_ID) plan = "small_monthly";
    else if (priceId === process.env.STRIPE_YEARLY_PRICE_ID) plan = "small_yearly";
    else if (priceId === BIG_MONTHLY_PRICE_ID) plan = "big_monthly";
    else if (priceId === BIG_YEARLY_PRICE_ID) plan = "big_yearly";

    const periodEndTimestamp = cancelAtPeriodEnd && subscription.cancel_at ? subscription.cancel_at : subscription.current_period_end;
    let endsAt: Date | null = null;
    if (periodEndTimestamp && typeof periodEndTimestamp === "number") {
      const d = new Date(periodEndTimestamp * 1000);
      endsAt = isNaN(d.getTime()) ? null : d;
    }

    await updateTribeSubscription(tribe.id, {
      stripe_subscription_id: subscription.id,
      subscription_status: status,
      subscription_plan: plan,
      subscription_ends_at: endsAt,
    });

    // Calculate tier and limits
    const tier = getTierFromPlan(plan, status);
    const tribeSizeLimit = TRIBE_SIZE_LIMITS[tier];
    const currentTribeSize = await getVerifiedSubscriberCount(tribe.id);
    const isTribeFull = tribeSizeLimit !== null && currentTribeSize >= tribeSizeLimit;
    const canSendEmails = (status === 'active' || (status === 'canceled' && endsAt && endsAt > new Date())) && tier !== 'free' && !isTribeFull;

    return NextResponse.json({
      status,
      tier,
      plan,
      endsAt: endsAt ? endsAt.toISOString() : null,
      tribeSizeLimit,
      currentTribeSize,
      isTribeFull,
      canSendEmails,
      synced: true,
      message: "Subscription synced from Stripe",
    });
  } catch (e) {
    return NextResponse.json({ error: "Failed to verify subscription" }, { status: 500 });
  }
}
