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
      email_signature TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Add email_signature column if it doesn't exist (for existing databases)
  try {
    await query(`ALTER TABLE tribes ADD COLUMN email_signature TEXT`);
  } catch {
    // Column already exists
  }

  // Add join_description column for customizable join page
  try {
    await query(`ALTER TABLE tribes ADD COLUMN join_description TEXT`);
  } catch {
    // Column already exists
  }

  // Add subscription columns to tribes table
  try {
    await query(`ALTER TABLE tribes ADD COLUMN stripe_customer_id TEXT`);
  } catch {
    // Column already exists
  }
  try {
    await query(`ALTER TABLE tribes ADD COLUMN stripe_subscription_id TEXT`);
  } catch {
    // Column already exists
  }
  try {
    await query(`ALTER TABLE tribes ADD COLUMN subscription_status TEXT DEFAULT 'free'`);
  } catch {
    // Column already exists
  }
  try {
    await query(`ALTER TABLE tribes ADD COLUMN subscription_plan TEXT`);
  } catch {
    // Column already exists
  }
  try {
    await query(`ALTER TABLE tribes ADD COLUMN subscription_ends_at TIMESTAMP`);
  } catch {
    // Column already exists
  }

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
      open_count INTEGER DEFAULT 0,
      sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Add open_count column if it doesn't exist (for existing databases)
  try {
    await query(`ALTER TABLE sent_emails ADD COLUMN open_count INTEGER DEFAULT 0`);
  } catch {
    // Column already exists
  }

  // Add scheduled_at and status columns for scheduled emails
  try {
    await query(`ALTER TABLE sent_emails ADD COLUMN scheduled_at TIMESTAMP`);
  } catch {
    // Column already exists
  }
  try {
    await query(`ALTER TABLE sent_emails ADD COLUMN status TEXT DEFAULT 'sent'`);
  } catch {
    // Column already exists
  }
  try {
    await query(`ALTER TABLE sent_emails ADD COLUMN recipient_filter TEXT DEFAULT 'verified'`);
  } catch {
    // Column already exists
  }
  try {
    await query(`ALTER TABLE sent_emails ADD COLUMN allow_replies BOOLEAN DEFAULT true`);
  } catch {
    // Column already exists
  }

  // Email replies table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS email_replies (
      id TEXT PRIMARY KEY,
      email_id TEXT NOT NULL,
      subscriber_email TEXT NOT NULL,
      reply_text TEXT NOT NULL,
      received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Performance indexes for subscribers table
  try {
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_subscribers_tribe_verified ON subscribers(tribe_id, verified)`);
  } catch {
    // Index might already exist
  }
  try {
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_subscribers_tribe_email ON subscribers(tribe_id, email)`);
  } catch {
    // Index might already exist
  }
  try {
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_subscribers_tribe_created ON subscribers(tribe_id, created_at DESC)`);
  } catch {
    // Index might already exist
  }

  // Performance indexes for sent_emails table
  try {
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_sent_emails_tribe_sent ON sent_emails(tribe_id, sent_at DESC)`);
  } catch {
    // Index might already exist
  }

  // Performance indexes for email_replies table
  try {
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_email_replies_email ON email_replies(email_id, received_at DESC)`);
  } catch {
    // Index might already exist
  }
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
  email_signature: string | null;
  join_description: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: 'free' | 'active' | 'canceled' | 'past_due';
  subscription_plan: 'monthly' | 'yearly' | null;
  subscription_ends_at: Date | null;
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
  open_count: number;
  sent_at: Date;
  scheduled_at: Date | null;
  status: 'sent' | 'scheduled' | 'processing';
  recipient_filter: string;
  allow_replies: boolean;
}

export interface DbEmailReply {
  id: string;
  email_id: string;
  subscriber_email: string;
  reply_text: string;
  received_at: Date;
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

export async function updateTribe(id: string, updates: Partial<Pick<DbTribe, "name" | "slug" | "owner_name" | "owner_avatar" | "email_signature" | "join_description">>): Promise<void> {
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
  if (updates.email_signature !== undefined) {
    await pool.query(`UPDATE tribes SET email_signature = $1 WHERE id = $2`, [updates.email_signature, id]);
  }
  if (updates.join_description !== undefined) {
    await pool.query(`UPDATE tribes SET join_description = $1 WHERE id = $2`, [updates.join_description, id]);
  }
}

// Subscription functions
export async function updateTribeSubscription(
  tribeId: string,
  data: {
    stripe_customer_id?: string;
    stripe_subscription_id?: string;
    subscription_status?: 'free' | 'active' | 'canceled' | 'past_due';
    subscription_plan?: 'monthly' | 'yearly' | null;
    subscription_ends_at?: Date | null;
  }
): Promise<void> {
  if (data.stripe_customer_id !== undefined) {
    await pool.query(`UPDATE tribes SET stripe_customer_id = $1 WHERE id = $2`, [data.stripe_customer_id, tribeId]);
  }
  if (data.stripe_subscription_id !== undefined) {
    await pool.query(`UPDATE tribes SET stripe_subscription_id = $1 WHERE id = $2`, [data.stripe_subscription_id, tribeId]);
  }
  if (data.subscription_status !== undefined) {
    await pool.query(`UPDATE tribes SET subscription_status = $1 WHERE id = $2`, [data.subscription_status, tribeId]);
  }
  if (data.subscription_plan !== undefined) {
    await pool.query(`UPDATE tribes SET subscription_plan = $1 WHERE id = $2`, [data.subscription_plan, tribeId]);
  }
  if (data.subscription_ends_at !== undefined) {
    await pool.query(`UPDATE tribes SET subscription_ends_at = $1 WHERE id = $2`, [
      data.subscription_ends_at ? data.subscription_ends_at.toISOString() : null,
      tribeId
    ]);
  }
}

export async function getTribeByStripeCustomerId(customerId: string): Promise<DbTribe | null> {
  const rows = await query<DbTribe>(`SELECT * FROM tribes WHERE stripe_customer_id = $1`, [customerId]);
  return rows[0] || null;
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

// Add subscriber with optional pre-verification (for imports)
export async function addSubscriberBulk(
  tribeId: string, 
  email: string, 
  verified: boolean = false,
  name?: string
): Promise<DbSubscriber | null> {
  const id = crypto.randomUUID();
  const verificationToken = verified ? null : crypto.randomUUID();
  const unsubscribeToken = crypto.randomUUID();
  
  try {
    await pool.query(
      `INSERT INTO subscribers (id, tribe_id, email, name, verified, verification_token, unsubscribed, unsubscribe_token) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, tribeId, email.toLowerCase(), name || null, verified, verificationToken, false, unsubscribeToken]
    );
    return await getSubscriberById(id);
  } catch {
    // Duplicate email
    return null;
  }
}

