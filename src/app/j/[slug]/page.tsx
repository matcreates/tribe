"use client";

import { useState, use } from "react";
import { joinTribe } from "@/lib/actions";
import { Toast, useToast } from "@/components/Toast";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function PublicJoinPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [error, setError] = useState("");
  const { toast, showToast, hideToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError("");
    
    try {
      const baseUrl = window.location.origin;
      await joinTribe(resolvedParams.slug, email.trim(), baseUrl);
      setIsJoined(true);
      showToast("Verification email sent!");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      if (message === "Already subscribed") {
        setError("You're already subscribed!");
      } else if (message === "Tribe not found") {
        setError("This tribe doesn't exist");
      } else {
        setError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'rgb(18, 18, 18)' }}>
      <div 
        className="w-full max-w-[320px] rounded-[16px] border border-white/[0.08] p-7"
        style={{ background: 'rgba(255, 255, 255, 0.03)' }}
      >
        <div className="flex flex-col items-center text-center">
          {/* Avatar */}
          <div 
            className="w-14 h-14 rounded-full mb-2.5 flex items-center justify-center overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #2d8a8a 0%, #1a5f5f 100%)' }}
          >
            <span className="text-xl text-white/90 font-medium">
              {resolvedParams.slug.charAt(0).toUpperCase()}
            </span>
          </div>
          
          {/* Name */}
          <p className="text-[13px] text-white/50 mb-4">{resolvedParams.slug}</p>
          
          {/* Heading */}
          <h1 className="text-[18px] font-medium text-white/90 mb-1.5">
            Join my tribe
          </h1>
          
          {/* Description */}
          <p className="text-[12px] text-white/40 leading-[1.6] mb-5 max-w-[260px]">
            A tribe is a a group of people who choose to follow your work, support your ideas, and stay connected.
          </p>

          {isJoined ? (
            <div className="py-3">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center" style={{ background: 'rgba(45, 138, 138, 0.2)' }}>
                <MailIcon className="w-5 h-5 text-[#2d8a8a]" />
              </div>
              <p className="text-[14px] text-white/80 font-medium mb-1">
                Check your email
              </p>
              <p className="text-[12px] text-white/50">
                We sent a confirmation link to verify your subscription.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="w-full">
              {/* Email Input */}
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your email address"
                className="w-full px-3.5 py-2.5 rounded-[8px] text-[13px] text-white/70 placeholder:text-white/25 mb-4 focus:outline-none transition-colors"
                style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.06)' }}
                required
              />
              
              {error && (
                <p className="text-[12px] text-red-400/80 mb-3">{error}</p>
              )}
              
              {/* Join Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-[8px] text-[11px] font-medium tracking-[0.1em] text-white/70 transition-colors disabled:opacity-50 hover:bg-white/[0.08]"
                style={{ background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
              >
                {isSubmitting ? "..." : "JOIN"}
              </button>
            </form>
          )}
          
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
  );
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M22 7l-10 6L2 7" />
    </svg>
  );
}
