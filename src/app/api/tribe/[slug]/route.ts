import { NextRequest, NextResponse } from "next/server";
import { getTribeBySlug, getVerifiedSubscriberCount } from "@/lib/db";
import { TRIBE_SIZE_LIMITS, SubscriptionTier } from "@/lib/types";

// Helper to determine tier from plan
function getTierFromPlan(plan: string | null, status: string): SubscriptionTier {
  if (status !== 'active' && status !== 'canceled') return 'free';
  if (!plan) return 'free';
  if (plan.startsWith('big_')) return 'big';
  if (plan.startsWith('small_') || plan === 'monthly' || plan === 'yearly') return 'small';
  return 'free';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const tribe = await getTribeBySlug(slug);
    
    if (!tribe) {
      return NextResponse.json(
        { error: "Tribe not found" },
        { status: 404 }
      );
    }

    // Check if tribe is full
    const tier = getTierFromPlan(tribe.subscription_plan, tribe.subscription_status || 'free');
    const sizeLimit = TRIBE_SIZE_LIMITS[tier];
    let isTribeFull = false;
    
    if (sizeLimit !== null) {
      const currentSize = await getVerifiedSubscriberCount(tribe.id);
      isTribeFull = currentSize >= sizeLimit;
    }

    const defaultDescription = "A tribe is a group of people who choose to follow your work, support your ideas, and stay connected.";
    
    return NextResponse.json({
      id: tribe.id,
      name: tribe.name,
      slug: tribe.slug,
      ownerName: tribe.owner_name || "Anonymous",
      ownerAvatar: tribe.owner_avatar,
      description: tribe.join_description || defaultDescription,
      isTribeFull,
    });
  } catch (error) {
    console.error("Get tribe by slug error:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Internal server error" 
      },
      { status: 500 }
    );
  }
}


