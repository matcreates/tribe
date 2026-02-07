import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";

// Hardcoded admin email - the ONLY account that can access this endpoint
const ADMIN_EMAIL = "mathisapro@gmail.com";

export async function GET() {
  try {
    // 1. Require authenticated session
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Verify exact admin email match (case-insensitive)
    if (session.user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      // Return generic 404 to avoid leaking that this endpoint exists
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // 3. Gather platform stats
    const [
      usersResult,
      tribesResult,
      subscribersResult,
      verifiedSubsResult,
      emailsSentResult,
      giftsResult,
      recentUsersResult,
    ] = await Promise.all([
      pool.query(`SELECT COUNT(*) as count FROM users`),
      pool.query(`SELECT COUNT(*) as count FROM tribes`),
      pool.query(`SELECT COUNT(*) as count FROM subscribers`),
      pool.query(`SELECT COUNT(*) as count FROM subscribers WHERE verified = true`),
      pool.query(`SELECT COUNT(*) as count FROM sent_emails WHERE status = 'sent'`),
      pool.query(`SELECT COUNT(*) as count FROM gifts`),
      pool.query(`SELECT email, name, created_at FROM users ORDER BY created_at DESC LIMIT 10`),
    ]);

    return NextResponse.json({
      totalUsers: Number(usersResult.rows[0].count),
      totalTribes: Number(tribesResult.rows[0].count),
      totalSubscribers: Number(subscribersResult.rows[0].count),
      totalVerifiedSubscribers: Number(verifiedSubsResult.rows[0].count),
      totalEmailsSent: Number(emailsSentResult.rows[0].count),
      totalGifts: Number(giftsResult.rows[0].count),
      recentUsers: recentUsersResult.rows.map((u: { email: string; name: string | null; created_at: Date }) => ({
        email: u.email,
        name: u.name,
        createdAt: u.created_at,
      })),
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
