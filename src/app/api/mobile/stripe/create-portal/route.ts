import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getBearerToken, verifyMobileToken } from "@/lib/mobileAuth";
import { getTribeById } from "@/lib/db";

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
      return NextResponse.json({ error: "No subscription found" }, { status: 400 });
    }

    const stripe = getStripe();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://madewithtribe.com";

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: tribe.stripe_customer_id,
      return_url: `${baseUrl}/settings`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (e) {
    return NextResponse.json({ error: "Failed to create portal session" }, { status: 500 });
  }
}
