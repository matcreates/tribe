"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { getGifts, deleteGift, updateGiftFile } from "@/lib/actions";
import type { Gift } from "@/lib/types";
import { MAX_GIFTS } from "@/lib/types";
import { Toast, useToast } from "@/components/Toast";
import { upload } from "@vercel/blob/client";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_THUMBNAIL_SIZE = 2 * 1024 * 1024; // 2MB

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 100);
}

export default function GiftsPage() {
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [giftCount, setGiftCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingGift, setUpdatingGift] = useState<Gift | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedThumbnail, setSelectedThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateStep, setUpdateStep] = useState<1 | 2>(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const { toast, showToast, hideToast } = useToast();

  const loadGifts = useCallback(async () => {
    try {
      const data = await getGifts();
      setGifts(data.gifts);
      setGiftCount(data.count);
    } catch (error) {
      console.error("Failed to load gifts:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGifts();
  }, [loadGifts]);

  const handleUploadSuccess = () => {
    loadGifts();
    showToast("Gift uploaded successfully!");
  };

  const handleDelete = async (giftId: string) => {
    if (deletingId) return;
    
    setDeletingId(giftId);
    try {
      await deleteGift(giftId);
      setGifts(gifts.filter(g => g.id !== giftId));
      setGiftCount(c => c - 1);
      showToast("Gift deleted");
    } catch (error) {
      console.error("Failed to delete gift:", error);
      showToast("Failed to delete gift");
    } finally {
      setDeletingId(null);
    }
  };

  const handleStartUpdate = (gift: Gift) => {
    setUpdatingGift(gift);
    setSelectedFile(null);
    setSelectedThumbnail(null);
    setThumbnailPreview(null);
    setUpdateError(null);
    setUpdateStep(1);
    setTimeout(() => fileInputRef.current?.click(), 50);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUpdateError(null);
    
    if (file.size > MAX_FILE_SIZE) {
      setUpdateError("File must be less than 20MB");
      return;
    }
    
    setSelectedFile(file);
    setUpdateStep(2);
  };

  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUpdateError(null);
    
    if (!file.type.startsWith("image/")) {
      setUpdateError("Thumbnail must be an image");
      return;
    }
    
    if (file.size > MAX_THUMBNAIL_SIZE) {
      setUpdateError("Thumbnail must be less than 2MB");
      return;
    }
    
    const img = document.createElement("img");
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const ratio = img.width / img.height;
      if (ratio < 0.8 || ratio > 1.2) {
        setUpdateError("Thumbnail should be a square image");
        URL.revokeObjectURL(objectUrl);
        return;
      }
      setSelectedThumbnail(file);
      setThumbnailPreview(objectUrl);
    };
    img.src = objectUrl;
  };

  const handleUpdateFile = async () => {
    if (!updatingGift || !selectedFile || isUpdating) return;

    setIsUpdating(true);
    setUpdateError(null);

    try {
      const timestamp = Date.now();
      
      // Upload new file
      const fileBlob = await upload(
        `gifts/${timestamp}-${sanitizeFilename(selectedFile.name)}`,
        selectedFile,
        {
          access: 'public',
          handleUploadUrl: '/api/upload-gift',
        }
      );

      // Upload thumbnail if provided
      let thumbnailUrl: string | null = updatingGift.thumbnail_url;
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

      // Update the gift in database
      await updateGiftFile(
        updatingGift.id,
        selectedFile.name,
        fileBlob.url,
        selectedFile.size,
        thumbnailUrl
      );

      // Update local state
      setGifts(gifts.map(g => 
        g.id === updatingGift.id 
          ? { 
              ...g, 
              file_name: selectedFile.name, 
              file_url: fileBlob.url,
              file_size: selectedFile.size,
              thumbnail_url: thumbnailUrl
            } 
          : g
      ));
      
      showToast("Gift file updated");
      handleCloseUpdateModal();
    } catch (error) {
      console.error("Failed to update gift:", error);
      setUpdateError(error instanceof Error ? error.message : "Failed to update gift");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCloseUpdateModal = () => {
    if (isUpdating) return;
    setUpdatingGift(null);
    setSelectedFile(null);
    setSelectedThumbnail(null);
    if (thumbnailPreview) {
      URL.revokeObjectURL(thumbnailPreview);
    }
    setThumbnailPreview(null);
    setUpdateError(null);
    setUpdateStep(1);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
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

  const canUploadMore = giftCount < MAX_GIFTS;

  return (
    <div className="flex flex-col items-center pt-14 px-6 pb-12">
        <div className="w-full max-w-[600px]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-6">
          <div className="flex-1">
            <h1 className="text-[26px] sm:text-[28px] font-normal text-white/90 mb-2" style={{ fontFamily: 'HeritageSerif, Georgia, serif' }}>
              Gifts
            </h1>
            <p className="text-[13px] text-white/50 leading-relaxed">
              Sharing is caring: encourage your community to join your tribe by giving them something in return, it might boost your growth.
            </p>
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            disabled={!canUploadMore}
            className="px-5 py-2.5 rounded-[10px] text-[10px] font-medium tracking-[0.12em] uppercase btn-glass disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            <span className="btn-glass-text">UPLOAD GIFT</span>
          </button>
        </div>

        {/* Gift count */}
        <p className="text-[12px] text-white/40 mb-4">
          {giftCount}/{MAX_GIFTS} gifts uploaded
        </p>

        {/* Gift List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-[13px] text-white/35">Loading...</p>
            </div>
          ) : gifts.length === 0 ? (
            <div
              className="text-center py-12 rounded-[12px] border border-dashed border-white/[0.1]"
              style={{ background: 'rgba(255, 255, 255, 0.01)' }}
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(255, 255, 255, 0.04)' }}
              >
                <GiftIcon className="w-7 h-7 text-white/25" />
              </div>
              <p className="text-[13px] text-white/40 mb-1">No gifts yet</p>
              <p className="text-[12px] text-white/25">
                Upload files to share with your tribe members
              </p>
            </div>
          ) : (
            gifts.map((gift) => {
              const giftUrl = gift.short_code 
                ? `${typeof window !== 'undefined' ? window.location.origin : ''}/g/${gift.short_code}`
                : null;
              
              return (
                <div
                  key={gift.id}
                  className="rounded-[10px] border border-white/[0.06] overflow-hidden"
                  style={{ background: 'rgba(255, 255, 255, 0.02)' }}
                >
                  {/* Main row */}
                  <div className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors group">
                    {/* Thumbnail or file icon */}
                    <div
                      className="w-12 h-12 rounded-[8px] flex items-center justify-center flex-shrink-0 overflow-hidden relative"
                      style={{ background: 'rgba(255, 255, 255, 0.06)' }}
                    >
                      {gift.thumbnail_url ? (
                        <Image
                          src={gift.thumbnail_url}
                          alt={gift.file_name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <FileIcon className="w-5 h-5 text-white/40" />
                      )}
                    </div>

                    {/* File info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-white/70 truncate">{gift.file_name}</p>
                      <div className="flex items-center gap-2 text-[11px] text-white/40">
                        <span>{formatFileSize(gift.file_size)}</span>
                        {(gift.member_count ?? 0) > 0 && (
                          <>
                            <span className="text-white/20">•</span>
                            <span className="text-emerald-400/70">
                              {gift.member_count} {gift.member_count === 1 ? 'member' : 'members'} joined
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <button
                      onClick={() => handleStartUpdate(gift)}
                      className="p-2 rounded-md hover:bg-white/[0.08] opacity-40 group-hover:opacity-70 transition-all"
                      aria-label="Update file"
                    >
                      <RefreshIcon className="w-4 h-4 text-white/50" />
                    </button>
                    <a
                      href={gift.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-md hover:bg-white/[0.08] opacity-40 group-hover:opacity-70 transition-all"
                      aria-label="Download"
                    >
                      <DownloadIcon className="w-4 h-4 text-white/50" />
                    </a>
                    <button
                      onClick={() => handleDelete(gift.id)}
                      disabled={deletingId === gift.id}
                      className="p-2 rounded-md hover:bg-white/[0.08] opacity-40 group-hover:opacity-70 transition-all disabled:opacity-20"
                      aria-label="Delete gift"
                    >
                      <TrashIcon className="w-4 h-4 text-white/50" />
                    </button>
                  </div>
                  
                  {/* Gift Link Row */}
                  {giftUrl && (
                    <div 
                      className="px-4 py-2.5 flex items-center gap-2 border-t border-white/[0.04]"
                      style={{ background: 'rgba(34, 197, 94, 0.03)' }}
                    >
                      <LinkIcon className="w-3.5 h-3.5 text-emerald-400/60 flex-shrink-0" />
                      <span className="text-[11px] text-emerald-400/70 truncate flex-1 font-mono">
                        {giftUrl.replace('https://', '').replace('http://', '')}
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(giftUrl);
                          showToast("Link copied!");
                        }}
                        className="px-2.5 py-1 rounded-md text-[10px] font-medium uppercase tracking-wider text-emerald-400/80 hover:bg-emerald-400/10 transition-colors"
                      >
                        Copy
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <Toast message={toast.message} isVisible={toast.visible} onClose={hideToast} />
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        className="hidden"
      />
      <input
        ref={thumbnailInputRef}
        type="file"
        accept="image/*"
        onChange={handleThumbnailSelect}
        className="hidden"
      />

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onSuccess={handleUploadSuccess}
          currentGiftCount={giftCount}
          maxGifts={MAX_GIFTS}
        />
      )}

      {/* Update File Modal */}
      {updatingGift && updateStep === 2 && selectedFile && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          onClick={() => !isUpdating && handleCloseUpdateModal()}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[420px] rounded-[16px] border border-white/[0.08] p-6"
            style={{ background: 'rgb(24, 24, 24)' }}
          >
            {/* Close button */}
            <button
              onClick={handleCloseUpdateModal}
              disabled={isUpdating}
              className="absolute top-4 right-4 p-1 text-white/40 hover:text-white/60 transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M5 5l10 10M15 5L5 15" />
              </svg>
            </button>

            <div className="text-center mb-6">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(232, 184, 74, 0.15)' }}
              >
                <RefreshIcon className="w-7 h-7 text-[#E8B84A]" />
              </div>
              <h3 className="text-[16px] font-medium text-white/90 mb-1">Update gift file</h3>
              <p className="text-[13px] text-white/50">
                Replace the file while keeping the same link
              </p>
            </div>

            {/* New file preview */}
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
                <p className="text-[13px] text-white/70 truncate">{selectedFile.name}</p>
                <p className="text-[11px] text-white/40">{formatFileSize(selectedFile.size)}</p>
              </div>
              <span className="text-[10px] text-emerald-400/80 font-medium uppercase px-2 py-1 rounded-md" style={{ background: 'rgba(34, 197, 94, 0.1)' }}>
                New
              </span>
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
                  Update thumbnail (optional)
                </p>
                <p className="text-[10px] text-white/30">
                  Square image, max 2MB
                </p>
              </div>
            )}

            {updateError && (
              <p className="text-[12px] text-red-400 text-center mb-4">{updateError}</p>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleCloseUpdateModal}
                disabled={isUpdating}
                className="flex-1 py-3 rounded-[10px] text-[12px] font-medium text-white/60 hover:bg-white/[0.05] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateFile}
                disabled={isUpdating}
                className="flex-1 py-3 rounded-[10px] text-[11px] font-medium tracking-[0.1em] uppercase btn-glass disabled:opacity-50"
              >
                <span className="btn-glass-text">
                  {isUpdating ? "UPDATING..." : "UPDATE"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Upload Modal Component (extracted from GiftUploadModal)
function UploadModal({
  onClose,
  onSuccess,
  currentGiftCount,
  maxGifts,
}: {
  onClose: () => void;
  onSuccess: () => void;
  currentGiftCount: number;
  maxGifts: number;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedThumbnail, setSelectedThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

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
      const fileBlob = await upload(
        `gifts/${timestamp}-${sanitizeFilename(selectedFile.name)}`,
        selectedFile,
        { access: 'public', handleUploadUrl: '/api/upload-gift' }
      );

      let thumbnailUrl: string | null = null;
      if (selectedThumbnail) {
        const thumbExtension = (selectedThumbnail.name.split('.').pop() || 'jpg')
          .replace(/[^a-zA-Z0-9]/g, '')
          .substring(0, 10);
        const thumbBlob = await upload(
          `gifts/thumb-${timestamp}.${thumbExtension}`,
          selectedThumbnail,
          { access: 'public', handleUploadUrl: '/api/upload-gift' }
        );
        thumbnailUrl = thumbBlob.url;
      }

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
    if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
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
    if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={!isUploading ? handleClose : undefined} />
      <div className="relative w-full max-w-[420px] mx-4 rounded-[16px] p-6" style={{ background: 'rgb(24, 24, 24)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <button onClick={handleClose} disabled={isUploading} className="absolute top-4 right-4 p-1 text-white/40 hover:text-white/60 transition-colors disabled:opacity-50">
          <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M5 5l10 10M15 5L5 15" /></svg>
        </button>

        {step === 1 ? (
          <>
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(232, 184, 74, 0.15)' }}>
                <GiftIcon className="w-7 h-7 text-[#E8B84A]" />
              </div>
              <h3 className="text-[16px] font-medium text-white/90 mb-1">Upload a gift</h3>
              <p className="text-[13px] text-white/50">Step 1 of 2 — Select a file to share with your tribe</p>
            </div>
            <div className="border-2 border-dashed border-white/[0.12] rounded-[12px] p-8 text-center cursor-pointer hover:border-white/[0.2] transition-colors mb-4" onClick={() => fileInputRef.current?.click()}>
              <svg className="w-10 h-10 text-white/30 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17,8 12,3 7,8" /><line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <p className="text-[13px] text-white/50 mb-1">Click to select a file</p>
              <p className="text-[11px] text-white/30">Maximum size: 20MB</p>
            </div>
            <input ref={fileInputRef} type="file" onChange={handleFileSelect} className="hidden" />
            {error && <p className="text-[12px] text-red-400 text-center mb-4">{error}</p>}
            <p className="text-[11px] text-white/30 text-center">{currentGiftCount}/{maxGifts} gifts uploaded</p>
          </>
        ) : (
          <>
            <div className="text-center mb-6">
              <h3 className="text-[16px] font-medium text-white/90 mb-1">Add a thumbnail</h3>
              <p className="text-[13px] text-white/50">Step 2 of 2 — Optional: add a preview image</p>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-[10px] mb-4" style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="w-10 h-10 rounded-[8px] flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255, 255, 255, 0.06)' }}>
                <FileIcon className="w-5 h-5 text-white/50" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-white/70 truncate">{selectedFile?.name}</p>
                <p className="text-[11px] text-white/40">{selectedFile && formatFileSize(selectedFile.size)}</p>
              </div>
            </div>
            {thumbnailPreview ? (
              <div className="relative mb-4">
                <div className="w-24 h-24 mx-auto rounded-[10px] overflow-hidden relative">
                  <Image src={thumbnailPreview} alt="Thumbnail preview" fill className="object-cover" />
                </div>
                <button onClick={removeThumbnail} className="absolute top-0 right-1/2 translate-x-14 -translate-y-1 w-6 h-6 rounded-full bg-red-500/80 flex items-center justify-center text-white hover:bg-red-500 transition-colors">
                  <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 3l6 6M9 3l-6 6" /></svg>
                </button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-white/[0.12] rounded-[12px] p-6 text-center cursor-pointer hover:border-white/[0.2] transition-colors mb-4" onClick={() => thumbnailInputRef.current?.click()}>
                <svg className="w-8 h-8 text-white/30 mx-auto mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21,15 16,10 5,21" />
                </svg>
                <p className="text-[12px] text-white/50 mb-1">Click to add thumbnail</p>
                <p className="text-[10px] text-white/30">Square image, max 2MB (optional)</p>
              </div>
            )}
            <input ref={thumbnailInputRef} type="file" accept="image/*" onChange={handleThumbnailSelect} className="hidden" />
            {error && <p className="text-[12px] text-red-400 text-center mb-4">{error}</p>}
            <div className="flex gap-3">
              <button onClick={handleBack} disabled={isUploading} className="flex-1 py-3 rounded-[10px] text-[12px] font-medium text-white/60 hover:bg-white/[0.05] transition-colors disabled:opacity-50">Back</button>
              <button onClick={handleUpload} disabled={isUploading} className="flex-1 py-3 rounded-[10px] text-[11px] font-medium tracking-[0.1em] uppercase btn-glass disabled:opacity-50">
                <span className="btn-glass-text">{isUploading ? "UPLOADING..." : "UPLOAD GIFT"}</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function GiftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 22 21" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M3 3.5C3 4.02384 3.11743 4.53557 3.33772 5H1C0.44772 5 0 5.44772 0 6V11C0 11.5523 0.44772 12 1 12H2V20C2 20.5523 2.44772 21 3 21H19C19.5523 21 20 20.5523 20 20V12H21C21.5523 12 22 11.5523 22 11V6C22 5.44772 21.5523 5 21 5H18.6623C18.8826 4.53557 19 4.02384 19 3.5C19 2.57174 18.6313 1.6815 17.9749 1.02513C17.3185 0.36875 16.4283 0 15.5 0C14.1769 0 13.1209 0.37202 12.3032 0.97769C11.7384 1.39606 11.316 1.90438 11 2.42396C10.684 1.90438 10.2616 1.39606 9.6968 0.97769C8.87913 0.37202 7.82309 0 6.5 0C5.57174 0 4.6815 0.36875 4.02513 1.02513C3.36875 1.6815 3 2.57174 3 3.5ZM6.5 2C6.10218 2 5.72064 2.15804 5.43934 2.43934C5.15804 2.72064 5 3.10218 5 3.5C5 3.89782 5.15804 4.27936 5.43934 4.56066C5.72064 4.84196 6.10218 5 6.5 5H9.8745C9.8032 4.66322 9.6934 4.2833 9.5256 3.91036C9.2937 3.39508 8.96597 2.92528 8.50633 2.58481C8.05837 2.25298 7.42691 2 6.5 2ZM12.1255 5H15.5C15.8978 5 16.2794 4.84196 16.5607 4.56066C16.842 4.27936 17 3.89782 17 3.5C17 3.10218 16.842 2.72064 16.5607 2.43934C16.2794 2.15804 15.8978 2 15.5 2C14.5731 2 13.9416 2.25298 13.4937 2.58481C13.034 2.92528 12.7063 3.39508 12.4744 3.91036C12.3066 4.2833 12.1968 4.66322 12.1255 5ZM12 7V10H20V7H12ZM10 7V10H2V7H10ZM12 19H18V12H12V19ZM10 12V19H4V12H10Z" />
    </svg>
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

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7,10 12,15 17,10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 4v6h-6" />
      <path d="M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 10 11" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M2.5 1.5C2.5 0.671575 3.17158 0 4 0H6C6.82845 0 7.5 0.671575 7.5 1.5V2H9.5C9.77615 2 10 2.22386 10 2.5C10 2.77614 9.77615 3 9.5 3H8.9697L8.55765 9.59355C8.5082 10.3841 7.85265 11 7.06055 11H2.93945C2.14736 11 1.49178 10.3841 1.44237 9.59355L1.03028 3H0.5C0.22386 3 0 2.77614 0 2.5C0 2.22386 0.22386 2 0.5 2H2.5V1.5ZM3.5 2H6.5V1.5C6.5 1.22386 6.27615 1 6 1H4C3.72386 1 3.5 1.22386 3.5 1.5V2ZM2.03222 3L2.44042 9.5312C2.45689 9.7947 2.67542 10 2.93945 10H7.06055C7.3246 10 7.5431 9.7947 7.55955 9.5312L7.96775 3H2.03222Z" />
    </svg>
  );
}

function LinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}
