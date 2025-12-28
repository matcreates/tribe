import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Delete subscriber by email
    await pool.query(
      `DELETE FROM subscribers WHERE email = $1`,
      [email.toLowerCase()]
    );

    return NextResponse.json({ 
      success: true,
      message: `Deleted subscriber: ${email}` 
    });
  } catch (error) {
    console.error("Delete subscriber error:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Internal server error" 
      },
      { status: 500 }
    );
  }
}