// Check if email already exists in tribe
export async function subscriberExistsInTribe(tribeId: string, email: string): Promise<boolean> {
  const rows = await query<{ count: string }>(`SELECT COUNT(*) as count FROM subscribers WHERE tribe_id = $1 AND email = $2`, [tribeId, email.toLowerCase()]);
  return Number(rows[0].count) > 0;
}

// Get multiple existing emails in one query (for bulk checking)
export async function getExistingEmailsInTribe(tribeId: string, emails: string[]): Promise<Set<string>> {
  if (emails.length === 0) return new Set();
  
  const lowerEmails = emails.map(e => e.toLowerCase());
  const placeholders = lowerEmails.map((_, i) => `$${i + 2}`).join(', ');
  const rows = await query<{ email: string }>(
    `SELECT email FROM subscribers WHERE tribe_id = $1 AND email IN (${placeholders})`,
    [tribeId, ...lowerEmails]
  );
  return new Set(rows.map(r => r.email.toLowerCase()));
}

export async function verifySubscriber(token: string): Promise<DbSubscriber | null> {
  const rows = await query<DbSubscriber>(`SELECT * FROM subscribers WHERE verification_token = $1`, [token]);
  if (rows.length === 0) return null;
  
  await pool.query(`UPDATE subscribers SET verified = TRUE, verification_token = NULL WHERE verification_token = $1`, [token]);
  return await getSubscriberById(rows[0].id);
}

export async function getVerifiedSubscribersByTribeId(tribeId: string): Promise<DbSubscriber[]> {
  try {
    return await query<DbSubscriber>(`SELECT * FROM subscribers WHERE tribe_id = $1 AND verified = TRUE AND COALESCE(unsubscribed, FALSE) = FALSE ORDER BY created_at DESC`, [tribeId]);
  } catch {
    // Fallback if unsubscribed column doesn't exist yet
    return await query<DbSubscriber>(`SELECT * FROM subscribers WHERE tribe_id = $1 AND verified = TRUE ORDER BY created_at DESC`, [tribeId]);
  }
}

