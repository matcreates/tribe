"use client";

import { useState, useEffect } from "react";
import { Toast, useToast } from "@/components/Toast";

interface Settings {
  id: string;
  name: string;
  slug: string;
  ownerName: string;
  ownerAvatar: string | null;
}

interface JoinPageClientProps {
  settings: Settings;
}

export function JoinPageClient({ settings }: JoinPageClientProps) {
  const { toast, showToast, hideToast } = useToast();

  // Show the real, working URL
  const [displayUrl, setDisplayUrl] = useState("");
  const [fullJoinUrl, setFullJoinUrl] = useState("");

  useEffect(() => {
    const origin = window.location.origin;
    const url = `${origin}/j/${settings.slug}`;
    setFullJoinUrl(url);
    // Show a cleaner version without https://
    setDisplayUrl(url.replace(/^https?:\/\//, ""));
  }, [settings.slug]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullJoinUrl);
      showToast("Link copied to clipboard");
    } catch {
      showToast("Failed to copy link");
    }
  };

  return (
    <div className="flex flex-col items-center pt-14 px-6">
      <div className="w-full max-w-[540px]">
        {/* URL Bar */}
        <div 
          className="flex items-center gap-3 px-4 py-3 rounded-[10px] mb-6 w-full"
          style={{ background: 'rgba(255, 255, 255, 0.05)' }}
        >
          <LinkIcon className="w-4 h-4 text-white/35" />
          <span className="flex-1 text-[13px] text-white/60 truncate">{displayUrl}</span>
          <button
            onClick={copyLink}
            className="p-1.5 rounded-md hover:bg-white/[0.08] transition-colors"
            aria-label="Copy link"
          >
            <CopyIcon className="w-4 h-4 text-white/35" />
          </button>
        </div>

        {/* Join Card Preview */}
        <div 
          className="w-full rounded-[16px] border border-white/[0.08] p-7"
          style={{ background: 'rgba(255, 255, 255, 0.03)' }}
        >
          <div className="flex flex-col items-center text-center">
            {/* Avatar */}
            <div 
              className="w-14 h-14 rounded-full mb-2.5 flex items-center justify-center overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #2d8a8a 0%, #1a5f5f 100%)' }}
            >
              {settings.ownerAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={settings.ownerAvatar} 
                  alt={settings.ownerName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xl text-white/90 font-medium">
                  {settings.ownerName.charAt(0)}
                </span>
              )}
            </div>
            
            {/* Name */}
            <p className="text-[13px] text-white/50 mb-4">{settings.ownerName}</p>
            
            {/* Heading */}
            <h2 className="text-[18px] font-medium text-white/90 mb-1.5">
              Join my tribe
            </h2>
            
            {/* Description */}
            <p className="text-[12px] text-white/40 leading-[1.6] mb-5 max-w-[260px]">
              A tribe is a a group of people who choose to follow your work, support your ideas, and stay connected.
            </p>
            
            {/* Email Input */}
            <input
              type="email"
              placeholder="your email address"
              className="w-full px-3.5 py-2.5 rounded-[8px] text-[13px] text-white/70 placeholder:text-white/25 mb-4 focus:outline-none transition-colors"
              style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.06)' }}
              disabled
            />
            
            {/* Join Button */}
            <button
              className="px-5 py-2 rounded-[8px] text-[11px] font-medium tracking-[0.1em] text-white/70 transition-colors"
              style={{ background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
              disabled
            >
              JOIN
            </button>
            
            {/* Footer */}
            <p className="mt-5 text-[11px] text-white/30">
              made with{" "}
              <a href="/" className="underline hover:text-white/50 transition-colors">
                Tribe
              </a>
            </p>
          </div>
        </div>

        <Toast message={toast.message} isVisible={toast.visible} onClose={hideToast} />
      </div>
    </div>
  );
}

function LinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.5 9.5l3-3" />
      <path d="M9.5 6l1.25-1.25a2.12 2.12 0 013 3L12.5 9" />
      <path d="M6.5 10l-1.25 1.25a2.12 2.12 0 01-3-3L3.5 7" />
    </svg>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5.5" y="5.5" width="7" height="7" rx="1" />
      <path d="M3.5 10.5v-7a1 1 0 011-1h7" />
    </svg>
  );
}

