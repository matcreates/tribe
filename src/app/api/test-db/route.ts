import { NextResponse } from "next/server";
import { Pool } from "pg";

export async function GET() {
  // Using TRIBE_DATABASE_URL to avoid Vercel/Supabase integration overrides
  const dbUrl = process.env.TRIBE_DATABASE_URL || "";
  
  let hostname = "unknown";
  try {
    const url = new URL(dbUrl);
    hostname = url.hostname;
  } catch {
    hostname = "invalid-url";
  }

  const envCheck = {
    TRIBE_DATABASE_URL_hostname: hostname,
    TRIBE_DATABASE_URL_length: dbUrl.length,
    TRIBE_DATABASE_URL_preview: dbUrl.length > 40 ? dbUrl.substring(0, 40) + "..." : dbUrl,
  };

  if (!process.env.TRIBE_DATABASE_URL) {
    return NextResponse.json({ 
      success: false, 
      envCheck,
      error: "TRIBE_DATABASE_URL environment variable not set"
    }, { status: 500 });
  }

  const pool = new Pool({
    connectionString: process.env.TRIBE_DATABASE_URL,
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
