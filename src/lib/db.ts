import { sql } from "@vercel/postgres";
import bcrypt from "bcryptjs";

// Initialize tables (run once on first deploy)
export async function initDatabase() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS tribes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      owner_name TEXT,
      owner_avatar TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS subscribers (
      id TEXT PRIMARY KEY,
      tribe_id TEXT NOT NULL REFERENCES tribes(id),
      email TEXT NOT NULL,
      name TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(tribe_id, email)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS sent_emails (
      id TEXT PRIMARY KEY,
      tribe_id TEXT NOT NULL REFERENCES tribes(id),
      subject TEXT,
      body TEXT,
      recipient_count INTEGER DEFAULT 0,
      sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
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
  
  await sql`
    INSERT INTO users (id, email, password, name)
    VALUES (${id}, ${email.toLowerCase()}, ${hashedPassword}, ${name || null})
  `;
  
  const user = await getUserById(id);
  return user!;
}

export async function getUserByEmail(email: string): Promise<DbUser | null> {
  const { rows } = await sql`SELECT * FROM users WHERE email = ${email.toLowerCase()}`;
  return rows[0] as DbUser || null;
}

export async function getUserById(id: string): Promise<DbUser | null> {
  const { rows } = await sql`SELECT * FROM users WHERE id = ${id}`;
  return rows[0] as DbUser || null;
}

export function verifyPassword(password: string, hashedPassword: string): boolean {
  return bcrypt.compareSync(password, hashedPassword);
}

// Tribe functions
export async function createTribe(userId: string, name: string, slug: string, ownerName?: string): Promise<DbTribe> {
  const id = crypto.randomUUID();
  
  await sql`
    INSERT INTO tribes (id, user_id, name, slug, owner_name)
    VALUES (${id}, ${userId}, ${name}, ${slug.toLowerCase()}, ${ownerName || null})
  `;
  
  const tribe = await getTribeById(id);
  return tribe!;
}

export async function getTribeById(id: string): Promise<DbTribe | null> {
  const { rows } = await sql`SELECT * FROM tribes WHERE id = ${id}`;
  return rows[0] as DbTribe || null;
}

export async function getTribeBySlug(slug: string): Promise<DbTribe | null> {
  const { rows } = await sql`SELECT * FROM tribes WHERE slug = ${slug.toLowerCase()}`;
  return rows[0] as DbTribe || null;
}

export async function getTribeByUserId(userId: string): Promise<DbTribe | null> {
  const { rows } = await sql`SELECT * FROM tribes WHERE user_id = ${userId} LIMIT 1`;
  return rows[0] as DbTribe || null;
}

export async function updateTribe(id: string, updates: Partial<Pick<DbTribe, "name" | "slug" | "owner_name" | "owner_avatar">>): Promise<void> {
  if (updates.name !== undefined) {
    await sql`UPDATE tribes SET name = ${updates.name} WHERE id = ${id}`;
  }
  if (updates.slug !== undefined) {
    await sql`UPDATE tribes SET slug = ${updates.slug.toLowerCase()} WHERE id = ${id}`;
  }
  if (updates.owner_name !== undefined) {
    await sql`UPDATE tribes SET owner_name = ${updates.owner_name} WHERE id = ${id}`;
  }
  if (updates.owner_avatar !== undefined) {
    await sql`UPDATE tribes SET owner_avatar = ${updates.owner_avatar} WHERE id = ${id}`;
  }
}

// Subscriber functions
export async function addSubscriber(tribeId: string, email: string, name?: string): Promise<DbSubscriber | null> {
  const id = crypto.randomUUID();
  
  try {
    await sql`
      INSERT INTO subscribers (id, tribe_id, email, name)
      VALUES (${id}, ${tribeId}, ${email.toLowerCase()}, ${name || null})
    `;
    return await getSubscriberById(id);
  } catch {
    // Duplicate email
    return null;
  }
}

export async function getSubscriberById(id: string): Promise<DbSubscriber | null> {
  const { rows } = await sql`SELECT * FROM subscribers WHERE id = ${id}`;
  return rows[0] as DbSubscriber || null;
}

export async function getSubscribersByTribeId(tribeId: string): Promise<DbSubscriber[]> {
  const { rows } = await sql`SELECT * FROM subscribers WHERE tribe_id = ${tribeId} ORDER BY created_at DESC`;
  return rows as DbSubscriber[];
}

export async function removeSubscriber(id: string): Promise<void> {
  await sql`DELETE FROM subscribers WHERE id = ${id}`;
}

export async function getSubscriberCount(tribeId: string): Promise<number> {
  const { rows } = await sql`SELECT COUNT(*) as count FROM subscribers WHERE tribe_id = ${tribeId}`;
  return Number(rows[0].count);
}

// Sent email functions
export async function createSentEmail(tribeId: string, subject: string, body: string, recipientCount: number): Promise<DbSentEmail> {
  const id = crypto.randomUUID();
  
  await sql`
    INSERT INTO sent_emails (id, tribe_id, subject, body, recipient_count)
    VALUES (${id}, ${tribeId}, ${subject}, ${body}, ${recipientCount})
  `;
  
  const email = await getSentEmailById(id);
  return email!;
}

export async function getSentEmailById(id: string): Promise<DbSentEmail | null> {
  const { rows } = await sql`SELECT * FROM sent_emails WHERE id = ${id}`;
  return rows[0] as DbSentEmail || null;
}

export async function getSentEmailsByTribeId(tribeId: string): Promise<DbSentEmail[]> {
  const { rows } = await sql`SELECT * FROM sent_emails WHERE tribe_id = ${tribeId} ORDER BY sent_at DESC`;
  return rows as DbSentEmail[];
}

export async function getTotalEmailsSent(tribeId: string): Promise<number> {
  const { rows } = await sql`SELECT COALESCE(SUM(recipient_count), 0) as total FROM sent_emails WHERE tribe_id = ${tribeId}`;
  return Number(rows[0].total);
}
