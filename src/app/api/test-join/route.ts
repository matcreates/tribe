import { NextRequest, NextResponse } from "next/server";
import { getTribeBySlug, addSubscriber } from "@/lib/db";

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug") || "mathisapro";
  const testEmail = `test-${Date.now()}@example.com`;

  const steps: Record<string, unknown> = {};

  try {
    // Step 1: Get tribe by slug
    steps.step1_getTribe = "starting";
    const tribe = await getTribeBySlug(slug);
    steps.step1_getTribe = tribe ? { id: tribe.id, name: tribe.name } : "not found";

    if (!tribe) {
      return NextResponse.json({ steps, error: "Tribe not found" });
    }

    // Step 2: Add subscriber
    steps.step2_addSubscriber = "starting";
    const subscriber = await addSubscriber(tribe.id, testEmail);
    steps.step2_addSubscriber = subscriber 
      ? { id: subscriber.id, hasToken: !!subscriber.verification_token } 
      : "failed (duplicate?)";

    // Step 3: Check headers
    steps.step3_headers = {
      host: request.headers.get("host"),
    };

    return NextResponse.json({ 
      success: true, 
      steps,
      testEmail 
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      steps,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

