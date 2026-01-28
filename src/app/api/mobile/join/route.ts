import { NextRequest, NextResponse } from "next/server";
import { getBearerToken, verifyMobileToken } from "@/lib/mobileAuth";
import { getTribeSettings, updateTribeSettings } from "@/lib/actions";

export async function GET(request: NextRequest) {
  try {
    const token = getBearerToken(request.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

    await verifyMobileToken(token);

    const settings = await getTribeSettings();
    return NextResponse.json({
      ok: true,
      join: {
        slug: settings.slug,
        ownerName: settings.ownerName,
        ownerAvatar: settings.ownerAvatar,
        description: settings.joinDescription,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const token = getBearerToken(request.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

    await verifyMobileToken(token);

    const body = (await request.json()) as { description?: string };
    if (typeof body.description !== "string") {
      return NextResponse.json({ error: "Missing description" }, { status: 400 });
    }

    await updateTribeSettings({ joinDescription: body.description });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 }
    );
  }
}
