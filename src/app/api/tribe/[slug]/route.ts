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

    return NextResponse.json({
      id: tribe.id,
      name: tribe.name,
      slug: tribe.slug,
      ownerName: tribe.owner_name || "Anonymous",
      ownerAvatar: tribe.owner_avatar,
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


