// Shared types - these can be imported by both server and client components

export interface TribeSettings {
  tribeName: string;
  slug: string;
  ownerName: string;
  ownerAvatar?: string;
}

export interface Subscriber {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
}

export interface SentEmail {
  id: string;
  subject: string;
  body: string;
  sentAt: string;
  recipientCount: number;
}

export interface TribeData {
  settings: TribeSettings;
  subscribers: Subscriber[];
  sentEmails: SentEmail[];
}

// Subscriber pagination types
export type SubscriberFilter = "all" | "verified" | "non-verified";
export type SubscriberSort = "newest" | "oldest" | "a-z" | "z-a" | "verified-first" | "unverified-first";

export interface PaginatedSubscribersResult {
  subscribers: {
    id: string;
    email: string;
    name: string | null;
    verified: boolean;
    created_at: string;
  }[];
  total: number;
  totalVerified: number;
  totalNonVerified: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Import preview types
export interface ImportPreviewResult {
  totalInFile: number;
  duplicates: number;
  invalid: number;
  toImport: number;
  emails: string[];
  invalidEmails: string[];
  duplicateEmails: string[];
}

// Email replies pagination types
export interface PaginatedRepliesResult {
  replies: {
    id: string;
    email_id: string;
    subscriber_email: string;
    reply_text: string;
    received_at: string;
  }[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Recipient filter type
export type RecipientFilter = "verified" | "non-verified" | "all";

// Subscription types
export type SubscriptionTier = 'free' | 'small' | 'big';
export type SubscriptionPlan = 'small_monthly' | 'small_yearly' | 'big_monthly' | 'big_yearly' | null;

export interface SubscriptionStatus {
  status: 'free' | 'active' | 'canceled' | 'past_due';
  tier: SubscriptionTier;
  plan: SubscriptionPlan;
  endsAt: string | null;
  canSendEmails: boolean;
  tribeSizeLimit: number | null; // null = unlimited
  currentTribeSize: number;
  isTribeFull: boolean;
}

// Tribe size limits per tier
export const TRIBE_SIZE_LIMITS: Record<SubscriptionTier, number | null> = {
  free: 500,
  small: 10000,
  big: null, // unlimited
};

// Weekly email status
export interface WeeklyEmailStatus {
  emailsSentThisWeek: number;
  limit: number;
  canSendEmail: boolean;
  nextResetDate: string; // ISO date string for next Monday
}

// Dashboard stats
export type TimePeriod = "24h" | "7d" | "30d";

// Gift types
export interface Gift {
  id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  thumbnail_url: string | null;
  short_code: string | null;
  created_at: string;
  member_count?: number;
}

// Constants that need to be shared with client components
export const MAX_GIFTS = 5;