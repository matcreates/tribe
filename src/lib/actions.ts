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
import { sendVerificationEmail } from "./email";
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
  });
  
  revalidatePath("/settings");
  revalidatePath("/join");
}

// Subscriber actions
export async function getSubscribers() {
  const tribe = await getTribe();
  // Only return verified subscribers
  return await getVerifiedSubscribersByTribeId(tribe.id);
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

export async function sendEmail(subject: string, body: string) {
  const tribe = await getTribe();
  // Only count verified subscribers
  const recipientCount = await getVerifiedSubscriberCount(tribe.id);
  const email = await createSentEmail(tribe.id, subject, body, recipientCount);
  revalidatePath("/new-email");
  revalidatePath("/dashboard");
  return email;
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
  if (subscriber.verification_token && baseUrl) {
    try {
      await sendVerificationEmail(
        email,
        tribe.name,
        tribe.owner_name || "Anonymous",
        subscriber.verification_token,
        baseUrl
      );
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
      // Still return success - subscriber is added, just email failed
    }
  }
  
  return { success: true, needsVerification: true };
}
