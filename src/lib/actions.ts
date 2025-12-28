"use server";

import { auth } from "./auth";
import {
  getTribeByUserId,
  getTribeBySlug,
  updateTribe,
  getVerifiedSubscribersByTribeId,
  getSubscribersByTribeId,
  addSubscriber as dbAddSubscriber,
  removeSubscriber as dbRemoveSubscriber,
  getVerifiedSubscriberCount,
  getSentEmailsByTribeId,
  createSentEmail,
  getTotalEmailsSent,
} from "./db";
import { sendVerificationEmail, sendBulkEmail } from "./email";
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
  };
}

export async function updateTribeSettings(data: {
  name?: string;
  slug?: string;
  ownerName?: string;
  ownerAvatar?: string;
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

export async function importSubscribers(emails: string[]) {
  const tribe = await getTribe();
  let added = 0;
  
  for (const email of emails) {
    const trimmed = email.trim().toLowerCase();
    if (trimmed && trimmed.includes("@")) {
      const result = await dbAddSubscriber(tribe.id, trimmed);
      if (result) added++;
    }
  }
  
  revalidatePath("/tribe");
  revalidatePath("/dashboard");
  return added;
}

export async function exportSubscribers() {
  const tribe = await getTribe();
  const subscribers = await getSubscribersByTribeId(tribe.id);
  return subscribers.map(s => s.email).join("\n");
}

// Email actions
export async function getSentEmails() {
  const tribe = await getTribe();
  return await getSentEmailsByTribeId(tribe.id);
}

export type RecipientFilter = "verified" | "non-verified" | "all";

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
  filter: RecipientFilter = "verified"
) {
  const tribe = await getTribe();
  const allSubscribers = await getSubscribersByTribeId(tribe.id);
  
  // Filter recipients based on selection
  let recipients: string[];
  switch (filter) {
    case "verified":
      recipients = allSubscribers.filter(s => s.verified).map(s => s.email);
      break;
    case "non-verified":
      recipients = allSubscribers.filter(s => !s.verified).map(s => s.email);
      break;
    case "all":
      recipients = allSubscribers.map(s => s.email);
      break;
  }

  if (recipients.length === 0) {
    throw new Error("No recipients to send to");
  }

  // Create HTML version of the email
  const htmlBody = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #121212; margin: 0; padding: 40px 20px;">
        <div style="max-width: 500px; margin: 0 auto; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 40px;">
          <div style="color: rgba(255,255,255,0.8); font-size: 15px; line-height: 1.7; white-space: pre-wrap;">${body.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
          <p style="color: rgba(255,255,255,0.3); font-size: 12px; margin: 32px 0 0; text-align: center;">
            Sent from ${tribe.owner_name || 'Anonymous'}'s Tribe
          </p>
        </div>
      </body>
    </html>
  `;

  // Send via Resend
  const result = await sendBulkEmail(recipients, subject, htmlBody, body);
  
  if (!result.success && result.sentCount === 0) {
    throw new Error(`Failed to send emails: ${result.errors.join(", ")}`);
  }

  // Record the sent email
  const email = await createSentEmail(tribe.id, subject, body, result.sentCount);
  
  revalidatePath("/new-email");
  revalidatePath("/dashboard");
  
  return { 
    ...email, 
    sentCount: result.sentCount,
    totalRecipients: recipients.length,
    errors: result.errors 
  };
}

// Dashboard stats
export async function getDashboardStats() {
  const tribe = await getTribe();
  // Only count verified subscribers
  const subscribers = await getVerifiedSubscribersByTribeId(tribe.id);
  const sentEmails = await getSentEmailsByTribeId(tribe.id);
  
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  // Subscriber stats
  const todaySubs = subscribers.filter(s => new Date(s.created_at) >= todayStart).length;
  const weekSubs = subscribers.filter(s => new Date(s.created_at) >= weekStart).length;

  // Email stats
  const todayEmails = sentEmails.filter(e => new Date(e.sent_at) >= todayStart);
  const weekEmails = sentEmails.filter(e => new Date(e.sent_at) >= weekStart);
  
  const totalRecipients = await getTotalEmailsSent(tribe.id);
  const todayRecipients = todayEmails.reduce((sum, e) => sum + e.recipient_count, 0);
  const weekRecipients = weekEmails.reduce((sum, e) => sum + e.recipient_count, 0);

  return {
    totalSubscribers: subscribers.length,
    todaySubscribers: todaySubs,
    weekSubscribers: weekSubs,
    totalEmailsSent: totalRecipients,
    todayEmailsSent: todayRecipients,
    weekEmailsSent: weekRecipients,
    // Mock opening rates for V2
    openingRate: sentEmails.length > 0 ? 46.2 : 0,
    todayOpeningRate: todayEmails.length > 0 ? 52.8 : 0,
    weekOpeningRate: weekEmails.length > 0 ? 48.4 : 0,
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
