import { NextResponse } from "next/server";
import { Pool } from "pg";

export async function GET() {
  const envCheck = {
    DATABASE_URL: !!process.env.DATABASE_URL,
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
