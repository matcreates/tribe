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
  console.log("Stripe webhook received");
  
  let body: string;
  try {
    body = await req.text();
    console.log("Webhook body length:", body.length);
  } catch (err) {
    console.error("Failed to read request body:", err);
    return NextResponse.json({ error: "Failed to read body" }, { status: 400 });
  }

  const signature = req.headers.get("stripe-signature");
  console.log("Stripe signature present:", !!signature);

  if (!signature) {
    console.error("No stripe-signature header");
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    console.log("Webhook event type:", event.type);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("Webhook signature verification failed:", errorMessage);
    return NextResponse.json({ error: `Signature verification failed: ${errorMessage}` }, { status: 400 });
  }

  // Handle the event - wrap each in try/catch to ensure we return 200
  // Stripe will retry failed webhooks, but we want to ack receipt
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        console.log("Processing checkout.session.completed");
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        console.log("checkout.session.completed handled successfully");
        break;
      }
      
      case "customer.subscription.updated": {
        console.log("Processing customer.subscription.updated");
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        console.log("customer.subscription.updated handled successfully");
        break;
      }
      
      case "customer.subscription.deleted": {
        console.log("Processing customer.subscription.deleted");
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        console.log("customer.subscription.deleted handled successfully");
        break;
      }
      
      case "invoice.payment_failed": {
        console.log("Processing invoice.payment_failed");
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        console.log("invoice.payment_failed handled successfully");
        break;
      }
      
      default:
        console.log("Unhandled event type:", event.type);
    }
  } catch (handlerError) {
    // Log the error but still return 200 to acknowledge receipt
    console.error("Error in event handler:", handlerError);
    // Return 200 anyway - we received the event, handler issues shouldn't cause retries
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const stripe = getStripe();
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;
  const plan = session.metadata?.plan as 'monthly' | 'yearly';

  console.log("Checkout completed - customerId:", customerId, "subscriptionId:", subscriptionId, "plan:", plan);

  if (!customerId) {
    console.error("No customer ID in checkout session");
    return;
  }

  const tribe = await getTribeByStripeCustomerId(customerId);
  console.log("Found tribe:", tribe?.id || "NOT FOUND");
  
  if (!tribe) {
    console.error("Tribe not found for customer:", customerId);
    // This can happen if the customer was created but webhook fires before DB update
    return;
  }

  if (!subscriptionId) {
    console.error("No subscription ID in checkout session");
    return;
  }

  // Get subscription details
  const subscriptionData = await stripe.subscriptions.retrieve(subscriptionId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentPeriodEnd = (subscriptionData as any).current_period_end;
  console.log("Subscription period end:", currentPeriodEnd);
  
  const endsAt = new Date(currentPeriodEnd * 1000);

  await updateTribeSubscription(tribe.id, {
    stripe_subscription_id: subscriptionId,
    subscription_status: 'active',
    subscription_plan: plan || 'monthly', // Default to monthly if not set
    subscription_ends_at: endsAt,
  });

  console.log(`Subscription activated for tribe ${tribe.id}, ends at ${endsAt.toISOString()}`);
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
