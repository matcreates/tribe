"use client";

import { useState, useEffect, useRef } from "react";
import { getTribeSettings, updateTribeSettings } from "@/lib/actions";
import { Toast, useToast } from "@/components/Toast";

export default function SettingsPage() {
  const [ownerName, setOwnerName] = useState("");
  const [slug, setSlug] = useState("");
  const [ownerAvatar, setOwnerAvatar] = useState("");
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

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      showToast("Image must be less than 2MB");
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
              className="px-4 py-2 rounded-[8px] text-[11px] font-medium tracking-[0.08em] text-white/70 transition-colors disabled:opacity-50 hover:bg-white/[0.08]"
              style={{ background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
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
          <input
            type="url"
            value={ownerAvatar}
            onChange={(e) => setOwnerAvatar(e.target.value)}
            placeholder="Or paste image URL"
            className="w-full px-3.5 py-2 rounded-[8px] text-[12px] text-white/70 placeholder:text-white/25 focus:outline-none transition-colors"
            style={{ background: 'rgba(255, 255, 255, 0.05)' }}
          />
          <p className="text-[11px] text-white/25 mt-1.5">
            Upload an image or paste a URL (leave empty to use initials)
          </p>
        </div>

        {/* Name */}
        <div className="mb-5">
          <label className="block text-[12px] text-white/40 mb-2">Your name</label>
          <input
            type="text"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-[8px] text-[13px] text-white/70 focus:outline-none transition-colors"
            style={{ background: 'rgba(255, 255, 255, 0.05)' }}
          />
        </div>

        {/* Slug */}
        <div className="mb-6">
          <label className="block text-[12px] text-white/40 mb-2">Your tribe URL</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="flex-1 px-3.5 py-2.5 rounded-[8px] text-[13px] text-white/70 focus:outline-none transition-colors"
              style={{ background: 'rgba(255, 255, 255, 0.05)' }}
            />
            <span className="text-[13px] text-white/35">.tribe.com</span>
          </div>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-5 py-2 rounded-[8px] text-[11px] font-medium tracking-[0.1em] text-white/60 transition-colors hover:bg-white/[0.08] disabled:opacity-50"
          style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.06)' }}
        >
          {isSaving ? "SAVING..." : "SAVE"}
        </button>

        <Toast message={toast.message} isVisible={toast.visible} onClose={hideToast} />
      </div>
    </div>
  );
}
