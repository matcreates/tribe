import { Pool } from "pg";
import bcrypt from "bcryptjs";

// Create connection pool using TRIBE_DATABASE_URL (using custom name to avoid Vercel overrides)
export const pool = new Pool({
  connectionString: process.env.TRIBE_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Helper to run queries
async function query<T>(text: string, params?: (string | number | null)[]): Promise<T[]> {
  const result = await pool.query(text, params);
  return result.rows as T[];
}

// Initialize tables
export async function initDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tribes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      owner_name TEXT,
      owner_avatar TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS subscribers (
      id TEXT PRIMARY KEY,
      tribe_id TEXT NOT NULL,
      email TEXT NOT NULL,
      name TEXT,
      verified BOOLEAN DEFAULT FALSE,
      verification_token TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(tribe_id, email)
    )
  `);
  
  // Add columns if they don't exist (for existing databases)
  await pool.query(`
    DO $$ 
    BEGIN 
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscribers' AND column_name='verified') THEN
        ALTER TABLE subscribers ADD COLUMN verified BOOLEAN DEFAULT FALSE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscribers' AND column_name='verification_token') THEN
        ALTER TABLE subscribers ADD COLUMN verification_token TEXT;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscribers' AND column_name='unsubscribed') THEN
        ALTER TABLE subscribers ADD COLUMN unsubscribed BOOLEAN DEFAULT FALSE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscribers' AND column_name='unsubscribe_token') THEN
        ALTER TABLE subscribers ADD COLUMN unsubscribe_token TEXT;
      END IF;
    END $$;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sent_emails (
      id TEXT PRIMARY KEY,
      tribe_id TEXT NOT NULL,
      subject TEXT,
      body TEXT,
      recipient_count INTEGER DEFAULT 0,
      sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export interface DbUser {
  id: string;
  email: string;
  password: string;
  name: string | null;
  created_at: Date;
}

export interface DbTribe {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  owner_name: string | null;
  owner_avatar: string | null;
  created_at: Date;
}

export interface DbSubscriber {
  id: string;
  tribe_id: string;
  email: string;
  name: string | null;
  verified: boolean;
  verification_token: string | null;
  unsubscribed: boolean;
  unsubscribe_token: string | null;
  created_at: Date;
}

export interface DbSentEmail {
  id: string;
  tribe_id: string;
  subject: string | null;
  body: string | null;
  recipient_count: number;
  sent_at: Date;
}

// User functions
export async function createUser(email: string, password: string, name?: string): Promise<DbUser> {
  const id = crypto.randomUUID();
  const hashedPassword = bcrypt.hashSync(password, 10);
  
  await pool.query(
    `INSERT INTO users (id, email, password, name) VALUES ($1, $2, $3, $4)`,
    [id, email.toLowerCase(), hashedPassword, name || null]
  );
  
  const user = await getUserById(id);
  return user!;
}

export async function getUserByEmail(email: string): Promise<DbUser | null> {
  const rows = await query<DbUser>(`SELECT * FROM users WHERE email = $1`, [email.toLowerCase()]);
  return rows[0] || null;
}

export async function getUserById(id: string): Promise<DbUser | null> {
  const rows = await query<DbUser>(`SELECT * FROM users WHERE id = $1`, [id]);
  return rows[0] || null;
}

export function verifyPassword(password: string, hashedPassword: string): boolean {
  return bcrypt.compareSync(password, hashedPassword);
}

// Tribe functions
export async function createTribe(userId: string, name: string, slug: string, ownerName?: string): Promise<DbTribe> {
  const id = crypto.randomUUID();
  
  await pool.query(
    `INSERT INTO tribes (id, user_id, name, slug, owner_name) VALUES ($1, $2, $3, $4, $5)`,
    [id, userId, name, slug.toLowerCase(), ownerName || null]
  );
  
  const tribe = await getTribeById(id);
  return tribe!;
}

export async function getTribeById(id: string): Promise<DbTribe | null> {
  const rows = await query<DbTribe>(`SELECT * FROM tribes WHERE id = $1`, [id]);
  return rows[0] || null;
}

export async function getTribeBySlug(slug: string): Promise<DbTribe | null> {
  const rows = await query<DbTribe>(`SELECT * FROM tribes WHERE slug = $1`, [slug.toLowerCase()]);
  return rows[0] || null;
}

export async function getTribeByUserId(userId: string): Promise<DbTribe | null> {
  const rows = await query<DbTribe>(`SELECT * FROM tribes WHERE user_id = $1 LIMIT 1`, [userId]);
  return rows[0] || null;
}

export async function updateTribe(id: string, updates: Partial<Pick<DbTribe, "name" | "slug" | "owner_name" | "owner_avatar">>): Promise<void> {
  if (updates.name !== undefined) {
    await pool.query(`UPDATE tribes SET name = $1 WHERE id = $2`, [updates.name, id]);
  }
  if (updates.slug !== undefined) {
    await pool.query(`UPDATE tribes SET slug = $1 WHERE id = $2`, [updates.slug.toLowerCase(), id]);
  }
  if (updates.owner_name !== undefined) {
    await pool.query(`UPDATE tribes SET owner_name = $1 WHERE id = $2`, [updates.owner_name, id]);
  }
  if (updates.owner_avatar !== undefined) {
    await pool.query(`UPDATE tribes SET owner_avatar = $1 WHERE id = $2`, [updates.owner_avatar, id]);
  }
}

// Subscriber functions
export async function addSubscriber(tribeId: string, email: string, name?: string): Promise<DbSubscriber | null> {
  const id = crypto.randomUUID();
  const verificationToken = crypto.randomUUID();
  const unsubscribeToken = crypto.randomUUID();
  
  try {
    await pool.query(
      `INSERT INTO subscribers (id, tribe_id, email, name, verified, verification_token, unsubscribed, unsubscribe_token) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, tribeId, email.toLowerCase(), name || null, false, verificationToken, false, unsubscribeToken]
    );
    return await getSubscriberById(id);
  } catch {
    // Duplicate email
    return null;
  }
}

export async function verifySubscriber(token: string): Promise<DbSubscriber | null> {
  const rows = await query<DbSubscriber>(`SELECT * FROM subscribers WHERE verification_token = $1`, [token]);
  if (rows.length === 0) return null;
  
  await pool.query(`UPDATE subscribers SET verified = TRUE, verification_token = NULL WHERE verification_token = $1`, [token]);
  return await getSubscriberById(rows[0].id);
}

export async function getVerifiedSubscribersByTribeId(tribeId: string): Promise<DbSubscriber[]> {
  return await query<DbSubscriber>(`SELECT * FROM subscribers WHERE tribe_id = $1 AND verified = TRUE AND (unsubscribed = FALSE OR unsubscribed IS NULL) ORDER BY created_at DESC`, [tribeId]);
}

export async function getVerifiedSubscriberCount(tribeId: string): Promise<number> {
  const rows = await query<{ count: string }>(`SELECT COUNT(*) as count FROM subscribers WHERE tribe_id = $1 AND verified = TRUE AND (unsubscribed = FALSE OR unsubscribed IS NULL)`, [tribeId]);
  return Number(rows[0].count);
}

export async function unsubscribeByToken(token: string): Promise<{ success: boolean; email?: string }> {
  const rows = await query<DbSubscriber>(`SELECT * FROM subscribers WHERE unsubscribe_token = $1`, [token]);
  if (rows.length === 0) return { success: false };
  
  await pool.query(`UPDATE subscribers SET unsubscribed = TRUE WHERE unsubscribe_token = $1`, [token]);
  return { success: true, email: rows[0].email };
}

export async function getSubscriberByUnsubscribeToken(token: string): Promise<DbSubscriber | null> {
  const rows = await query<DbSubscriber>(`SELECT * FROM subscribers WHERE unsubscribe_token = $1`, [token]);
  return rows[0] || null;
}

export async function getSubscriberById(id: string): Promise<DbSubscriber | null> {
  const rows = await query<DbSubscriber>(`SELECT * FROM subscribers WHERE id = $1`, [id]);
  return rows[0] || null;
}

export async function getSubscribersByTribeId(tribeId: string): Promise<DbSubscriber[]> {
  return await query<DbSubscriber>(`SELECT * FROM subscribers WHERE tribe_id = $1 ORDER BY created_at DESC`, [tribeId]);
}

export async function removeSubscriber(id: string): Promise<void> {
  await pool.query(`DELETE FROM subscribers WHERE id = $1`, [id]);
}

export async function getSubscriberCount(tribeId: string): Promise<number> {
  const rows = await query<{ count: string }>(`SELECT COUNT(*) as count FROM subscribers WHERE tribe_id = $1`, [tribeId]);
  return Number(rows[0].count);
}

// Sent email functions
export async function createSentEmail(tribeId: string, subject: string, body: string, recipientCount: number): Promise<DbSentEmail> {
  const id = crypto.randomUUID();
  
  await pool.query(
    `INSERT INTO sent_emails (id, tribe_id, subject, body, recipient_count) VALUES ($1, $2, $3, $4, $5)`,
    [id, tribeId, subject, body, recipientCount]
  );
  
  const email = await getSentEmailById(id);
  return email!;
}

export async function getSentEmailById(id: string): Promise<DbSentEmail | null> {
  const rows = await query<DbSentEmail>(`SELECT * FROM sent_emails WHERE id = $1`, [id]);
  return rows[0] || null;
}

export async function getSentEmailsByTribeId(tribeId: string): Promise<DbSentEmail[]> {
  return await query<DbSentEmail>(`SELECT * FROM sent_emails WHERE tribe_id = $1 ORDER BY sent_at DESC`, [tribeId]);
}

export async function getTotalEmailsSent(tribeId: string): Promise<number> {
  const rows = await query<{ total: string | null }>(`SELECT COALESCE(SUM(recipient_count), 0) as total FROM sent_emails WHERE tribe_id = $1`, [tribeId]);
  return Number(rows[0].total || 0);
}
