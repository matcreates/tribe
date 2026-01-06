"use client";

import { useState, useEffect, useRef } from "react";
import { getTribeSettings, updateTribeSettings } from "@/lib/actions";
import { Toast, useToast } from "@/components/Toast";

export default function SettingsPage() {
  const [ownerName, setOwnerName] = useState("");
  const [slug, setSlug] = useState("");
  const [ownerAvatar, setOwnerAvatar] = useState("");
  const [emailSignature, setEmailSignature] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await getTribeSettings();
      setOwnerName(settings.ownerName);
      setSlug(settings.slug);
      setOwnerAvatar(settings.ownerAvatar || "");
      setEmailSignature(settings.emailSignature || "");
    } catch (error) {
      console.error("Failed to load settings:", error);
    } finally {
      setIsLoading(false);
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
    <div className="flex flex-col items-center pt-14 px-6">
      <div className="w-full max-w-[540px]">
        <h1 className="text-[20px] font-medium text-white/90 mb-6">Settings</h1>

        {/* Profile Image */}
        <div className="mb-5">
          <label className="block text-[12px] text-white/40 mb-2">Profile image</label>
          <div className="flex items-center gap-3 mb-2">
            {ownerAvatar && (
              <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0" style={{ background: 'rgba(255, 255, 255, 0.05)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={ownerAvatar} 
                  alt="Profile preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
            <button
              type="button"
              onClick={handleFileSelect}
              disabled={isUploading}
              className="px-4 py-1.5 rounded-[20px] text-[10px] font-medium tracking-[0.12em] uppercase text-white/55 hover:text-white/70 transition-colors border border-white/[0.06] disabled:opacity-40"
              style={{ background: 'rgba(255, 255, 255, 0.04)' }}
            >
              {isUploading ? "UPLOADING..." : "UPLOAD"}
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
            This signature will be automatically added at the end of every email you send. Links will be auto-detected.
          </p>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-5 py-2 rounded-[20px] text-[10px] font-medium tracking-[0.12em] uppercase text-white/55 hover:text-white/70 transition-colors border border-white/[0.06] disabled:opacity-40"
          style={{ background: 'rgba(255, 255, 255, 0.04)' }}
        >
          {isSaving ? "SAVING..." : "SAVE"}
        </button>

        <Toast message={toast.message} isVisible={toast.visible} onClose={hideToast} />
      </div>
    </div>
  );
}
