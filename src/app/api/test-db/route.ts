import { NextResponse } from "next/server";
import { Pool } from "pg";

export async function GET() {
  const dbUrl = process.env.DATABASE_URL || "";
  
  // Extract hostname from URL for debugging (hide password)
  let hostname = "unknown";
  try {
    const url = new URL(dbUrl);
    hostname = url.hostname;
  } catch {
    hostname = "invalid-url";
  }

  const envCheck = {
    DATABASE_URL_exists: !!process.env.DATABASE_URL,
    DATABASE_URL_hostname: hostname,
    DATABASE_URL_length: dbUrl.length,
  };

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ 
      success: false, 
      envCheck,
      error: "DATABASE_URL environment variable not set"
    }, { status: 500 });
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  
  try {
    const result = await pool.query("SELECT NOW() as current_time");
    await pool.end();
    
    return NextResponse.json({ 
      success: true, 
      envCheck,
      time: result.rows[0].current_time 
    });
  } catch (error) {
    await pool.end();
    return NextResponse.json(
      { 
        success: false,
        envCheck,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
