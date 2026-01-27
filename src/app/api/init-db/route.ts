import { NextResponse } from "next/server";
import { initDatabase, pool } from "@/lib/db";

export async function GET(request: Request) {
  const logs: string[] = [];

  // Optional protection: if INIT_DB_SECRET is set, require it.
  const requiredSecret = process.env.INIT_DB_SECRET;
  if (requiredSecret) {
    const authHeader = request.headers.get("authorization");
    const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const urlSecret = new URL(request.url).searchParams.get("secret");
    const provided = bearer || urlSecret;

    if (provided !== requiredSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  
  try {
    // Run main init
    await initDatabase();
    logs.push("Main database init completed");
    
    // Explicitly try to add the short_code column
    try {
      await pool.query(`ALTER TABLE gifts ADD COLUMN short_code TEXT UNIQUE`);
      logs.push("Added short_code column to gifts table");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("already exists")) {
        logs.push("short_code column already exists");
      } else {
        logs.push(`short_code column error: ${msg}`);
      }
    }
    
    // Explicitly try to add the gift_id column
    try {
      await pool.query(`ALTER TABLE subscribers ADD COLUMN gift_id TEXT`);
      logs.push("Added gift_id column to subscribers table");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("already exists")) {
        logs.push("gift_id column already exists");
      } else {
        logs.push(`gift_id column error: ${msg}`);
      }
    }
    
    return NextResponse.json({ success: true, message: "Database initialized", logs });
  } catch (error) {
    console.error("Database init error:", error);
    return NextResponse.json(
      { 
        error: "Failed to initialize database", 
        details: error instanceof Error ? error.message : String(error),
        logs
      },
      { status: 500 }
    );
  }
}
