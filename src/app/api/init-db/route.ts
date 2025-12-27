import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export async function GET() {
  try {
    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create tribes table
    await sql`
      CREATE TABLE IF NOT EXISTS tribes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        owner_name TEXT,
        owner_avatar TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create subscribers table
    await sql`
      CREATE TABLE IF NOT EXISTS subscribers (
        id TEXT PRIMARY KEY,
        tribe_id TEXT NOT NULL,
        email TEXT NOT NULL,
        name TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tribe_id, email)
      )
    `;

    // Create sent_emails table
    await sql`
      CREATE TABLE IF NOT EXISTS sent_emails (
        id TEXT PRIMARY KEY,
        tribe_id TEXT NOT NULL,
        subject TEXT,
        body TEXT,
        recipient_count INTEGER DEFAULT 0,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    return NextResponse.json({ success: true, message: "Database initialized" });
  } catch (error) {
    console.error("Database init error:", error);
    return NextResponse.json(
      { 
        error: "Failed to initialize database", 
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
