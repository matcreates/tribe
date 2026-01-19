import { NextResponse } from "next/server";
import { Pool } from "@neondatabase/serverless";

// One-time cleanup endpoint for matcreates
// DELETE THIS FILE AFTER USE

export async function POST(request: Request) {
  // Security: require a secret key
  const { secretKey } = await request.json();
  
  if (secretKey !== "cleanup-matcreates-2024") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    // First, find the user matcreates
    const userResult = await pool.query(
      `SELECT id FROM users WHERE LOWER(name) = 'matcreates' OR LOWER(email) LIKE '%matcreates%'`
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: "User matcreates not found" }, { status: 404 });
    }

    const userId = userResult.rows[0].id;

    // Find their tribe
    const tribeResult = await pool.query(
      `SELECT id FROM tribes WHERE user_id = $1`,
      [userId]
    );

    if (tribeResult.rows.length === 0) {
      return NextResponse.json({ error: "Tribe not found for user" }, { status: 404 });
    }

    const tribeId = tribeResult.rows[0].id;

    // Count unverified subscribers before deletion
    const countResult = await pool.query(
      `SELECT COUNT(*) as count FROM subscribers WHERE tribe_id = $1 AND verified = false`,
      [tribeId]
    );

    const unverifiedCount = parseInt(countResult.rows[0].count);

    if (unverifiedCount === 0) {
      return NextResponse.json({ 
        message: "No unverified subscribers to delete",
        deleted: 0 
      });
    }

    // Delete unverified subscribers
    const deleteResult = await pool.query(
      `DELETE FROM subscribers WHERE tribe_id = $1 AND verified = false`,
      [tribeId]
    );

    return NextResponse.json({ 
      message: `Successfully deleted ${deleteResult.rowCount} unverified subscribers`,
      deleted: deleteResult.rowCount,
      tribeId 
    });

  } catch (error) {
    console.error("Cleanup error:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  } finally {
    await pool.end();
  }
}
