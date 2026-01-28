import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getBearerToken, verifyMobileToken } from "@/lib/mobileAuth";
import { createGift, getGiftCountByTribeId } from "@/lib/db";

const MAX_GIFTS = 5;
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .substring(0, 100);
}

export async function POST(request: NextRequest) {
  try {
    const token = getBearerToken(request.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

    const { tribeId } = await verifyMobileToken(token);

    const count = await getGiftCountByTribeId(tribeId);
    if (count >= MAX_GIFTS) {
      return NextResponse.json({ error: `You can only upload ${MAX_GIFTS} gifts` }, { status: 400 });
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File must be less than 20MB" }, { status: 400 });
    }

    const timestamp = Date.now();
    const safeName = sanitizeFilename(file.name || `gift-${timestamp}`);

    const blob = await put(`gifts/${timestamp}-${safeName}`, file, {
      access: "public",
    });

    const gift = await createGift(tribeId, safeName, blob.url, file.size, null);

    return NextResponse.json({ ok: true, gift });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 }
    );
  }
}
