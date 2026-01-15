import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool, getTribeByUserId } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get the user's tribe
    const tribe = await getTribeByUserId(session.user.id);
    if (!tribe) {
      return NextResponse.json(
        { error: "Tribe not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Delete subscriber only if they belong to the authenticated user's tribe
    const result = await pool.query(
      `DELETE FROM subscribers WHERE email = $1 AND tribe_id = $2`,
      [email.toLowerCase(), tribe.id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: "Subscriber not found in your tribe" },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: "Subscriber deleted" 
    });
  } catch (error) {
    console.error("Delete subscriber error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

