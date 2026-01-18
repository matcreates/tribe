import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTribeByUserId, deleteGift } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const tribe = await getTribeByUserId(session.user.id);
    if (!tribe) {
      return NextResponse.json(
        { error: "Tribe not found" },
        { status: 404 }
      );
    }

    const { giftId } = await request.json();
    if (!giftId) {
      return NextResponse.json(
        { error: "Gift ID is required" },
        { status: 400 }
      );
    }

    const deleted = await deleteGift(giftId, tribe.id);
    if (!deleted) {
      return NextResponse.json(
        { error: "Gift not found or already deleted" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete gift error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to delete gift",
      },
      { status: 500 }
    );
  }
}
