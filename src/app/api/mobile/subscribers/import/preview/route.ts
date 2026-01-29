import { NextRequest, NextResponse } from "next/server";
import { getBearerToken, verifyMobileToken } from "@/lib/mobileAuth";
import { getExistingEmailsInTribe } from "@/lib/db";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email: string) {
  return EMAIL_REGEX.test(email.trim().toLowerCase());
}

export async function POST(request: NextRequest) {
  try {
    const token = getBearerToken(request.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

    const { tribeId } = await verifyMobileToken(token);
    const body = (await request.json()) as { emails?: string[] };
    const raw = body.emails || [];

    const allParsed: string[] = [];
    const seen = new Set<string>();

    for (const email of raw) {
      const trimmed = (email || "").trim().toLowerCase();
      if (trimmed && !seen.has(trimmed)) {
        seen.add(trimmed);
        allParsed.push(trimmed);
      }
    }

    const totalInFile = allParsed.length;

    const validEmails: string[] = [];
    const invalidEmails: string[] = [];

    for (const e of allParsed) {
      if (isValidEmail(e)) validEmails.push(e);
      else invalidEmails.push(e);
    }

    const existing = await getExistingEmailsInTribe(tribeId, validEmails);

    const newEmails: string[] = [];
    const duplicateEmails: string[] = [];

    for (const e of validEmails) {
      if (existing.has(e)) duplicateEmails.push(e);
      else newEmails.push(e);
    }

    return NextResponse.json({
      ok: true,
      totalInFile,
      duplicates: duplicateEmails.length,
      invalid: invalidEmails.length,
      toImport: newEmails.length,
      emails: newEmails,
      invalidEmails,
      duplicateEmails,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 }
    );
  }
}
