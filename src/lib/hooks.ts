"use client";

import useSWR from "swr";
import { getTribeSettings, getSubscriptionStatus } from "./actions";
import type { SubscriptionStatus } from "./types";

// Cache keys
export const CACHE_KEYS = {
  TRIBE_SETTINGS: "tribe-settings",
  SUBSCRIPTION_STATUS: "subscription-status",
} as const;

// Tribe settings type
export interface TribeSettings {
  slug: string;
  ownerName: string;
  ownerAvatar: string | null;
  emailSignature: string | null;
  joinDescription: string;
  userEmail: string;
}

// Custom hook for tribe settings with SWR caching
export function useTribeSettings() {
  const { data, error, isLoading, mutate } = useSWR<TribeSettings>(
    CACHE_KEYS.TRIBE_SETTINGS,
    async () => {
      const settings = await getTribeSettings();
      return {
        slug: settings.slug,
        ownerName: settings.ownerName,
        ownerAvatar: settings.ownerAvatar || null,
        emailSignature: settings.emailSignature || null,
        joinDescription: settings.joinDescription,
        userEmail: settings.userEmail || "",
      };
    },
    {
      revalidateOnFocus: false, // Don't refetch on window focus
      revalidateOnReconnect: false, // Don't refetch on reconnect
      dedupingInterval: 60000, // Dedupe requests for 1 minute
      errorRetryCount: 2, // Only retry twice on error
    }
  );

  return {
    settings: data,
    isLoading,
    isError: !!error,
    error,
    mutate, // Use to manually revalidate or update the cache
  };
}

// Custom hook for subscription status with SWR caching
export function useSubscriptionStatus() {
  const { data, error, isLoading, mutate } = useSWR<SubscriptionStatus>(
    CACHE_KEYS.SUBSCRIPTION_STATUS,
    async () => {
      return await getSubscriptionStatus();
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 30000, // Dedupe for 30 seconds
      errorRetryCount: 2,
    }
  );

  return {
    subscription: data,
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

// Helper to invalidate cache when settings are updated
export function useInvalidateCache() {
  const { mutate: mutateSettings } = useTribeSettings();
  const { mutate: mutateSubscription } = useSubscriptionStatus();

  return {
    invalidateSettings: () => mutateSettings(),
    invalidateSubscription: () => mutateSubscription(),
    invalidateAll: () => {
      mutateSettings();
      mutateSubscription();
    },
  };
}
