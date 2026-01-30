import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getBearerToken, verifyMobileToken } from "@/lib/mobileAuth";
import { getTribeById, updateTribeSubscription } from "@/lib/db";

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

export async function POST(request: Request) {
  try {
    const token = getBearerToken(request.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

    const { tribeId } = await verifyMobileToken(token);
    const tribe = await getTribeById(tribeId);
    if (!tribe) return NextResponse.json({ error: "Tribe not found" }, { status: 404 });

    if (!tribe.stripe_customer_id) {
      return NextResponse.json({ status: "free", synced: false, message: "No Stripe customer found" });
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
      return NextResponse.json({ status: "free", synced: true, message: "No active subscription" });
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

    let plan: "monthly" | "yearly" | null = null;
    const priceId = subscription.items?.data?.[0]?.price?.id;
    if (priceId === process.env.STRIPE_MONTHLY_PRICE_ID) plan = "monthly";
    else if (priceId === process.env.STRIPE_YEARLY_PRICE_ID) plan = "yearly";

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

    return NextResponse.json({
      status,
      plan,
      endsAt: endsAt ? endsAt.toISOString() : null,
      synced: true,
      message: "Subscription synced from Stripe",
    });
  } catch (e) {
    return NextResponse.json({ error: "Failed to verify subscription" }, { status: 500 });
  }
}
