"use server";

import { auth } from "./auth";
import type {
  SubscriberFilter,
  SubscriberSort,
  PaginatedSubscribersResult,
  ImportPreviewResult,
  PaginatedRepliesResult,
  RecipientFilter,
  SubscriptionStatus,
  WeeklyEmailStatus,
  TimePeriod,
  Gift,
} from "./types";
import { MAX_GIFTS } from "./types";
import {
  pool,
  getTribeByUserId,
  getTribeBySlug,
  updateTribe,
  getVerifiedSubscribersByTribeId,
  getSubscribersByTribeId,
  getSubscriberById,
  addSubscriber as dbAddSubscriber,
  addSubscriberBulk as dbAddSubscriberBulk,
  getExistingEmailsInTribe,
  subscriberExistsInTribe,
  removeSubscriber as dbRemoveSubscriber,
  getVerifiedSubscriberCount,
  getSentEmailsByTribeId,
  createSentEmail,
  createScheduledEmail,
  getTotalEmailsSent,
  updateSentEmailRecipientCount,
  getEmailRepliesByEmailId,
  getTribeReplyCount,
  getDailySubscriberCounts,
  getHourlySubscriberCounts,
  getSubscriberCountSince,
  getEmailsSentSince,
  getOpenRateSince,
  deleteSentEmail as dbDeleteSentEmail,
  getGiftsByTribeId,
  getGiftCountByTribeId,
  deleteGift as dbDeleteGift,
} from "./db";
import { sendVerificationEmail, sendBulkEmailWithUnsubscribe, sendTestEmail } from "./email";
import { revalidatePath } from "next/cache";

async function getTribe() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  const tribe = await getTribeByUserId(session.user.id);
  if (!tribe) {
    throw new Error("Tribe not found");
  }
  return tribe;
}

// Default join page description
const DEFAULT_JOIN_DESCRIPTION = "A tribe is a group of people who choose to follow your work, support your ideas, and stay connected.";

// Tribe actions
export async function getTribeSettings() {
  const tribe = await getTribe();
  return {
    id: tribe.id,
    name: tribe.name,
    slug: tribe.slug,
    ownerName: tribe.owner_name || "Anonymous",
    ownerAvatar: tribe.owner_avatar,
    emailSignature: tribe.email_signature || "",
    joinDescription: tribe.join_description || DEFAULT_JOIN_DESCRIPTION,
  };
}

export async function updateTribeSettings(data: {
  name?: string;
  slug?: string;
  ownerName?: string;
  ownerAvatar?: string;
  emailSignature?: string;
  joinDescription?: string;
}) {
  const tribe = await getTribe();
  
  if (data.slug && data.slug !== tribe.slug) {
    const existing = await getTribeBySlug(data.slug);
    if (existing && existing.id !== tribe.id) {
      throw new Error("Slug already taken");
    }
  }
  
  await updateTribe(tribe.id, {
    name: data.name,
    slug: data.slug,
    owner_name: data.ownerName,
    owner_avatar: data.ownerAvatar,
    email_signature: data.emailSignature,
    join_description: data.joinDescription,
  });
  
  revalidatePath("/settings");
  revalidatePath("/join");
  revalidatePath("/j/[slug]", "page");
}

// Get join page data (for public join page)
export async function getJoinPageData(slug: string) {
  const tribe = await getTribeBySlug(slug);
  if (!tribe) return null;
  
  return {
    name: tribe.name,
    ownerName: tribe.owner_name || "Anonymous",
    ownerAvatar: tribe.owner_avatar,
    description: tribe.join_description || DEFAULT_JOIN_DESCRIPTION,
  };
}

// Subscriber actions
export async function getSubscribers() {
  const tribe = await getTribe();
  // Return all subscribers (verified and unverified)
  const subscribers = await getSubscribersByTribeId(tribe.id);
  // Convert Date to string for frontend
  return subscribers.map(s => ({
    id: s.id,
    email: s.email,
    name: s.name,
    verified: s.verified,
    verification_token: s.verification_token,
    created_at: s.created_at instanceof Date ? s.created_at.toISOString() : String(s.created_at),
  }));
}

// Paginated subscriber list with server-side filtering/sorting
// Types imported from ./types

