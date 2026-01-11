import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTribeByUserId, updateTribeSubscription } from "@/lib/db";
import Stripe from "stripe";

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stripe = getStripe();

    const { plan } = await req.json();
    
    if (!plan || !["monthly", "yearly"].includes(plan)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const tribe = await getTribeByUserId(session.user.id);
    if (!tribe) {
      return NextResponse.json({ error: "Tribe not found" }, { status: 404 });
    }

    // Get or create Stripe customer
    let customerId = tribe.stripe_customer_id;
    
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: session.user.email || undefined,
        metadata: {
          tribeId: tribe.id,
          userId: session.user.id,
        },
      });
      customerId = customer.id;
      
      // Save customer ID to database
      await updateTribeSubscription(tribe.id, {
        stripe_customer_id: customerId,
      });
    }

    // Get the price ID based on plan
    const priceId = plan === "yearly" 
      ? process.env.STRIPE_YEARLY_PRICE_ID 
      : process.env.STRIPE_MONTHLY_PRICE_ID;

    if (!priceId) {
      return NextResponse.json({ error: "Price not configured" }, { status: 500 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://madewithtribe.com";

    // Create checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/new-email?subscription=success`,
      cancel_url: `${baseUrl}/new-email?subscription=canceled`,
      metadata: {
        tribeId: tribe.id,
        plan,
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
