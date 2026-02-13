"use client";

import { useState } from "react";
import { useTheme } from "@/lib/theme";

interface ContactSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: string;
}

export function ContactSupportModal({ isOpen, onClose, reason }: ContactSupportModalProps) {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim() || !message.trim()) {
      setError("Please fill in all fields");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Please enter a valid email address");
      return;
    }

    setIsSending(true);
    setError("");

    try {
      const response = await fetch("/api/contact-support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          message: message.trim(),
          reason,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || "Failed to send message");
        return;
      }

      setSent(true);
    } catch (err) {
      setError("Failed to send message. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setEmail("");
    setMessage("");
    setError("");
    setSent(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div 
        className={`relative w-full max-w-[420px] mx-4 rounded-[16px] overflow-hidden border ${
          isLight ? 'border-black/[0.08]' : 'border-white/[0.08]'
        }`}
        style={{ background: isLight ? '#EFEDE7' : 'rgb(24, 24, 24)' }}
      >
        {/* Header */}
        <div className="p-6 pb-0">
          <div className="flex items-center justify-between mb-1">
            <h2 className={`text-[18px] font-medium ${isLight ? 'text-black/85' : 'text-white/90'}`}>Contact Support</h2>
            <button
              onClick={handleClose}
              className={`p-1 transition-colors ${isLight ? 'text-black/40 hover:text-black/60' : 'text-white/40 hover:text-white/60'}`}
            >
              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M5 5l10 10M15 5L5 15" />
              </svg>
            </button>
          </div>
          <p className={`text-[13px] ${isLight ? 'text-black/40' : 'text-white/40'}`}>We typically respond within 24 hours</p>
        </div>

        {!sent ? (
          <form onSubmit={handleSubmit} className="p-6">
            {reason && (
              <div 
                className={`p-3 rounded-[8px] mb-4 text-[12px] border ${
                  isLight ? 'text-black/50 border-black/[0.06]' : 'text-white/50 border-white/[0.06]'
                }`}
                style={{ background: isLight ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.03)' }}
              >
                Reason: {reason}
              </div>
            )}

            <div className="mb-4">
              <label className={`block text-[11px] uppercase tracking-[0.08em] mb-2 ${isLight ? 'text-black/40' : 'text-white/40'}`}>
                Your email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                placeholder="your@email.com"
                className={`w-full px-4 py-3 rounded-[10px] text-[14px] focus:outline-none border transition-colors ${
                  isLight 
                    ? 'text-black/80 placeholder:text-black/30 border-black/[0.06] focus:border-black/[0.12]' 
                    : 'text-white/80 placeholder:text-white/25 border-white/[0.06] focus:border-white/[0.12]'
                }`}
                style={{ background: isLight ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.03)' }}
              />
            </div>

            <div className="mb-4">
              <label className={`block text-[11px] uppercase tracking-[0.08em] mb-2 ${isLight ? 'text-black/40' : 'text-white/40'}`}>
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  setError("");
                }}
                placeholder="How can we help you?"
                rows={4}
                className={`w-full px-4 py-3 rounded-[10px] text-[14px] focus:outline-none border transition-colors resize-none ${
                  isLight 
                    ? 'text-black/80 placeholder:text-black/30 border-black/[0.06] focus:border-black/[0.12]' 
                    : 'text-white/80 placeholder:text-white/25 border-white/[0.06] focus:border-white/[0.12]'
                }`}
                style={{ background: isLight ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.03)' }}
              />
            </div>

            {error && (
              <p className="text-[12px] text-red-400 mb-4">{error}</p>
            )}

            <button
              type="submit"
              disabled={isSending}
              className={`w-full py-3 rounded-[10px] text-[11px] font-medium tracking-[0.1em] uppercase disabled:opacity-50 transition-colors ${
                isLight 
                  ? 'bg-black text-white hover:bg-black/90' 
                  : 'btn-glass'
              }`}
            >
              <span className={isLight ? '' : 'btn-glass-text'}>{isSending ? "Sending..." : "Send Message"}</span>
            </button>
          </form>
        ) : (
          <div className="p-6 text-center">
            <div 
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(34, 197, 94, 0.15)' }}
            >
              <svg className={`w-7 h-7 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="10" cy="10" r="8" />
                <path d="M6 10l3 3 5-6" />
              </svg>
            </div>
            <h3 className={`text-[16px] font-medium mb-2 ${isLight ? 'text-black/85' : 'text-white/90'}`}>Message sent!</h3>
            <p className={`text-[13px] mb-5 ${isLight ? 'text-black/50' : 'text-white/50'}`}>
              We&apos;ll get back to you at <span className={isLight ? 'text-black/70' : 'text-white/70'}>{email}</span> as soon as possible.
            </p>
            <button
              onClick={handleClose}
              className={`w-full py-3 rounded-[10px] text-[11px] font-medium tracking-[0.1em] uppercase transition-colors ${
                isLight 
                  ? 'bg-black text-white hover:bg-black/90' 
                  : 'btn-glass'
              }`}
            >
              <span className={isLight ? '' : 'btn-glass-text'}>Close</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
