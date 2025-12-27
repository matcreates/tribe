import { NextResponse } from "next/server";
import { createClient } from "@vercel/postgres";

export async function GET() {
  const envCheck = {
    POSTGRES_URL: !!process.env.POSTGRES_URL,
    POSTGRES_URL_VALUE: process.env.POSTGRES_URL?.substring(0, 30) + "...",
  };

  const client = createClient();
  
  try {
    await client.connect();
    const result = await client.query("SELECT NOW() as current_time");
    await client.end();
    
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
