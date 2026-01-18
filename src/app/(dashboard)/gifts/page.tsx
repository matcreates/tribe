"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { getGifts, deleteGift } from "@/lib/actions";
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

  const canUploadMore = giftCount < MAX_GIFTS;

  return (
    <div className="flex flex-col items-center pt-14 px-6">
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
            gifts.map((gift) => (
              <div
                key={gift.id}
                className="flex items-center gap-3 px-4 py-3 rounded-[10px] hover:bg-white/[0.04] transition-colors group border border-white/[0.06]"
                style={{ background: 'rgba(255, 255, 255, 0.02)' }}
              >
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
                  <p className="text-[11px] text-white/40">{formatFileSize(gift.file_size)}</p>
                </div>

                {/* Actions */}
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
            ))
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

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 10 11" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M2.5 1.5C2.5 0.671575 3.17158 0 4 0H6C6.82845 0 7.5 0.671575 7.5 1.5V2H9.5C9.77615 2 10 2.22386 10 2.5C10 2.77614 9.77615 3 9.5 3H8.9697L8.55765 9.59355C8.5082 10.3841 7.85265 11 7.06055 11H2.93945C2.14736 11 1.49178 10.3841 1.44237 9.59355L1.03028 3H0.5C0.22386 3 0 2.77614 0 2.5C0 2.22386 0.22386 2 0.5 2H2.5V1.5ZM3.5 2H6.5V1.5C6.5 1.22386 6.27615 1 6 1H4C3.72386 1 3.5 1.22386 3.5 1.5V2ZM2.03222 3L2.44042 9.5312C2.45689 9.7947 2.67542 10 2.93945 10H7.06055C7.3246 10 7.5431 9.7947 7.55955 9.5312L7.96775 3H2.03222Z" />
    </svg>
  );
}
