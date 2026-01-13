"use client";

import { useState, useEffect, use } from "react";
import { getSentEmailById, getEmailReplies, deleteSentEmail } from "@/lib/actions";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface EmailInsightsPageProps {
  params: Promise<{ id: string }>;
}

interface SentEmail {
  id: string;
  subject: string | null;
  body: string | null;
  recipient_count: number;
  open_count: number;
  sent_at: string;
}

interface EmailReply {
  id: string;
  email_id: string;
  subscriber_email: string;
  reply_text: string;
  received_at: string;
}

export default function EmailInsightsPage({ params }: EmailInsightsPageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [email, setEmail] = useState<SentEmail | null>(null);
  const [replies, setReplies] = useState<EmailReply[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadEmail();
    loadReplies();
  }, [resolvedParams.id]);

  const loadEmail = async () => {
    try {
      const data = await getSentEmailById(resolvedParams.id);
      setEmail(data);
    } catch (err) {
      console.error("Failed to load email:", err);
      setError("Email not found");
    } finally {
      setIsLoading(false);
    }
  };

  const loadReplies = async () => {
    try {
      const data = await getEmailReplies(resolvedParams.id);
      setReplies(data);
    } catch (err) {
      console.error("Failed to load replies:", err);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteSentEmail(resolvedParams.id);
      router.push('/dashboard');
    } catch (err) {
      console.error("Failed to delete email:", err);
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[13px] text-white/30">Loading...</p>
      </div>
    );
  }

  if (error || !email) {
    return (
      <div className="flex flex-col items-center pt-14 px-6">
        <div className="w-full max-w-[540px] text-center">
          <p className="text-[13px] text-white/50 mb-4">{error || "Email not found"}</p>
          <Link 
            href="/dashboard"
            className="text-[13px] text-white/40 hover:text-white/60 transition-colors"
          >
            ← Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const sentDate = new Date(email.sent_at);
  const formattedDate = sentDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const formattedTime = sentDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  // Calculate real open rate from tracked data
  const uniqueOpens = email.open_count || 0;
  const openRate = email.recipient_count > 0 
    ? Math.round((uniqueOpens / email.recipient_count) * 100) 
    : 0;

  return (
    <div className="flex flex-col items-center pt-14 px-6 pb-12">
      <div className="w-full max-w-[540px]">
        {/* Back link */}
        <Link 
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-[12px] text-white/40 hover:text-white/60 transition-colors mb-6"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 12L6 8l4-4" />
          </svg>
          Back to dashboard
        </Link>

        {/* Email subject */}
        <h1 className="text-[20px] font-medium text-white/90 mb-2">
          {email.subject || "Untitled"}
        </h1>
        <p className="text-[13px] text-white/40 mb-8">
          Sent on {formattedDate} at {formattedTime}
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          {/* Recipients */}
          <div 
            className="rounded-[12px] p-5 border border-white/[0.06]"
            style={{ background: 'rgba(255, 255, 255, 0.02)' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(59, 130, 246, 0.15)' }}
              >
                <svg className="w-4 h-4 text-blue-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="8" cy="5" r="2.5" />
                  <path d="M3 14c0-2.5 2.5-4 5-4s5 1.5 5 4" />
                </svg>
              </div>
              <span className="text-[12px] text-white/40">Recipients</span>
            </div>
            <p className="text-[28px] font-medium text-white/90">
              {email.recipient_count}
            </p>
            <p className="text-[11px] text-white/30 mt-1">
              subscribers received this email
            </p>
          </div>

          {/* Open Rate */}
          <div 
            className="rounded-[12px] p-5 border border-white/[0.06]"
            style={{ background: 'rgba(255, 255, 255, 0.02)' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(34, 197, 94, 0.15)' }}
              >
                <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="8" cy="8" r="3" />
                  <path d="M1.5 8c0 0 2.5-5 6.5-5s6.5 5 6.5 5-2.5 5-6.5 5-6.5-5-6.5-5z" />
                </svg>
              </div>
              <span className="text-[12px] text-white/40">Open rate</span>
            </div>
            <p className="text-[28px] font-medium text-white/90">
              {openRate}%
            </p>
            <p className="text-[11px] text-white/30 mt-1">
              {uniqueOpens} unique opens
            </p>
          </div>

          {/* Click Rate */}
          <div 
            className="rounded-[12px] p-5 border border-white/[0.06]"
            style={{ background: 'rgba(255, 255, 255, 0.02)' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(168, 85, 247, 0.15)' }}
              >
                <svg className="w-4 h-4 text-purple-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 8.5L6.5 12 13 4" />
                </svg>
              </div>
              <span className="text-[12px] text-white/40">Click rate</span>
            </div>
            <p className="text-[28px] font-medium text-white/50">
              —
            </p>
            <p className="text-[11px] text-white/30 mt-1">
              Coming soon
            </p>
          </div>

          {/* Delivery Status */}
          <div 
            className="rounded-[12px] p-5 border border-white/[0.06]"
            style={{ background: 'rgba(255, 255, 255, 0.02)' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(251, 191, 36, 0.15)' }}
              >
                <svg className="w-4 h-4 text-amber-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3.5" width="12" height="9" rx="1.5" />
                  <path d="M2 5.5l6 3.5 6-3.5" />
                </svg>
              </div>
              <span className="text-[12px] text-white/40">Delivered</span>
            </div>
            <p className="text-[28px] font-medium text-white/90">
              100%
            </p>
            <p className="text-[11px] text-white/30 mt-1">
              {email.recipient_count} of {email.recipient_count} delivered
            </p>
          </div>
        </div>

        {/* Engagement Summary */}
        <div 
          className="rounded-[12px] p-5 border border-white/[0.06] mb-8"
          style={{ background: 'rgba(255, 255, 255, 0.02)' }}
        >
          <h3 className="text-[13px] font-medium text-white/70 mb-4">Engagement summary</h3>
          {uniqueOpens > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-white/50">Opens</span>
                <span className="text-[12px] text-white/70">{uniqueOpens} of {email.recipient_count}</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.05)' }}>
                <div 
                  className="h-full rounded-full transition-all"
                  style={{ 
                    width: `${Math.min(100, openRate)}%`,
                    background: 'rgba(34, 197, 94, 0.6)',
                  }}
                />
              </div>
              <p className="text-[11px] text-white/30">
                {openRate}% of recipients opened this email
              </p>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-[13px] text-white/40">No opens recorded yet</p>
              <p className="text-[11px] text-white/25 mt-1">
                Opens are tracked when recipients view the email
              </p>
            </div>
          )}
        </div>

        {/* Email Preview */}
        <div 
          className="rounded-[12px] border border-white/[0.06] overflow-hidden mb-8"
          style={{ background: 'rgba(255, 255, 255, 0.02)' }}
        >
          <div className="px-5 py-3 border-b border-white/[0.06]">
            <h3 className="text-[13px] font-medium text-white/70">Email preview</h3>
          </div>
          <div className="p-5">
            <div 
              className="rounded-[8px] p-5 text-[13px] text-white/60 leading-relaxed whitespace-pre-wrap"
              style={{ background: 'rgba(0, 0, 0, 0.2)' }}
            >
              {email.body || "No content"}
            </div>
          </div>
        </div>

        {/* Replies Section */}
        <div 
          className="rounded-[12px] border border-white/[0.06] overflow-hidden"
          style={{ background: 'rgba(255, 255, 255, 0.02)' }}
        >
          <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
            <h3 className="text-[13px] font-medium text-white/70">Replies</h3>
            {replies.length > 0 && (
              <span className="text-[11px] text-white/40">{replies.length} {replies.length === 1 ? 'reply' : 'replies'}</span>
            )}
          </div>
          <div className="p-5">
            {replies.length === 0 ? (
              <div className="text-center py-8">
                <div 
                  className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(255, 255, 255, 0.05)' }}
                >
                  <ReplyIcon className="w-5 h-5 text-white/30" />
                </div>
                <p className="text-[13px] text-white/40">No replies yet</p>
                <p className="text-[11px] text-white/25 mt-1">
                  When subscribers reply to this email, their responses will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {replies.map((reply) => {
                  const replyDate = new Date(reply.received_at);
                  const replyFormatted = replyDate.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  }) + " at " + replyDate.toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  });
                  
                  return (
                    <div 
                      key={reply.id}
                      className="rounded-[10px] border border-white/[0.06] overflow-hidden"
                      style={{ background: 'rgba(0, 0, 0, 0.15)' }}
                    >
                      <div className="px-4 py-3 border-b border-white/[0.04] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium text-white/70"
                            style={{ background: 'rgba(45, 138, 138, 0.3)' }}
                          >
                            {reply.subscriber_email.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-[12px] text-white/60">{reply.subscriber_email}</span>
                        </div>
                        <span className="text-[10px] text-white/30">{replyFormatted}</span>
                      </div>
                      <div className="px-4 py-3">
                        <p className="text-[13px] text-white/50 leading-relaxed whitespace-pre-wrap">
                          {reply.reply_text}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Delete Section */}
        <div className="mt-12 pt-8 border-t border-white/[0.06]">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-5 py-2.5 rounded-[10px] text-[11px] font-medium tracking-[0.1em] uppercase bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors"
          >
            Delete this email
          </button>
          <p className="text-[11px] text-white/25 mt-2">
            This will permanently delete this email and all associated data.
          </p>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => !isDeleting && setShowDeleteConfirm(false)}
          />
          <div 
            className="relative w-full max-w-[360px] mx-4 rounded-[16px] p-6"
            style={{ background: 'rgb(24, 24, 24)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <h3 className="text-[16px] font-medium text-white/90 mb-2">Delete this email?</h3>
            <p className="text-[13px] text-white/50 mb-6 leading-relaxed">
              Are you sure you want to delete &ldquo;{email?.subject || "Untitled"}&rdquo;? This will also delete all replies and tracking data. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 rounded-[10px] text-[11px] font-medium tracking-[0.08em] uppercase text-white/60 hover:bg-white/5 transition-colors border border-white/[0.08]"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 rounded-[10px] text-[11px] font-medium tracking-[0.08em] uppercase bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors border border-red-500/30"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ReplyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 6L3 10l4 4" />
      <path d="M3 10h10a4 4 0 0 1 4 4v2" />
    </svg>
  );
}

