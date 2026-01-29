import { NextRequest, NextResponse } from "next/server";
import { getBearerToken, verifyMobileToken } from "@/lib/mobileAuth";
import { addSubscriberBulk, getTribeById } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email: string) {
  return EMAIL_REGEX.test(email.trim().toLowerCase());
}

export async function POST(request: NextRequest) {
  try {
    const token = getBearerToken(request.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

    const { tribeId } = await verifyMobileToken(token);
    const tribe = await getTribeById(tribeId);
    if (!tribe) return NextResponse.json({ error: "Tribe not found" }, { status: 404 });

    const body = (await request.json()) as { emails?: string[]; sendVerification?: boolean };
    const emails = body.emails || [];
    const sendVerification = !!body.sendVerification;

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://madewithtribe.com";

    let added = 0;
    const errors: string[] = [];

    for (const email of emails) {
      const trimmed = (email || "").trim().toLowerCase();
      if (!trimmed || !isValidEmail(trimmed)) continue;

      try {
        const result = await addSubscriberBulk(tribeId, trimmed, !sendVerification);
        if (result) {
          added++;
          if (sendVerification && result.verification_token) {
            try {
              await sendVerificationEmail(
                trimmed,
                tribe.name,
                tribe.owner_name || "Anonymous",
                result.verification_token,
                baseUrl
              );
            } catch {
              errors.push(`Failed to send verification to ${trimmed}`);
            }
          }
        }
      } catch {
        errors.push(`Failed to add ${trimmed}`);
      }
    }

    return NextResponse.json({ ok: true, added, errors });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 }
    );
  }
}
