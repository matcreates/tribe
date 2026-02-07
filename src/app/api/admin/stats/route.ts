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
      paidUsersResult,
      paidBreakdownResult,
    ] = await Promise.all([
      pool.query(`SELECT COUNT(*) as count FROM users`),
      pool.query(`SELECT COUNT(*) as count FROM tribes`),
      pool.query(`SELECT COUNT(*) as count FROM subscribers`),
      pool.query(`SELECT COUNT(*) as count FROM subscribers WHERE verified = true`),
      pool.query(`SELECT COUNT(*) as count FROM sent_emails WHERE status = 'sent'`),
      pool.query(`SELECT COUNT(*) as count FROM gifts`),
      pool.query(`SELECT email, name, created_at FROM users ORDER BY created_at DESC LIMIT 10`),
      pool.query(`SELECT COUNT(*) as count FROM tribes WHERE subscription_status = 'active'`),
      pool.query(`
        SELECT 
          t.subscription_plan,
          t.subscription_status,
          t.subscription_ends_at,
          t.owner_name,
          t.slug,
          u.email,
          u.name,
          (SELECT COUNT(*) FROM subscribers s WHERE s.tribe_id = t.id AND s.verified = true) as member_count
        FROM tribes t
        JOIN users u ON t.user_id = u.id
        WHERE t.subscription_status = 'active'
        ORDER BY t.subscription_ends_at DESC
      `),
    ]);

    return NextResponse.json({
      totalUsers: Number(usersResult.rows[0].count),
      totalTribes: Number(tribesResult.rows[0].count),
      totalSubscribers: Number(subscribersResult.rows[0].count),
      totalVerifiedSubscribers: Number(verifiedSubsResult.rows[0].count),
      totalEmailsSent: Number(emailsSentResult.rows[0].count),
      totalGifts: Number(giftsResult.rows[0].count),
      totalPaidUsers: Number(paidUsersResult.rows[0].count),
      paidUsers: paidBreakdownResult.rows.map((r: { subscription_plan: string; subscription_status: string; subscription_ends_at: Date; owner_name: string | null; slug: string; email: string; name: string | null; member_count: string }) => ({
        email: r.email,
        name: r.name || r.owner_name,
        slug: r.slug,
        plan: r.subscription_plan,
        status: r.subscription_status,
        endsAt: r.subscription_ends_at,
        memberCount: Number(r.member_count),
      })),
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