export async function getVerifiedSubscriberCount(tribeId: string): Promise<number> {
  try {
    const rows = await query<{ count: string }>(`SELECT COUNT(*) as count FROM subscribers WHERE tribe_id = $1 AND verified = TRUE AND COALESCE(unsubscribed, FALSE) = FALSE`, [tribeId]);
    return Number(rows[0].count);
  } catch {
    // Fallback if unsubscribed column doesn't exist yet
    const rows = await query<{ count: string }>(`SELECT COUNT(*) as count FROM subscribers WHERE tribe_id = $1 AND verified = TRUE`, [tribeId]);
    return Number(rows[0].count);
  }
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

export async function getSubscriberByEmailAndTribe(email: string, tribeId: string): Promise<DbSubscriber | null> {
  const rows = await query<DbSubscriber>(
    `SELECT * FROM subscribers WHERE LOWER(email) = LOWER($1) AND tribe_id = $2`,
    [email, tribeId]
  );
  return rows[0] || null;
}

export async function getSubscribersByTribeId(tribeId: string): Promise<DbSubscriber[]> {
  const rows = await query<DbSubscriber>(`SELECT * FROM subscribers WHERE tribe_id = $1 ORDER BY created_at DESC`, [tribeId]);
  // Ensure unsubscribed field has a default value
  return rows.map(r => ({ ...r, unsubscribed: r.unsubscribed ?? false, unsubscribe_token: r.unsubscribe_token ?? null }));
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
    `INSERT INTO sent_emails (id, tribe_id, subject, body, recipient_count, status) VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, tribeId, subject, body, recipientCount, 'sent']
  );
  
  const email = await getSentEmailById(id);
  return email!;
}

export async function createScheduledEmail(
  tribeId: string, 
  subject: string, 
  body: string, 
  scheduledAt: Date,
  recipientFilter: string,
  allowReplies: boolean = true
): Promise<DbSentEmail> {
  const id = crypto.randomUUID();
  
  await pool.query(
    `INSERT INTO sent_emails (id, tribe_id, subject, body, recipient_count, scheduled_at, status, recipient_filter, allow_replies) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [id, tribeId, subject, body, 0, scheduledAt.toISOString(), 'scheduled', recipientFilter, allowReplies]
  );
  
  const email = await getSentEmailById(id);
  return email!;
}

export async function getScheduledEmailsToSend(): Promise<DbSentEmail[]> {
  const now = new Date().toISOString();
  return await query<DbSentEmail>(
    `SELECT * FROM sent_emails WHERE status = 'scheduled' AND scheduled_at <= $1 ORDER BY scheduled_at ASC`,
    [now]
  );
}

export async function updateScheduledEmailStatus(id: string, status: 'sent' | 'processing', recipientCount?: number): Promise<void> {
  if (recipientCount !== undefined) {
    await pool.query(
      `UPDATE sent_emails SET status = $1, recipient_count = $2, sent_at = CURRENT_TIMESTAMP WHERE id = $3`,
      [status, recipientCount, id]
    );
  } else {
    await pool.query(
      `UPDATE sent_emails SET status = $1 WHERE id = $2`,
      [status, id]
    );
  }
}

export async function getSentEmailById(id: string): Promise<DbSentEmail | null> {
  const rows = await query<DbSentEmail>(`SELECT * FROM sent_emails WHERE id = $1`, [id]);
  return rows[0] || null;
}

export async function incrementEmailOpenCount(emailId: string): Promise<void> {
  await query(`UPDATE sent_emails SET open_count = COALESCE(open_count, 0) + 1 WHERE id = $1`, [emailId]);
}

export async function updateSentEmailRecipientCount(emailId: string, recipientCount: number): Promise<void> {
  await query(`UPDATE sent_emails SET recipient_count = $1 WHERE id = $2`, [recipientCount, emailId]);
}

export async function getSentEmailsByTribeId(tribeId: string): Promise<DbSentEmail[]> {
  return await query<DbSentEmail>(`SELECT * FROM sent_emails WHERE tribe_id = $1 ORDER BY sent_at DESC`, [tribeId]);
}

