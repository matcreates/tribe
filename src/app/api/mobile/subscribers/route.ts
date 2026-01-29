import { NextRequest, NextResponse } from "next/server";
import { getBearerToken, verifyMobileToken } from "@/lib/mobileAuth";
import { pool } from "@/lib/db";
import { getSubscriberById, removeSubscriber as dbRemoveSubscriber } from "@/lib/db";

type SubscriberFilter = "all" | "verified" | "non-verified";
type SubscriberSort = "newest" | "oldest" | "a-z" | "z-a" | "verified-first" | "unverified-first";

function parseIntParam(v: string | null, fallback: number) {
  const n = v ? Number.parseInt(v, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export async function GET(request: NextRequest) {
  try {
    const token = getBearerToken(request.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

    const { tribeId } = await verifyMobileToken(token);

    const url = new URL(request.url);
    const page = Math.max(1, parseIntParam(url.searchParams.get("page"), 1));
    const pageSize = Math.min(200, Math.max(1, parseIntParam(url.searchParams.get("pageSize"), 50)));
    const filter = (url.searchParams.get("filter") as SubscriberFilter) || "all";
    const sort = (url.searchParams.get("sort") as SubscriberSort) || "newest";
    const search = (url.searchParams.get("search") || "").trim();

    // WHERE
    let whereClause = "WHERE tribe_id = $1";
    const params: (string | number)[] = [tribeId];
    let paramIndex = 2;

    if (filter === "verified") whereClause += " AND verified = true";
    if (filter === "non-verified") whereClause += " AND verified = false";

    if (search) {
      whereClause += ` AND (email ILIKE $${paramIndex} OR COALESCE(name, '') ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // ORDER
    let orderClause: string;
    switch (sort) {
      case "oldest":
        orderClause = "ORDER BY created_at ASC";
        break;
      case "a-z":
        orderClause = "ORDER BY email ASC";
        break;
      case "z-a":
        orderClause = "ORDER BY email DESC";
        break;
      case "verified-first":
        orderClause = "ORDER BY verified DESC, created_at DESC";
        break;
      case "unverified-first":
        orderClause = "ORDER BY verified ASC, created_at DESC";
        break;
      case "newest":
      default:
        orderClause = "ORDER BY created_at DESC";
        break;
    }

    // totals
    const countResult = await pool.query(`SELECT COUNT(*) as count FROM subscribers WHERE tribe_id = $1`, [tribeId]);
    const total = Number.parseInt(countResult.rows[0].count, 10);

    const verifiedResult = await pool.query(
      `SELECT COUNT(*) as count FROM subscribers WHERE tribe_id = $1 AND verified = true`,
      [tribeId]
    );
    const totalVerified = Number.parseInt(verifiedResult.rows[0].count, 10);
    const totalNonVerified = total - totalVerified;

    const filteredCountResult = await pool.query(`SELECT COUNT(*) as count FROM subscribers ${whereClause}`, params);
    const filteredTotal = Number.parseInt(filteredCountResult.rows[0].count, 10);

    const totalPages = Math.max(1, Math.ceil(filteredTotal / pageSize));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const offset = (safePage - 1) * pageSize;

    const dataQuery = `
      SELECT id, email, name, verified, created_at
      FROM subscribers
      ${whereClause}
      ${orderClause}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(pageSize, offset);

    const result = await pool.query(dataQuery, params);

    return NextResponse.json({
      ok: true,
      subscribers: result.rows.map((s: any) => ({
        id: s.id,
        email: s.email,
        name: s.name,
        verified: s.verified,
        created_at: s.created_at,
      })),
      total,
      totalVerified,
      totalNonVerified,
      page: safePage,
      pageSize,
      totalPages,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/mobile/subscribers?id=SUBSCRIBER_ID
export async function DELETE(request: NextRequest) {
  try {
    const token = getBearerToken(request.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

    const { tribeId } = await verifyMobileToken(token);
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const subscriber = await getSubscriberById(id);
    if (!subscriber || subscriber.tribe_id !== tribeId) {
      return NextResponse.json({ error: "Subscriber not found" }, { status: 404 });
    }

    await dbRemoveSubscriber(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 }
    );
  }
}
