"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { upload } from "@vercel/blob/client";

interface GiftUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentGiftCount: number;
  maxGifts: number;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_THUMBNAIL_SIZE = 2 * 1024 * 1024; // 2MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Sanitize filename for Vercel Blob
function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 100);
}

export function GiftUploadModal({
  isOpen,
  onClose,
  onSuccess,
  currentGiftCount,
  maxGifts,
}: GiftUploadModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedThumbnail, setSelectedThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    if (file.size > MAX_FILE_SIZE) {
      setError("File must be less than 20MB");
      return;
    }

    setSelectedFile(file);
    setStep(2);
  };

  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("Thumbnail must be an image");
      return;
    }

    if (file.size > MAX_THUMBNAIL_SIZE) {
      setError("Thumbnail must be less than 2MB");
      return;
    }

    // Check if image is roughly square (within 20% tolerance)
    const img = document.createElement("img");
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const ratio = img.width / img.height;
      if (ratio < 0.8 || ratio > 1.2) {
        setError("Thumbnail should be a square image");
        URL.revokeObjectURL(objectUrl);
        return;
      }
      setSelectedThumbnail(file);
      setThumbnailPreview(objectUrl);
    };
    img.src = objectUrl;
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError(null);

    try {
      const timestamp = Date.now();
      
      // Upload main file using client-side upload (bypasses 4.5MB serverless limit)
      const fileBlob = await upload(
        `gifts/${timestamp}-${sanitizeFilename(selectedFile.name)}`,
        selectedFile,
        {
          access: 'public',
          handleUploadUrl: '/api/upload-gift',
        }
      );

      // Upload thumbnail if provided
      let thumbnailUrl: string | null = null;
      if (selectedThumbnail) {
        const thumbExtension = (selectedThumbnail.name.split('.').pop() || 'jpg')
          .replace(/[^a-zA-Z0-9]/g, '')
          .substring(0, 10);
        
        const thumbBlob = await upload(
          `gifts/thumb-${timestamp}.${thumbExtension}`,
          selectedThumbnail,
          {
            access: 'public',
            handleUploadUrl: '/api/upload-gift',
          }
        );
        thumbnailUrl = thumbBlob.url;
      }

      // Finalize: Save to database
      const response = await fetch("/api/finalize-gift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: selectedFile.name,
          fileUrl: fileBlob.url,
          fileSize: selectedFile.size,
          thumbnailUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save gift");
      }

      onSuccess();
      handleClose();
    } catch (err) {
      console.error("Upload error:", err);
      setError(err instanceof Error ? err.message : "Failed to upload gift");
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (isUploading) return;
    setStep(1);
    setSelectedFile(null);
    setSelectedThumbnail(null);
    setThumbnailPreview(null);
    setError(null);
    if (thumbnailPreview) {
      URL.revokeObjectURL(thumbnailPreview);
    }
    onClose();
  };

  const handleBack = () => {
    setStep(1);
    setSelectedThumbnail(null);
    if (thumbnailPreview) {
      URL.revokeObjectURL(thumbnailPreview);
      setThumbnailPreview(null);
    }
    setError(null);
  };

  const removeThumbnail = () => {
    setSelectedThumbnail(null);
    if (thumbnailPreview) {
      URL.revokeObjectURL(thumbnailPreview);
      setThumbnailPreview(null);
    }
    if (thumbnailInputRef.current) {
      thumbnailInputRef.current.value = "";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={!isUploading ? handleClose : undefined}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-[420px] mx-4 rounded-[16px] p-6"
        style={{ background: 'rgb(24, 24, 24)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          disabled={isUploading}
          className="absolute top-4 right-4 p-1 text-white/40 hover:text-white/60 transition-colors disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M5 5l10 10M15 5L5 15" />
          </svg>
        </button>

        {step === 1 ? (
          <>
            {/* Step 1: Select file */}
            <div className="text-center mb-6">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(232, 184, 74, 0.15)' }}
              >
                <svg className="w-7 h-7 text-[#E8B84A]" viewBox="0 0 22 21" fill="currentColor">
                  <path fillRule="evenodd" clipRule="evenodd" d="M3 3.5C3 4.02384 3.11743 4.53557 3.33772 5H1C0.44772 5 0 5.44772 0 6V11C0 11.5523 0.44772 12 1 12H2V20C2 20.5523 2.44772 21 3 21H19C19.5523 21 20 20.5523 20 20V12H21C21.5523 12 22 11.5523 22 11V6C22 5.44772 21.5523 5 21 5H18.6623C18.8826 4.53557 19 4.02384 19 3.5C19 2.57174 18.6313 1.6815 17.9749 1.02513C17.3185 0.36875 16.4283 0 15.5 0C14.1769 0 13.1209 0.37202 12.3032 0.97769C11.7384 1.39606 11.316 1.90438 11 2.42396C10.684 1.90438 10.2616 1.39606 9.6968 0.97769C8.87913 0.37202 7.82309 0 6.5 0C5.57174 0 4.6815 0.36875 4.02513 1.02513C3.36875 1.6815 3 2.57174 3 3.5ZM6.5 2C6.10218 2 5.72064 2.15804 5.43934 2.43934C5.15804 2.72064 5 3.10218 5 3.5C5 3.89782 5.15804 4.27936 5.43934 4.56066C5.72064 4.84196 6.10218 5 6.5 5H9.8745C9.8032 4.66322 9.6934 4.2833 9.5256 3.91036C9.2937 3.39508 8.96597 2.92528 8.50633 2.58481C8.05837 2.25298 7.42691 2 6.5 2ZM12.1255 5H15.5C15.8978 5 16.2794 4.84196 16.5607 4.56066C16.842 4.27936 17 3.89782 17 3.5C17 3.10218 16.842 2.72064 16.5607 2.43934C16.2794 2.15804 15.8978 2 15.5 2C14.5731 2 13.9416 2.25298 13.4937 2.58481C13.034 2.92528 12.7063 3.39508 12.4744 3.91036C12.3066 4.2833 12.1968 4.66322 12.1255 5ZM12 7V10H20V7H12ZM10 7V10H2V7H10ZM12 19H18V12H12V19ZM10 12V19H4V12H10Z" />
                </svg>
              </div>
              <h3 className="text-[16px] font-medium text-white/90 mb-1">Upload a gift</h3>
              <p className="text-[13px] text-white/50">
                Step 1 of 2 — Select a file to share with your tribe
              </p>
            </div>

            <div
              className="border-2 border-dashed border-white/[0.12] rounded-[12px] p-8 text-center cursor-pointer hover:border-white/[0.2] transition-colors mb-4"
              onClick={() => fileInputRef.current?.click()}
            >
              <svg className="w-10 h-10 text-white/30 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17,8 12,3 7,8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <p className="text-[13px] text-white/50 mb-1">
                Click to select a file
              </p>
              <p className="text-[11px] text-white/30">
                Maximum size: 20MB
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
            />

            {error && (
              <p className="text-[12px] text-red-400 text-center mb-4">{error}</p>
            )}

            <p className="text-[11px] text-white/30 text-center">
              {currentGiftCount}/{maxGifts} gifts uploaded
            </p>
          </>
        ) : (
          <>
            {/* Step 2: Optional thumbnail */}
            <div className="text-center mb-6">
              <h3 className="text-[16px] font-medium text-white/90 mb-1">Add a thumbnail</h3>
              <p className="text-[13px] text-white/50">
                Step 2 of 2 — Optional: add a preview image
              </p>
            </div>

            {/* Selected file preview */}
            <div
              className="flex items-center gap-3 p-4 rounded-[10px] mb-4"
              style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div
                className="w-10 h-10 rounded-[8px] flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(255, 255, 255, 0.06)' }}
              >
                <FileIcon className="w-5 h-5 text-white/50" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-white/70 truncate">{selectedFile?.name}</p>
                <p className="text-[11px] text-white/40">{selectedFile && formatFileSize(selectedFile.size)}</p>
              </div>
            </div>

            {/* Thumbnail area */}
            {thumbnailPreview ? (
              <div className="relative mb-4">
                <div className="w-24 h-24 mx-auto rounded-[10px] overflow-hidden relative">
                  <Image
                    src={thumbnailPreview}
                    alt="Thumbnail preview"
                    fill
                    className="object-cover"
                  />
                </div>
                <button
                  onClick={removeThumbnail}
                  className="absolute top-0 right-1/2 translate-x-14 -translate-y-1 w-6 h-6 rounded-full bg-red-500/80 flex items-center justify-center text-white hover:bg-red-500 transition-colors"
                >
                  <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M3 3l6 6M9 3l-6 6" />
                  </svg>
                </button>
              </div>
            ) : (
              <div
                className="border-2 border-dashed border-white/[0.12] rounded-[12px] p-6 text-center cursor-pointer hover:border-white/[0.2] transition-colors mb-4"
                onClick={() => thumbnailInputRef.current?.click()}
              >
                <svg className="w-8 h-8 text-white/30 mx-auto mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21,15 16,10 5,21" />
                </svg>
                <p className="text-[12px] text-white/50 mb-1">
                  Click to add thumbnail
                </p>
                <p className="text-[10px] text-white/30">
                  Square image, max 2MB (optional)
                </p>
              </div>
            )}

            <input
              ref={thumbnailInputRef}
              type="file"
              accept="image/*"
              onChange={handleThumbnailSelect}
              className="hidden"
            />

            {error && (
              <p className="text-[12px] text-red-400 text-center mb-4">{error}</p>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleBack}
                disabled={isUploading}
                className="flex-1 py-3 rounded-[10px] text-[11px] font-medium tracking-[0.1em] uppercase btn-glass-secondary disabled:opacity-50"
              >
                <span className="btn-glass-text">BACK</span>
              </button>
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className="flex-1 py-3 rounded-[10px] text-[11px] font-medium tracking-[0.1em] uppercase btn-glass disabled:opacity-50"
              >
                <span className="btn-glass-text">
                  {isUploading ? "UPLOADING..." : "UPLOAD GIFT"}
                </span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function FileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14,2 14,8 20,8" />
    </svg>
  );
}