export async function deleteSentEmail(emailId: string, tribeId: string): Promise<boolean> {
  // Delete email only if it belongs to the tribe (security check)
  const result = await pool.query(
    `DELETE FROM sent_emails WHERE id = $1 AND tribe_id = $2`,
    [emailId, tribeId]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function getTotalEmailsSent(tribeId: string): Promise<number> {
  const rows = await query<{ total: string | null }>(`SELECT COALESCE(SUM(recipient_count), 0) as total FROM sent_emails WHERE tribe_id = $1`, [tribeId]);
  return Number(rows[0].total || 0);
}

// Email reply functions
export async function createEmailReply(
  emailId: string,
  subscriberEmail: string,
  replyText: string
): Promise<DbEmailReply> {
  const id = crypto.randomUUID();
  
  await pool.query(
    `INSERT INTO email_replies (id, email_id, subscriber_email, reply_text) VALUES ($1, $2, $3, $4)`,
    [id, emailId, subscriberEmail.toLowerCase(), replyText]
  );
  
  const reply = await getEmailReplyById(id);
  return reply!;
}

export async function getEmailReplyById(id: string): Promise<DbEmailReply | null> {
  const rows = await query<DbEmailReply>(`SELECT * FROM email_replies WHERE id = $1`, [id]);
  return rows[0] || null;
}

export async function getEmailRepliesByEmailId(emailId: string): Promise<DbEmailReply[]> {
  return await query<DbEmailReply>(
    `SELECT * FROM email_replies WHERE email_id = $1 ORDER BY received_at DESC`,
    [emailId]
  );
}

export async function getReplyCountByEmailId(emailId: string): Promise<number> {
  const rows = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM email_replies WHERE email_id = $1`,
    [emailId]
  );
  return Number(rows[0].count);
}

// Get total reply count for a tribe within a time period
export async function getTribeReplyCount(tribeId: string, since?: Date): Promise<number> {
  if (since) {
    const rows = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM email_replies er 
       INNER JOIN sent_emails se ON er.email_id = se.id 
       WHERE se.tribe_id = $1 AND er.received_at >= $2`,
      [tribeId, since.toISOString()]
    );
    return Number(rows[0].count);
  }
  const rows = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM email_replies er 
     INNER JOIN sent_emails se ON er.email_id = se.id 
     WHERE se.tribe_id = $1`,
    [tribeId]
  );
  return Number(rows[0].count);
}

// Get daily subscriber counts for chart
export async function getDailySubscriberCounts(tribeId: string, days: number): Promise<{ date: string; count: number }[]> {
  const results: { date: string; count: number }[] = [];
  const now = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(23, 59, 59, 999);
    
    // Count subscribers created on or before this date
    const rows = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM subscribers WHERE tribe_id = $1 AND created_at <= $2`,
      [tribeId, date.toISOString()]
    );
    
    results.push({
      date: date.toISOString().split('T')[0],
      count: Number(rows[0].count),
    });
  }
  
  return results;
}

// Get hourly subscriber counts for 24h chart
export async function getHourlySubscriberCounts(tribeId: string): Promise<{ hour: string; count: number }[]> {
  const results: { hour: string; count: number }[] = [];
  const now = new Date();
  
  for (let i = 23; i >= 0; i--) {
    const date = new Date(now);
    date.setHours(date.getHours() - i, 59, 59, 999);
    
    // Count subscribers created on or before this hour
    const rows = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM subscribers WHERE tribe_id = $1 AND created_at <= $2`,
      [tribeId, date.toISOString()]
    );
    
    results.push({
      hour: date.toISOString(),
      count: Number(rows[0].count),
    });
  }
  
  return results;
}

// Get subscriber count at a specific point in time
export async function getSubscriberCountSince(tribeId: string, since: Date): Promise<number> {
  const rows = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM subscribers WHERE tribe_id = $1 AND created_at >= $2`,
    [tribeId, since.toISOString()]
  );
  return Number(rows[0].count);
}

// Get emails sent since a date
export async function getEmailsSentSince(tribeId: string, since: Date): Promise<number> {
  const rows = await query<{ total: string }>(
    `SELECT COALESCE(SUM(recipient_count), 0) as total FROM sent_emails WHERE tribe_id = $1 AND sent_at >= $2`,
    [tribeId, since.toISOString()]
  );
  return Number(rows[0].total);
}

// Get open rate for emails sent since a date
export async function getOpenRateSince(tribeId: string, since: Date): Promise<{ opens: number; sent: number }> {
  const rows = await query<{ opens: string; sent: string }>(
    `SELECT COALESCE(SUM(open_count), 0) as opens, COALESCE(SUM(recipient_count), 0) as sent 
     FROM sent_emails WHERE tribe_id = $1 AND sent_at >= $2`,
    [tribeId, since.toISOString()]
  );
  return {
    opens: Number(rows[0].opens),
    sent: Number(rows[0].sent),
  };
}
