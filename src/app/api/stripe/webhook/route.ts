import { NextRequest, NextResponse } from "next/server";
import { getTribeByStripeCustomerId, updateTribeSubscription } from "@/lib/db";
import Stripe from "stripe";

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

export async function POST(req: NextRequest) {
  try {
    const stripe = getStripe();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.error("STRIPE_WEBHOOK_SECRET is not configured");
      return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
    }

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json({ error: "No signature" }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }
      
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }
      
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }
      
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const stripe = getStripe();
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;
  const plan = session.metadata?.plan as 'monthly' | 'yearly';

  const tribe = await getTribeByStripeCustomerId(customerId);
  if (!tribe) {
    console.error("Tribe not found for customer:", customerId);
    return;
  }

  // Get subscription details
  const subscriptionData = await stripe.subscriptions.retrieve(subscriptionId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const endsAt = new Date((subscriptionData as any).current_period_end * 1000);

  await updateTribeSubscription(tribe.id, {
    stripe_subscription_id: subscriptionId,
    subscription_status: 'active',
    subscription_plan: plan,
    subscription_ends_at: endsAt,
  });

  console.log(`Subscription activated for tribe ${tribe.id}`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  
  const tribe = await getTribeByStripeCustomerId(customerId);
  if (!tribe) {
    console.error("Tribe not found for customer:", customerId);
    return;
  }

  let status: 'active' | 'canceled' | 'past_due' = 'active';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subStatus = (subscription as any).status;
  if (subStatus === 'canceled' || subStatus === 'unpaid') {
    status = 'canceled';
  } else if (subStatus === 'past_due') {
    status = 'past_due';
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const endsAt = new Date((subscription as any).current_period_end * 1000);

  await updateTribeSubscription(tribe.id, {
    subscription_status: status,
    subscription_ends_at: endsAt,
  });

  console.log(`Subscription updated for tribe ${tribe.id}: ${status}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  
  const tribe = await getTribeByStripeCustomerId(customerId);
  if (!tribe) {
    console.error("Tribe not found for customer:", customerId);
    return;
  }

  await updateTribeSubscription(tribe.id, {
    subscription_status: 'canceled',
    stripe_subscription_id: undefined,
  });

  console.log(`Subscription canceled for tribe ${tribe.id}`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  
  const tribe = await getTribeByStripeCustomerId(customerId);
  if (!tribe) {
    console.error("Tribe not found for customer:", customerId);
    return;
  }

  await updateTribeSubscription(tribe.id, {
    subscription_status: 'past_due',
  });

  console.log(`Payment failed for tribe ${tribe.id}`);
}
