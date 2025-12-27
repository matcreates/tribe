import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export async function GET() {
  // First, check if env vars exist
  const envCheck = {
    POSTGRES_URL: !!process.env.POSTGRES_URL,
    POSTGRES_HOST: !!process.env.POSTGRES_HOST,
    POSTGRES_DATABASE: !!process.env.POSTGRES_DATABASE,
  };

  try {
    // Simple test query
    const result = await sql`SELECT NOW() as current_time`;
    
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
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

