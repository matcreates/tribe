import { NextRequest, NextResponse } from "next/server";
import { createUser, getUserByEmail, createTribe } from "@/lib/db";
import { signMobileToken } from "@/lib/mobileAuth";

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = (await request.json()) as {
      email?: string;
      password?: string;
      name?: string;
    };

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    // Strong password: 8+ chars, at least one uppercase, one lowercase, one number
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!strongPasswordRegex.test(password)) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters with uppercase, lowercase, and a number" },
        { status: 400 }
      );
    }

    const existing = await getUserByEmail(email);
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 400 });
    }

    const user = await createUser(email, password, name);
    const slug = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
    const tribe = await createTribe(user.id, "My Tribe", slug, name || "Anonymous");

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
