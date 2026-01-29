import { NextRequest, NextResponse } from "next/server";
import { getBearerToken, verifyMobileToken } from "@/lib/mobileAuth";
import { addSubscriber, subscriberExistsInTribe, getTribeById } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  try {
    const token = getBearerToken(request.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

    const { tribeId } = await verifyMobileToken(token);
    const tribe = await getTribeById(tribeId);
    if (!tribe) return NextResponse.json({ error: "Tribe not found" }, { status: 404 });

    const body = (await request.json()) as { email?: string; name?: string };
    const email = (body.email || "").trim().toLowerCase();

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    const exists = await subscriberExistsInTribe(tribeId, email);
    if (exists) {
      return NextResponse.json({ error: "Email already exists in your tribe" }, { status: 400 });
    }

    const subscriber = await addSubscriber(tribeId, email, body.name || undefined);
    if (!subscriber) return NextResponse.json({ error: "Failed to add subscriber" }, { status: 500 });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://madewithtribe.com";

    if (subscriber.verification_token) {
      await sendVerificationEmail(
        email,
        tribe.name,
        tribe.owner_name || "Anonymous",
        subscriber.verification_token,
        baseUrl
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 }
    );
  }
}
