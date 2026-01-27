import { NextRequest, NextResponse } from "next/server";
import { getUserByEmail, verifyPassword, getTribeByUserId, createTribe } from "@/lib/db";
import { signMobileToken } from "@/lib/mobileAuth";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = (await request.json()) as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      return NextResponse.json({ error: "Missing email/password" }, { status: 400 });
    }

    const user = await getUserByEmail(email);
    if (!user) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    const ok = await verifyPassword(password, user.password);
    if (!ok) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    let tribe = await getTribeByUserId(user.id);
    if (!tribe) {
      const slug = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
      tribe = await createTribe(user.id, "My Tribe", slug, user.name || "Anonymous");
    }

    const token = await signMobileToken({
      userId: user.id,
      tribeId: tribe.id,
      email: user.email,
      name: user.name,
    });

    return NextResponse.json({
      token,
      user: { id: user.id, email: user.email, name: user.name },
      tribe: { id: tribe.id, name: tribe.name, slug: tribe.slug },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 }
    );
  }
}
