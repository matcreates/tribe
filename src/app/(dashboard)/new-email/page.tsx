"use client";

import { useState, useEffect } from "react";
import { getRecipientCounts, sendEmail, RecipientFilter } from "@/lib/actions";
import { Toast, useToast } from "@/components/Toast";
import { useRouter } from "next/navigation";

export default function NewEmailPage() {
  const router = useRouter();
  const [counts, setCounts] = useState({ verified: 0, nonVerified: 0, all: 0 });
  const [recipientFilter, setRecipientFilter] = useState<RecipientFilter>("verified");
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [mode, setMode] = useState<"email" | "link">("email");
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    loadCounts();
  }, []);

  const loadCounts = async () => {
    try {
      const result = await getRecipientCounts();
      setCounts(result);
    } catch (error) {
      console.error("Failed to load recipient counts:", error);
    }
  };

  const getCurrentCount = () => {
    switch (recipientFilter) {
      case "verified": return counts.verified;
      case "non-verified": return counts.nonVerified;
      case "all": return counts.all;
    }
  };

  const handleSend = async () => {
    if (!body.trim() || isSending) return;

    const count = getCurrentCount();
    if (count === 0) {
      showToast("No recipients to send to");
      return;
    }

    setIsSending(true);
    
    try {
      // Extract first line as subject
      const lines = body.trim().split("\n");
      const subject = lines[0].slice(0, 60) || "Untitled";
      
      const result = await sendEmail(subject, body, recipientFilter);
      
      setBody("");
      showToast(`Email sent to ${result.sentCount} subscribers`);
      router.refresh();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to send email";
      showToast(msg);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col items-center pt-14 px-6">
      <div className="w-full max-w-[540px]">
        {/* Header */}
        <h1 className="text-[20px] font-medium text-white/90 mb-5">
          Send an email
        </h1>

        {/* Recipient Selector */}
        <div className="flex items-center gap-3 mb-3">
          <span className="text-[13px] text-white/40">to</span>
          <div className="relative">
            <select
              value={recipientFilter}
              onChange={(e) => setRecipientFilter(e.target.value as RecipientFilter)}
              className="appearance-none px-3.5 py-2 pr-9 rounded-[8px] text-[13px] text-white/60 focus:outline-none cursor-pointer"
              style={{ background: 'rgba(255, 255, 255, 0.05)' }}
            >
              <option value="verified">All verified ({counts.verified})</option>
              <option value="all">All subscribers ({counts.all})</option>
              <option value="non-verified">Non-verified only ({counts.nonVerified})</option>
            </select>
            <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/35 pointer-events-none" />
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-0.5 mb-3 p-0.5 rounded-[8px] w-fit" style={{ background: 'rgba(255, 255, 255, 0.03)' }}>
          <button
            onClick={() => setMode("email")}
            className={`p-2 rounded-[6px] transition-colors ${
              mode === "email"
                ? "bg-white/[0.08] text-white/70"
                : "text-white/30 hover:text-white/50"
            }`}
            aria-label="Email mode"
          >
            <EmailIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => setMode("link")}
            className={`p-2 rounded-[6px] transition-colors ${
              mode === "link"
                ? "bg-white/[0.08] text-white/70"
                : "text-white/30 hover:text-white/50"
            }`}
            aria-label="Link mode"
          >
            <LinkIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Email Body */}
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={mode === "email" ? "Write your email..." : "Paste your link..."}
          className="w-full h-[180px] px-4 py-3 rounded-[10px] text-[13px] text-white/70 placeholder:text-white/25 resize-none focus:outline-none transition-colors mb-5"
          style={{ background: 'rgba(255, 255, 255, 0.04)' }}
        />

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={isSending || !body.trim() || getCurrentCount() === 0}
          className="self-start px-5 py-2 rounded-[8px] text-[11px] font-medium tracking-[0.1em] text-white/60 transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/[0.08]"
          style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.06)' }}
        >
          {isSending ? "SENDING..." : "SEND"}
        </button>

        {getCurrentCount() === 0 && (
          <p className="mt-3 text-[12px] text-white/30">
            {recipientFilter === "verified" 
              ? "No verified subscribers yet" 
              : recipientFilter === "non-verified"
              ? "No non-verified subscribers"
              : "Add subscribers to your tribe first"}
          </p>
        )}

        <Toast message={toast.message} isVisible={toast.visible} onClose={hideToast} />
      </div>
    </div>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6l4 4 4-4" />
    </svg>
  );
}

function EmailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3.5" width="12" height="9" rx="1.5" />
      <path d="M2 5.5l6 3.5 6-3.5" />
    </svg>
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
