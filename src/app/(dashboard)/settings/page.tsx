"use client";

import { useState, useEffect, useRef } from "react";
import { signOut } from "next-auth/react";
import { updateTribeSettings } from "@/lib/actions";
import { useTribeSettings, useSubscriptionStatus } from "@/lib/hooks";
import { Toast, useToast } from "@/components/Toast";
import { PaywallModal } from "@/components/PaywallModal";
import { AvatarLarge } from "@/components/Avatar";

export default function SettingsPage() {
  // Use SWR hooks for cached data
  const { settings, isLoading: isLoadingSettings, mutate: mutateSettings } = useTribeSettings();
  const { subscription, isLoading: isLoadingSubscription, mutate: mutateSubscription } = useSubscriptionStatus();
  
  // Local form state
  const [ownerName, setOwnerName] = useState("");
  const [slug, setSlug] = useState("");
  const [ownerAvatar, setOwnerAvatar] = useState("");
  const [emailSignature, setEmailSignature] = useState("");
  const [hasInitialized, setHasInitialized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast, showToast, hideToast } = useToast();

  // Populate form when settings are loaded
  useEffect(() => {
    if (settings && !hasInitialized) {
      setOwnerName(settings.ownerName);
      setSlug(settings.slug);
      setOwnerAvatar(settings.ownerAvatar || "");
      setEmailSignature(settings.emailSignature || "");
      setHasInitialized(true);
    }
  }, [settings, hasInitialized]);

  const isLoading = isLoadingSettings || isLoadingSubscription;

  const syncSubscription = async () => {
    setIsLoadingPortal(true);
    try {
      const response = await fetch("/api/stripe/verify-subscription", {
        method: "POST",
      });
      const data = await response.json();
      
      if (data.synced) {
        showToast("Subscription status updated");
        // Invalidate cache to refetch
        mutateSubscription();
      } else {
        showToast(data.message || "Could not sync subscription");
      }
    } catch (error) {
      console.error("Sync error:", error);
      showToast("Failed to sync subscription");
    } finally {
      setIsLoadingPortal(false);
    }
  };

  const handleManageSubscription = async () => {
    setIsLoadingPortal(true);
    try {
      const response = await fetch("/api/stripe/create-portal", {
        method: "POST",
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        showToast(data.error || "Failed to open billing portal");
      }
    } catch (error) {
      console.error("Portal error:", error);
      showToast("Failed to open billing portal");
    } finally {
      setIsLoadingPortal(false);
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      showToast("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast("Image must be less than 5MB");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload-avatar", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setOwnerAvatar(data.url);
      showToast("Image uploaded successfully");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to upload image";
      showToast(message);
    } finally {
      setIsUploading(false);
      e.target.value = ""; // Reset file input
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateTribeSettings({
        ownerName: ownerName.trim() || "Anonymous",
        slug: slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "") || "my-tribe",
        ownerAvatar: ownerAvatar.trim() || undefined,
        emailSignature: emailSignature.trim() || undefined,
      });
      // Invalidate cache to reflect changes across the app
      mutateSettings();
      showToast("Settings saved");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save";
      showToast(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[13px] text-white/30">Loading...</p>
      </div>
    );
  }

  return (
    <>
      {/* Paywall Modal */}
      <PaywallModal 
        isOpen={showPaywall} 
        onClose={() => setShowPaywall(false)}
      />

      <div className="flex flex-col items-center pt-14 px-6">
        <div className="w-full max-w-[540px]">
          <h1 className="text-[20px] font-medium text-white/90 mb-6">Account settings</h1>

        {/* Profile Image */}
        <div className="mb-5">
          <label className="block text-[12px] text-white/40 mb-2">Profile image</label>
          <div className="flex items-center gap-3 mb-2">
            <AvatarLarge src={ownerAvatar || null} name={ownerName || "User"} />
            <button
              type="button"
              onClick={handleFileSelect}
              disabled={isUploading}
              className="px-4 py-2 rounded-[10px] text-[10px] font-medium tracking-[0.12em] uppercase btn-glass"
            >
              <span className="btn-glass-text">{isUploading ? "UPLOADING..." : "UPLOAD"}</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
          <p className="text-[11px] text-white/25 mt-1">
            Leave empty to use your initials
          </p>
        </div>

        {/* Name */}
        <div className="mb-5">
          <label className="block text-[12px] text-white/40 mb-2">Your name</label>
          <input
            type="text"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-[8px] text-[13px] text-white/70 focus:outline-none transition-colors border border-white/[0.06]"
            style={{ background: 'rgba(255, 255, 255, 0.02)' }}
          />
        </div>

        {/* Slug */}
        <div className="mb-6">
          <label className="block text-[12px] text-white/40 mb-2">Your username</label>
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-white/35">madewithtribe.com/@</span>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="flex-1 px-3.5 py-2.5 rounded-[8px] text-[13px] text-white/70 focus:outline-none transition-colors border border-white/[0.06]"
              style={{ background: 'rgba(255, 255, 255, 0.02)' }}
            />
          </div>
        </div>

        {/* Email Signature */}
        <div className="mb-6">
          <label className="block text-[12px] text-white/40 mb-2">Email signature</label>
          <textarea
            value={emailSignature}
            onChange={(e) => setEmailSignature(e.target.value)}
            placeholder="Add your signature here..."
            rows={4}
            className="w-full px-3.5 py-2.5 rounded-[8px] text-[13px] text-white/70 focus:outline-none transition-colors resize-none border border-white/[0.06]"
            style={{ background: 'rgba(255, 255, 255, 0.02)' }}
          />
          <p className="text-[11px] text-white/25 mt-1.5">
            This signature will be automatically added at the end of every email you send. Links will be auto-detected and underlined.
          </p>
        </div>

        {/* Subscription */}
        <div className="mb-8">
          <label className="block text-[12px] text-white/40 mb-3">Subscription</label>
          <div 
            className="p-5 rounded-[12px] border border-white/[0.06]"
            style={{ background: 'rgba(255, 255, 255, 0.02)' }}
          >
            {subscription?.status === 'active' || (subscription?.status === 'canceled' && subscription.canSendEmails) ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${subscription.status === 'canceled' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                    <span className="text-[13px] text-white/70 font-medium">
                      {subscription.status === 'canceled' ? 'Canceled' : 'Active'}
                    </span>
                  </div>
                  <span className="text-[12px] text-white/40 capitalize">
                    {subscription.plan} plan
                  </span>
                </div>
                <p className="text-[12px] text-white/40 mb-4">
                  {subscription.status === 'canceled' 
                    ? subscription.endsAt 
                      ? `Access until ${new Date(subscription.endsAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
                      : 'Your subscription has been canceled'
                    : subscription.endsAt 
                      ? `Renews on ${new Date(subscription.endsAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
                      : 'Your subscription is active'
                  }
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleManageSubscription}
                    disabled={isLoadingPortal}
                    className="px-4 py-2 rounded-[8px] text-[10px] font-medium tracking-[0.1em] uppercase btn-glass-secondary"
                  >
                    <span className="btn-glass-text">{isLoadingPortal ? "Loading..." : "Manage billing"}</span>
                  </button>
                  <button
                    onClick={syncSubscription}
                    disabled={isLoadingPortal}
                    className="px-4 py-2 rounded-[8px] text-[10px] font-medium tracking-[0.1em] uppercase text-white/40 hover:text-white/60 transition-colors"
                  >
                    {isLoadingPortal ? "Syncing..." : "Sync status"}
                  </button>
                </div>
              </>
            ) : subscription?.status === 'past_due' ? (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-[13px] text-white/70 font-medium">Payment issue</span>
                </div>
                <p className="text-[12px] text-white/40 mb-4">
                  Your payment failed. Please update your payment method to continue sending emails.
                </p>
                <button
                  onClick={handleManageSubscription}
                  disabled={isLoadingPortal}
                  className="px-4 py-2 rounded-[8px] text-[10px] font-medium tracking-[0.1em] uppercase"
                  style={{ background: '#E8B84A', color: '#000' }}
                >
                  {isLoadingPortal ? "Loading..." : "Update payment"}
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-white/30" />
                  <span className="text-[13px] text-white/70 font-medium">Free plan</span>
                </div>
                <p className="text-[12px] text-white/40 mb-4">
                  Subscribe to unlock email sending. Starts at $5/month.
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowPaywall(true)}
                    className="px-4 py-2 rounded-[8px] text-[10px] font-medium tracking-[0.1em] uppercase"
                    style={{ background: '#E8B84A', color: '#000' }}
                  >
                    Upgrade
                  </button>
                  <button
                    onClick={syncSubscription}
                    disabled={isLoadingPortal}
                    className="px-4 py-2 rounded-[8px] text-[10px] font-medium tracking-[0.1em] uppercase btn-glass-secondary"
                  >
                    <span className="btn-glass-text">{isLoadingPortal ? "Syncing..." : "Already paid? Sync"}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2.5 rounded-[10px] text-[10px] font-medium tracking-[0.12em] uppercase btn-glass"
        >
          <span className="btn-glass-text">{isSaving ? "SAVING..." : "SAVE"}</span>
        </button>

        {/* Log out */}
        <div className="mt-16 pt-8 pb-12 border-t border-white/[0.06]">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-2 text-[13px] text-white/40 hover:text-white/60 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2H3.5A1.5 1.5 0 002 3.5v9A1.5 1.5 0 003.5 14H6" />
              <path d="M10.5 11.5L14 8l-3.5-3.5" />
              <path d="M14 8H6" />
            </svg>
            Log out
          </button>
        </div>

        <Toast message={toast.message} isVisible={toast.visible} onClose={hideToast} />
        </div>
      </div>
    </>
  );
}
