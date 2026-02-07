import { NextRequest, NextResponse } from "next/server";
import { getBearerToken, verifyMobileToken } from "@/lib/mobileAuth";
import {
  getVerifiedSubscriberCount,
  getSubscriberCount,
  getTribeById,
} from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const token = getBearerToken(request.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

    const { tribeId } = await verifyMobileToken(token);

    const [verified, all, tribe] = await Promise.all([
      getVerifiedSubscriberCount(tribeId),
      getSubscriberCount(tribeId),
      getTribeById(tribeId),
    ]);

    return NextResponse.json({
      ok: true,
      recipients: {
        verified,
        nonVerified: all - verified,
        all,
      },
      signature: tribe?.email_signature || "",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 }
    );
  }
}