export async function getSubscribersPaginated(
  page: number = 1,
  pageSize: number = 50,
  filter: SubscriberFilter = "all",
  sort: SubscriberSort = "newest",
  search: string = ""
): Promise<PaginatedSubscribersResult> {
  const tribe = await getTribe();
  
  // Build WHERE clause
  let whereClause = "WHERE tribe_id = $1";
  const params: (string | number)[] = [tribe.id];
  let paramIndex = 2;
  
  if (filter === "verified") {
    whereClause += " AND verified = true";
  } else if (filter === "non-verified") {
    whereClause += " AND verified = false";
  }
  
  if (search.trim()) {
    whereClause += ` AND email ILIKE $${paramIndex}`;
    params.push(`%${search.trim()}%`);
    paramIndex++;
  }
  
  // Build ORDER BY clause
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
  
  // Get total counts
  const countQuery = `SELECT COUNT(*) as count FROM subscribers WHERE tribe_id = $1`;
  const countResult = await pool.query(countQuery, [tribe.id]);
  const total = parseInt(countResult.rows[0].count, 10);
  
  const verifiedCountQuery = `SELECT COUNT(*) as count FROM subscribers WHERE tribe_id = $1 AND verified = true`;
  const verifiedResult = await pool.query(verifiedCountQuery, [tribe.id]);
  const totalVerified = parseInt(verifiedResult.rows[0].count, 10);
  
  const totalNonVerified = total - totalVerified;
  
  // Get filtered count for pagination
  const filteredCountQuery = `SELECT COUNT(*) as count FROM subscribers ${whereClause}`;
  const filteredCountResult = await pool.query(filteredCountQuery, params);
  const filteredTotal = parseInt(filteredCountResult.rows[0].count, 10);
  
  const totalPages = Math.max(1, Math.ceil(filteredTotal / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const offset = (safePage - 1) * pageSize;
  
  // Get paginated results
  const dataQuery = `
    SELECT id, email, name, verified, created_at 
    FROM subscribers 
    ${whereClause} 
    ${orderClause} 
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  params.push(pageSize, offset);
  
  const result = await pool.query(dataQuery, params);
  
  return {
    subscribers: result.rows.map((s: { id: string; email: string; name: string | null; verified: boolean; created_at: Date | string }) => ({
      id: s.id,
      email: s.email,
      name: s.name,
      verified: s.verified,
      created_at: s.created_at instanceof Date ? s.created_at.toISOString() : String(s.created_at),
    })),
    total,
    totalVerified,
    totalNonVerified,
    page: safePage,
    pageSize,
    totalPages,
  };
}

export async function addSubscriber(email: string, name?: string) {
  const tribe = await getTribe();
  const result = await dbAddSubscriber(tribe.id, email, name);
  revalidatePath("/tribe");
  revalidatePath("/dashboard");
  return result;
}

// Add a subscriber manually (sends verification email)
export async function addSubscriberManually(email: string): Promise<{ success: boolean; error?: string }> {
  const tribe = await getTribe();
  
  // Validate email format
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const normalizedEmail = email.trim().toLowerCase();
  
  if (!emailPattern.test(normalizedEmail)) {
    return { success: false, error: "Invalid email format" };
  }
  
  // Check if already exists
  const exists = await subscriberExistsInTribe(tribe.id, normalizedEmail);
  if (exists) {
    return { success: false, error: "Email already exists in your tribe" };
  }
  
  // Add as non-verified (will have verification token)
  const result = await dbAddSubscriber(tribe.id, normalizedEmail);
  if (!result) {
    return { success: false, error: "Failed to add subscriber" };
  }
  
  // Send verification email
  try {
    if (result.verification_token) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://madewithtribe.com";
      await sendVerificationEmail(
        normalizedEmail,
        tribe.name,
        tribe.owner_name || "Someone",
        result.verification_token,
        baseUrl
      );
    }
  } catch (emailError) {
    console.error("Failed to send verification email:", emailError);
    // Still return success since subscriber was added, just note the email issue
    revalidatePath("/tribe");
    revalidatePath("/dashboard");
    return { success: true, error: "Added but verification email failed to send" };
  }
  
  revalidatePath("/tribe");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function removeSubscriber(id: string) {
  const tribe = await getTribe();
  
  // Verify subscriber belongs to this tribe before deletion (prevents IDOR)
  const subscriber = await getSubscriberById(id);
  if (!subscriber || subscriber.tribe_id !== tribe.id) {
    throw new Error("Subscriber not found");
  }
  
  await dbRemoveSubscriber(id);
  revalidatePath("/tribe");
  revalidatePath("/dashboard");
}

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim().toLowerCase());
}

// ImportPreviewResult imported from ./types

// Preview import - returns counts and valid emails without adding them
export async function previewImport(rawEmails: string[]): Promise<ImportPreviewResult> {
  const tribe = await getTribe();
  
  // Parse and deduplicate emails from input
  const allParsed: string[] = [];
  const seen = new Set<string>();
  
  for (const email of rawEmails) {
    const trimmed = email.trim().toLowerCase();
    if (trimmed && !seen.has(trimmed)) {
      seen.add(trimmed);
      allParsed.push(trimmed);
    }
  }
  
  const totalInFile = allParsed.length;
  
  // Separate valid and invalid emails
  const validEmails: string[] = [];
  const invalidEmails: string[] = [];
  
  for (const email of allParsed) {
    if (isValidEmail(email)) {
      validEmails.push(email);
    } else {
      invalidEmails.push(email);
    }
  }
  
  // Check for existing emails in tribe (duplicates)
  const existingEmails = await getExistingEmailsInTribe(tribe.id, validEmails);
  
  const newEmails: string[] = [];
  const duplicateEmails: string[] = [];
  
  for (const email of validEmails) {
    if (existingEmails.has(email)) {
      duplicateEmails.push(email);
    } else {
      newEmails.push(email);
    }
  }
  
  return {
    totalInFile,
    duplicates: duplicateEmails.length,
    invalid: invalidEmails.length,
    toImport: newEmails.length,
    emails: newEmails,
    invalidEmails,
    duplicateEmails,
  };
}

// Import subscribers with or without auto-verification
export async function importSubscribers(
  emails: string[], 
  sendVerification: boolean = false
): Promise<{ added: number; errors: string[] }> {
  const tribe = await getTribe();
  let added = 0;
  const errors: string[] = [];
  
  // Get base URL for verification emails
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://madewithtribe.com";
  
  for (const email of emails) {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !isValidEmail(trimmed)) continue;
    
    try {
      // Add subscriber - verified = true if NOT sending verification (they're pre-verified)
      // verified = false if sending verification (they need to click the link)
      const result = await dbAddSubscriberBulk(tribe.id, trimmed, !sendVerification);
      
      if (result) {
        added++;
        
        // Send verification email if requested and subscriber was added
        if (sendVerification && result.verification_token) {
          try {
            await sendVerificationEmail(
              trimmed,
              tribe.name,
              tribe.owner_name || "Anonymous",
              result.verification_token,
              baseUrl
            );
          } catch (emailError) {
            console.error(`Failed to send verification to ${trimmed}:`, emailError);
            errors.push(`Failed to send verification to ${trimmed}`);
          }
        }
      }
    } catch (error) {
      console.error(`Failed to add ${trimmed}:`, error);
      errors.push(`Failed to add ${trimmed}`);
    }
  }
  
  revalidatePath("/tribe");
  revalidatePath("/dashboard");
  return { added, errors };
}

export async function exportSubscribers() {
  const tribe = await getTribe();
  const subscribers = await getSubscribersByTribeId(tribe.id);
  return subscribers.map(s => s.email).join("\n");
}

// Email actions
export async function getSentEmails() {
  const tribe = await getTribe();
  const emails = await getSentEmailsByTribeId(tribe.id);
  // Convert Date to string for frontend
  return emails.map(e => ({
    ...e,
    sent_at: e.sent_at instanceof Date ? e.sent_at.toISOString() : String(e.sent_at),
  }));
}

export async function deleteSentEmail(emailId: string) {
  const tribe = await getTribe();
  const deleted = await dbDeleteSentEmail(emailId, tribe.id);
  if (!deleted) {
    throw new Error("Email not found or already deleted");
  }
  revalidatePath("/dashboard");
  return { success: true };
}

export async function getSentEmailById(emailId: string) {
  const tribe = await getTribe();
  const emails = await getSentEmailsByTribeId(tribe.id);
  const email = emails.find(e => e.id === emailId);
  if (!email) {
    throw new Error("Email not found");
  }
  // Convert Date to string for frontend
  return {
    ...email,
    sent_at: email.sent_at instanceof Date ? email.sent_at.toISOString() : String(email.sent_at),
  };
}

export async function getEmailReplies(emailId: string) {
  // First verify the user owns this email
  const tribe = await getTribe();
  const emails = await getSentEmailsByTribeId(tribe.id);
  const email = emails.find(e => e.id === emailId);
  if (!email) {
    throw new Error("Email not found");
  }
  
  const replies = await getEmailRepliesByEmailId(emailId);
  
  // Convert dates to strings for frontend
  return replies.map(reply => ({
    ...reply,
    received_at: reply.received_at instanceof Date 
      ? reply.received_at.toISOString() 
      : String(reply.received_at),
  }));
}

// Paginated version of getEmailReplies
// PaginatedRepliesResult imported from ./types

export async function getEmailRepliesPaginated(
  emailId: string,
  page: number = 1,
  pageSize: number = 10
): Promise<PaginatedRepliesResult> {
  // First verify the user owns this email
  const tribe = await getTribe();
  const emails = await getSentEmailsByTribeId(tribe.id);
  const email = emails.find(e => e.id === emailId);
  if (!email) {
    throw new Error("Email not found");
  }
  
  // Get total count
  const countResult = await pool.query(
    `SELECT COUNT(*) as count FROM email_replies WHERE email_id = $1`,
    [emailId]
  );
  const total = parseInt(countResult.rows[0].count, 10);
  
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const offset = (safePage - 1) * pageSize;
  
  // Get paginated replies
  const result = await pool.query(
    `SELECT * FROM email_replies WHERE email_id = $1 ORDER BY received_at DESC LIMIT $2 OFFSET $3`,
    [emailId, pageSize, offset]
  );
  
  return {
    replies: result.rows.map((reply: { id: string; email_id: string; subscriber_email: string; reply_text: string; received_at: Date | string }) => ({
      id: reply.id,
      email_id: reply.email_id,
      subscriber_email: reply.subscriber_email,
      reply_text: reply.reply_text,
      received_at: reply.received_at instanceof Date 
        ? reply.received_at.toISOString() 
        : String(reply.received_at),
    })),
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}

// RecipientFilter imported from ./types

export async function getEmailSignature(): Promise<string> {
  const tribe = await getTribe();
  return tribe.email_signature || "";
}

// SubscriptionStatus imported from ./types

export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  const tribe = await getTribe();
  
  const status = (tribe.subscription_status || 'free') as 'free' | 'active' | 'canceled' | 'past_due';
  const plan = tribe.subscription_plan as 'monthly' | 'yearly' | null;
  
  // Handle subscription_ends_at safely - it could be Date, string, or null
  let endsAt: string | null = null;
  if (tribe.subscription_ends_at) {
    try {
      const date = tribe.subscription_ends_at instanceof Date 
        ? tribe.subscription_ends_at 
        : new Date(tribe.subscription_ends_at);
      if (!isNaN(date.getTime())) {
        endsAt = date.toISOString();
      }
    } catch {
      console.error("Invalid subscription_ends_at date:", tribe.subscription_ends_at);
    }
  }
  
  // User can send emails if they have an active subscription
  // or if their subscription is canceled but hasn't ended yet
  let canSendEmails = false;
  if (status === 'active') {
    canSendEmails = true;
  } else if (status === 'canceled' && endsAt) {
    canSendEmails = new Date(endsAt) > new Date();
  }
  
  return {
    status,
    plan,
    endsAt,
    canSendEmails,
  };
}

// Weekly email limit for premium users
const WEEKLY_EMAIL_LIMIT = 2;

// WeeklyEmailStatus imported from ./types

export async function getWeeklyEmailStatus(): Promise<WeeklyEmailStatus> {
  const tribe = await getTribe();
  
  // Get start of current week (Monday 00:00:00 UTC)
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday is 0, so it's 6 days from Monday
  const startOfWeek = new Date(now);
  startOfWeek.setUTCDate(now.getUTCDate() - daysFromMonday);
  startOfWeek.setUTCHours(0, 0, 0, 0);
  
  // Get next Monday
  const nextMonday = new Date(startOfWeek);
  nextMonday.setUTCDate(startOfWeek.getUTCDate() + 7);
  
  // Count sent emails this week (only actual sends to tribe, not scheduled)
  const result = await pool.query(
    `SELECT COUNT(*) FROM sent_emails 
     WHERE tribe_id = $1 
     AND status = 'sent' 
     AND sent_at >= $2`,
    [tribe.id, startOfWeek.toISOString()]
  );
  
  const emailsSentThisWeek = parseInt(result.rows[0].count) || 0;
  
  return {
    emailsSentThisWeek,
    limit: WEEKLY_EMAIL_LIMIT,
    canSendEmail: emailsSentThisWeek < WEEKLY_EMAIL_LIMIT,
    nextResetDate: nextMonday.toISOString(),
  };
}

export async function getRecipientCounts(): Promise<{
  verified: number;
  nonVerified: number;
  all: number;
}> {
  const tribe = await getTribe();
  const allSubscribers = await getSubscribersByTribeId(tribe.id);
  const verified = allSubscribers.filter(s => s.verified).length;
  const nonVerified = allSubscribers.filter(s => !s.verified).length;
  return {
    verified,
    nonVerified,
    all: allSubscribers.length,
  };
}

// Send a test email to preview how the email will look
export async function sendTestEmailAction(
  testEmail: string,
  subject: string,
  body: string,
  allowReplies: boolean = true
): Promise<{ success: boolean; error?: string }> {
  const tribe = await getTribe();
  
  // Use tribe settings for owner name and signature
  const ownerName = tribe.owner_name || "Anonymous";
  const emailSignature = tribe.email_signature || undefined;
  
  const result = await sendTestEmail(
    testEmail,
    subject,
    body,
    ownerName,
    emailSignature,
    allowReplies
  );
  
  return result;
}

export async function sendEmail(
  subject: string, 
  body: string, 
  filter: RecipientFilter = "verified",
  allowReplies: boolean = true
) {
  const tribe = await getTribe();
  const allSubscribers = await getSubscribersByTribeId(tribe.id);
  
  // Filter recipients based on selection AND exclude unsubscribed
  let filteredSubscribers = allSubscribers.filter(s => !s.unsubscribed);
  
  switch (filter) {
    case "verified":
      filteredSubscribers = filteredSubscribers.filter(s => s.verified);
      break;
    case "non-verified":
      filteredSubscribers = filteredSubscribers.filter(s => !s.verified);
      break;
    case "all":
      // Keep all non-unsubscribed
      break;
  }

  if (filteredSubscribers.length === 0) {
    throw new Error("No recipients to send to");
  }

  // Get base URL from environment or default
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://madewithtribe.com";
  const ownerName = tribe.owner_name || 'Anonymous';
  const escapedBody = body.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const emailSignature = tribe.email_signature || '';

  // Create email record FIRST to get the emailId for tracking pixel
  const email = await createSentEmail(tribe.id, subject, body, 0);
  console.log(`Created email record with id: ${email.id}, allowReplies: ${allowReplies}`);

  // Send emails with personalized unsubscribe links and tracking pixel
  const result = await sendBulkEmailWithUnsubscribe(
    filteredSubscribers.map(s => ({ email: s.email, unsubscribeToken: s.unsubscribe_token || '' })),
    subject,
    escapedBody,
    body,
    ownerName,
    baseUrl,
    email.id, // Pass emailId for open tracking
    emailSignature, // Pass email signature
    allowReplies // Pass allowReplies flag
  );
  
  if (!result.success && result.sentCount === 0) {
    throw new Error(`Failed to send emails: ${result.errors.join(", ")}`);
  }

  // Update the recipient count after sending
  await updateSentEmailRecipientCount(email.id, result.sentCount);
  
  revalidatePath("/new-email");
  revalidatePath("/dashboard");
  
  return { 
    ...email, 
    sentCount: result.sentCount,
    totalRecipients: filteredSubscribers.length,
    errors: result.errors 
  };
}

// Schedule email for later
export async function scheduleEmail(
  subject: string,
  body: string,
  scheduledAt: Date,
  filter: RecipientFilter = "verified",
  allowReplies: boolean = true
) {
  const tribe = await getTribe();
  const allSubscribers = await getSubscribersByTribeId(tribe.id);
  
  // Calculate recipient count for preview (same logic as sendEmail)
  let filteredSubscribers = allSubscribers.filter(s => !s.unsubscribed);
  
  switch (filter) {
    case "verified":
      filteredSubscribers = filteredSubscribers.filter(s => s.verified);
      break;
    case "non-verified":
      filteredSubscribers = filteredSubscribers.filter(s => !s.verified);
      break;
    case "all":
      break;
  }

  if (filteredSubscribers.length === 0) {
    throw new Error("No recipients to send to");
  }

  // Create scheduled email record
  const email = await createScheduledEmail(tribe.id, subject, body, scheduledAt, filter, allowReplies);
  
  revalidatePath("/new-email");
  revalidatePath("/dashboard");
  
  return {
    id: email.id,
    scheduledAt: email.scheduled_at,
    recipientCount: filteredSubscribers.length,
  };
}

// Dashboard stats
// TimePeriod imported from ./types

export async function getDashboardStats(period: TimePeriod = "7d") {
  const tribe = await getTribe();
  
  // Calculate time boundaries based on period
  const now = new Date();
  let since: Date;
  let chartDays: number;
  
  switch (period) {
    case "24h":
      since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      chartDays = 24; // Show hourly for 24h (we'll show daily points still)
      break;
    case "30d":
      since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      chartDays = 30;
      break;
    case "7d":
    default:
      since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      chartDays = 7;
  }

  // Get all subscribers for total count
  const subscribers = await getSubscribersByTribeId(tribe.id);
  const totalSubscribers = subscribers.length;
  
  // Get period-specific stats
  const periodSubscribers = await getSubscriberCountSince(tribe.id, since);
  const periodEmailsSent = await getEmailsSentSince(tribe.id, since);
  const periodOpenStats = await getOpenRateSince(tribe.id, since);
  const periodReplies = await getTribeReplyCount(tribe.id, since);
  
  // Calculate open rate for the period
  const openRate = periodOpenStats.sent > 0 
    ? Math.round((periodOpenStats.opens / periodOpenStats.sent) * 100 * 10) / 10 
    : 0;

  // Get total stats
  const totalEmailsSent = await getTotalEmailsSent(tribe.id);
  const totalReplies = await getTribeReplyCount(tribe.id);
  
  // Get chart data - hourly for 24h, daily for 7d/30d
  let chartCounts: number[];
  let chartLabels: string[];
  
  if (period === "24h") {
    const hourlyData = await getHourlySubscriberCounts(tribe.id);
    chartCounts = hourlyData.map(d => d.count);
    chartLabels = hourlyData.map(d => {
      const date = new Date(d.hour);
      const hours = date.getHours();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const hour12 = hours % 12 || 12;
      return `${hour12}${ampm}`;
    });
  } else {
    const dailyData = await getDailySubscriberCounts(tribe.id, chartDays);
    chartCounts = dailyData.map(d => d.count);
    chartLabels = dailyData.map(d => {
      const date = new Date(d.date);
      if (period === "7d") {
        return date.toLocaleDateString('en-US', { weekday: 'short' });
      }
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
  }

  // Get sent emails count in period
  const sentEmails = await getSentEmailsByTribeId(tribe.id);
  const periodCampaigns = sentEmails.filter(e => new Date(e.sent_at) >= since).length;

  return {
    totalSubscribers,
    periodSubscribers,
    totalEmailsSent,
    periodEmailsSent,
    openRate,
    periodOpens: periodOpenStats.opens,
    totalCampaigns: sentEmails.length,
    periodCampaigns,
    totalReplies,
    periodReplies,
    chartData: chartCounts,
    chartLabels,
    period,
  };
}

// Public action for join page
export async function joinTribe(slug: string, email: string, baseUrl?: string) {
  const tribe = await getTribeBySlug(slug);
  if (!tribe) {
    throw new Error("Tribe not found");
  }
  
  const subscriber = await dbAddSubscriber(tribe.id, email);
  if (!subscriber) {
    throw new Error("Already subscribed");
  }
  
  // Send verification email if we have a token and base URL
  // Don't fail the whole operation if email fails
  if (subscriber.verification_token && baseUrl) {
    // Fire and forget - don't await, don't fail if it errors
    sendVerificationEmail(
      email,
      tribe.name,
      tribe.owner_name || "Anonymous",
      subscriber.verification_token,
      baseUrl
    ).catch((emailError) => {
      console.error("Failed to send verification email (non-blocking):", emailError);
    });
  }
  
  return { success: true, needsVerification: true };
}

// Gift actions
// Gift and MAX_GIFTS imported from ./types

export async function getGifts(): Promise<{ gifts: Gift[]; count: number; maxGifts: number }> {
  const tribe = await getTribe();
  const gifts = await getGiftsByTribeId(tribe.id);
  const count = await getGiftCountByTribeId(tribe.id);
  
  return {
    gifts: gifts.map(g => ({
      id: g.id,
      file_name: g.file_name,
      file_url: g.file_url,
      file_size: g.file_size,
      thumbnail_url: g.thumbnail_url,
      created_at: g.created_at.toISOString(),
    })),
    count,
    maxGifts: MAX_GIFTS,
  };
}

export async function deleteGift(giftId: string): Promise<{ success: boolean }> {
  const tribe = await getTribe();
  const deleted = await dbDeleteGift(giftId, tribe.id);
  
  if (!deleted) {
    throw new Error("Gift not found");
  }
  
  revalidatePath("/gifts");
  return { success: true };
}
