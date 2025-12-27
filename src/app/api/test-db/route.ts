import { NextResponse } from "next/server";
import { Pool } from "pg";

export async function GET() {
  // Check ALL database-related env vars
  const allEnvVars: Record<string, string> = {};
  for (const key of Object.keys(process.env)) {
    if (key.includes('POSTGRES') || key.includes('DATABASE') || key.includes('PG')) {
      const value = process.env[key] || "";
      // Show first 40 chars only (hide passwords)
      allEnvVars[key] = value.length > 40 ? value.substring(0, 40) + "..." : value;
    }
  }

  const dbUrl = process.env.DATABASE_URL || "";
  
  let hostname = "unknown";
  try {
    const url = new URL(dbUrl);
    hostname = url.hostname;
  } catch {
    hostname = "invalid-url";
  }

  const envCheck = {
    DATABASE_URL_hostname: hostname,
    DATABASE_URL_length: dbUrl.length,
    all_db_env_vars: allEnvVars,
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
