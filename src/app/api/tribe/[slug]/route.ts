import { NextRequest, NextResponse } from "next/server";
import { getTribeBySlug } from "@/lib/db";

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

    const defaultDescription = "A tribe is a group of people who choose to follow your work, support your ideas, and stay connected.";
    
    return NextResponse.json({
      id: tribe.id,
      name: tribe.name,
      slug: tribe.slug,
      ownerName: tribe.owner_name || "Anonymous",
      ownerAvatar: tribe.owner_avatar,
      description: tribe.join_description || defaultDescription,
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


