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
    // Check Stripe key first
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("STRIPE_SECRET_KEY is not set");
      return NextResponse.json({ error: "Stripe is not configured. Please add STRIPE_SECRET_KEY to environment variables." }, { status: 500 });
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Please log in to subscribe" }, { status: 401 });
    }

    const stripe = getStripe();

    const { plan } = await req.json();
    
    if (!plan || !["monthly", "yearly"].includes(plan)) {
      return NextResponse.json({ error: "Invalid plan selected" }, { status: 400 });
    }

    // Check price IDs
    const priceId = plan === "yearly" 
      ? process.env.STRIPE_YEARLY_PRICE_ID 
      : process.env.STRIPE_MONTHLY_PRICE_ID;

    if (!priceId) {
      const missingVar = plan === "yearly" ? "STRIPE_YEARLY_PRICE_ID" : "STRIPE_MONTHLY_PRICE_ID";
      console.error(`${missingVar} is not set`);
      return NextResponse.json({ error: `${missingVar} is not configured in environment variables.` }, { status: 500 });
    }

    const tribe = await getTribeByUserId(session.user.id);
    if (!tribe) {
      return NextResponse.json({ error: "Tribe not found. Please refresh the page." }, { status: 404 });
    }

    // Get or create Stripe customer
    let customerId = tribe.stripe_customer_id;
    
    if (!customerId) {
      try {
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
      } catch (customerError) {
        console.error("Failed to create Stripe customer:", customerError);
        return NextResponse.json({ error: "Failed to create customer. Please check your Stripe API key." }, { status: 500 });
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://madewithtribe.com";

    // Create checkout session
    try {
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
    } catch (checkoutError) {
      console.error("Failed to create checkout session:", checkoutError);
      const errorMessage = checkoutError instanceof Error ? checkoutError.message : "Unknown error";
      return NextResponse.json({ error: `Stripe error: ${errorMessage}` }, { status: 500 });
    }
  } catch (error) {
    console.error("Stripe checkout error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Checkout failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}
