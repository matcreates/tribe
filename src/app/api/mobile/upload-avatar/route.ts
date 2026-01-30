import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getBearerToken, verifyMobileToken } from "@/lib/mobileAuth";
import { updateTribe } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const token = getBearerToken(request.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

    const { tribeId } = await verifyMobileToken(token);

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File size must be less than 5MB" }, { status: 400 });
    }

    const ext = (file.name.split(".").pop() || "png").replace(/[^a-zA-Z0-9]/g, "");

    const blob = await put(`avatars/${tribeId}-${Date.now()}.${ext}`, file, {
      access: "public",
      contentType: file.type,
    });

    await updateTribe(tribeId, { owner_avatar: blob.url });

    return NextResponse.json({ ok: true, url: blob.url });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to upload image" },
      { status: 500 }
    );
  }
}
