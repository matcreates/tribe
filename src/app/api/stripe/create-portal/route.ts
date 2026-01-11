import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTribeByUserId } from "@/lib/db";
import Stripe from "stripe";

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stripe = getStripe();

    const tribe = await getTribeByUserId(session.user.id);
    if (!tribe) {
      return NextResponse.json({ error: "Tribe not found" }, { status: 404 });
    }

    if (!tribe.stripe_customer_id) {
      return NextResponse.json({ error: "No subscription found" }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://madewithtribe.com";

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: tribe.stripe_customer_id,
      return_url: `${baseUrl}/settings`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error("Portal session error:", error);
    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 }
    );
  }
}
