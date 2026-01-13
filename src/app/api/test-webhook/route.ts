import { NextRequest, NextResponse } from "next/server";

// Super simple endpoint - no auth, no DB, nothing
export async function POST(request: NextRequest) {
  const body = await request.text();
  console.log("TEST WEBHOOK RECEIVED:", body.substring(0, 200));
  return NextResponse.json({ ok: true, received: true, timestamp: Date.now() });
}

export async function GET() {
  return NextResponse.json({ ok: true, status: "test webhook active" });
}
