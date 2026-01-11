"use server";

import { auth } from "./auth";
import {
  getTribeByUserId,
  getTribeBySlug,
  updateTribe,
  getVerifiedSubscribersByTribeId,
  getSubscribersByTribeId,
  addSubscriber as dbAddSubscriber,
  addSubscriberBulk as dbAddSubscriberBulk,
  getExistingEmailsInTribe,
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
} from "./db";
import { sendVerificationEmail, sendBulkEmailWithUnsubscribe } from "./email";
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
  };
}

export async function updateTribeSettings(data: {
  name?: string;
  slug?: string;
  ownerName?: string;
  ownerAvatar?: string;
  emailSignature?: string;
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
  });
  
  revalidatePath("/settings");
  revalidatePath("/join");
  revalidatePath("/j/[slug]", "page");
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

export async function addSubscriber(email: string, name?: string) {
  const tribe = await getTribe();
  const result = await dbAddSubscriber(tribe.id, email, name);
  revalidatePath("/tribe");
  revalidatePath("/dashboard");
  return result;
}

export async function removeSubscriber(id: string) {
  await getTribe(); // Auth check
  await dbRemoveSubscriber(id);
  revalidatePath("/tribe");
  revalidatePath("/dashboard");
}

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim().toLowerCase());
}

export interface ImportPreviewResult {
  totalInFile: number;
  duplicates: number;
  invalid: number;
  toImport: number;
  emails: string[];
  invalidEmails: string[];
  duplicateEmails: string[];
}

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

export type RecipientFilter = "verified" | "non-verified" | "all";

export async function getEmailSignature(): Promise<string> {
  const tribe = await getTribe();
  return tribe.email_signature || "";
}

export interface SubscriptionStatus {
  status: 'free' | 'active' | 'canceled' | 'past_due';
  plan: 'monthly' | 'yearly' | null;
  endsAt: string | null;
  canSendEmails: boolean;
}

export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  const tribe = await getTribe();
  
  const status = (tribe.subscription_status || 'free') as 'free' | 'active' | 'canceled' | 'past_due';
  const plan = tribe.subscription_plan as 'monthly' | 'yearly' | null;
  const endsAt = tribe.subscription_ends_at ? tribe.subscription_ends_at.toISOString() : null;
  
  // User can send emails if they have an active subscription
  // or if their subscription is canceled but hasn't ended yet
  let canSendEmails = false;
  if (status === 'active') {
    canSendEmails = true;
  } else if (status === 'canceled' && tribe.subscription_ends_at) {
    canSendEmails = new Date(tribe.subscription_ends_at) > new Date();
  }
  
  return {
    status,
    plan,
    endsAt,
    canSendEmails,
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
export type TimePeriod = "24h" | "7d" | "30d";

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
