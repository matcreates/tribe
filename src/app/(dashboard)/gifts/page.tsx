"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { getGifts, deleteGift, renameGift } from "@/lib/actions";
import type { Gift } from "@/lib/types";
import { MAX_GIFTS } from "@/lib/types";
import { Toast, useToast } from "@/components/Toast";
import { GiftUploadModal } from "@/components/GiftUploadModal";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function GiftsPage() {
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [giftCount, setGiftCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [renamingGift, setRenamingGift] = useState<Gift | null>(null);
  const [newName, setNewName] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);
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

  const handleStartRename = (gift: Gift) => {
    setRenamingGift(gift);
    setNewName(gift.file_name);
    setTimeout(() => renameInputRef.current?.focus(), 50);
  };

  const handleRename = async () => {
    if (!renamingGift || !newName.trim() || isRenaming) return;
    if (newName.trim() === renamingGift.file_name) {
      setRenamingGift(null);
      return;
    }

    setIsRenaming(true);
    try {
      await renameGift(renamingGift.id, newName.trim());
      setGifts(gifts.map(g => 
        g.id === renamingGift.id ? { ...g, file_name: newName.trim() } : g
      ));
      showToast("Gift renamed");
      setRenamingGift(null);
    } catch (error) {
      console.error("Failed to rename gift:", error);
      showToast("Failed to rename gift");
    } finally {
      setIsRenaming(false);
    }
  };

  const canUploadMore = giftCount < MAX_GIFTS;

  return (
    <div className="flex flex-col items-center pt-14 px-6 pb-12">
      <div className="w-full max-w-[540px]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-6">
          <div className="flex-1">
            <h1 className="text-[18px] sm:text-[20px] font-medium text-white/90 mb-2">
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
        <div className="space-y-2">
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
                      onClick={() => handleStartRename(gift)}
                      className="p-2 rounded-md hover:bg-white/[0.08] opacity-40 group-hover:opacity-70 transition-all"
                      aria-label="Rename gift"
                    >
                      <PencilIcon className="w-4 h-4 text-white/50" />
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

      {/* Upload Modal */}
      <GiftUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={handleUploadSuccess}
        currentGiftCount={giftCount}
        maxGifts={MAX_GIFTS}
      />

      {/* Rename Modal */}
      {renamingGift && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          onClick={() => !isRenaming && setRenamingGift(null)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[360px] rounded-[14px] border border-white/[0.08] p-6"
            style={{ background: 'rgba(18, 18, 18, 0.98)' }}
          >
            <h3 className="text-[15px] font-medium text-white/90 mb-4">Rename Gift</h3>
            <input
              ref={renameInputRef}
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') setRenamingGift(null);
              }}
              disabled={isRenaming}
              className="w-full px-4 py-3 rounded-[10px] text-[14px] text-white/90 placeholder:text-white/25 focus:outline-none border border-white/[0.06] transition-colors focus:border-white/[0.12] disabled:opacity-50"
              style={{ background: 'rgba(255, 255, 255, 0.03)' }}
              placeholder="Enter new name..."
            />
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setRenamingGift(null)}
                disabled={isRenaming}
                className="flex-1 px-4 py-2.5 rounded-[10px] text-[12px] font-medium text-white/60 hover:bg-white/[0.05] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRename}
                disabled={isRenaming || !newName.trim() || newName.trim() === renamingGift.file_name}
                className="flex-1 px-4 py-2.5 rounded-[10px] text-[12px] font-medium bg-white/[0.08] text-white/80 hover:bg-white/[0.12] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isRenaming ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
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

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
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
