"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getCampaignStatus } from "@/lib/actions";
import { useTheme } from "@/lib/theme";

type Particle = {
  left: string;
  top: string;
  durationSeconds: number;
  delaySeconds: number;
};

function generateParticles(count: number = 12): Particle[] {
  return Array.from({ length: count }, () => ({
    left: `${20 + Math.random() * 60}%`,
    top: `${20 + Math.random() * 60}%`,
    durationSeconds: 3 + Math.random() * 4,
    delaySeconds: Math.random() * 2,
  }));
}

interface EmailSentSuccessProps {
  campaignId?: string;
  totalRecipients: number;
  onClose: () => void;
}

export function EmailSentSuccess({ campaignId, totalRecipients, onClose }: EmailSentSuccessProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [isVisible, setIsVisible] = useState(false);
  const [status, setStatus] = useState<'queued' | 'sending' | 'sent' | 'failed'>('queued');
  const [sentCount, setSentCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [particles, setParticles] = useState<Particle[]>([]);

  const pollStatus = useCallback(async () => {
    if (!campaignId) {
      // No campaign ID means it was sent synchronously (legacy)
      setStatus('sent');
      setSentCount(totalRecipients);
      return;
    }

    try {
      const result = await getCampaignStatus(campaignId);
      setStatus(result.status as 'queued' | 'sending' | 'sent' | 'failed');
      setSentCount(result.sentCount);
      if (result.errorMessage) {
        setErrorMessage(result.errorMessage);
      }
    } catch (error) {
      console.error("Failed to poll campaign status:", error);
    }
  }, [campaignId, totalRecipients]);

  useEffect(() => {
    setParticles(generateParticles());
  }, []);

  useEffect(() => {
    // Trigger animation after mount
    requestAnimationFrame(() => {
      setIsVisible(true);
    });

    // Poll for status updates
    if (campaignId) {
      pollStatus();
      const interval = setInterval(() => {
        if (status !== 'sent' && status !== 'failed') {
          pollStatus();
        }
      }, 3000); // Poll every 3 seconds

      return () => clearInterval(interval);
    }
  }, [campaignId, pollStatus, status]);

  const handleDone = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
      router.push("/dashboard");
    }, 300);
  };

  const isComplete = status === 'sent';
  const isFailed = status === 'failed';
  const isProcessing = status === 'queued' || status === 'sending';
  const progressPercent = totalRecipients > 0 ? Math.round((sentCount / totalRecipients) * 100) : 0;

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-500 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
      style={{ background: isLight ? '#EFEDE7' : 'rgb(12, 12, 12)' }}
    >
      {/* Animated background gradient */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Primary glow */}
        <div 
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full transition-all duration-1000 ease-out ${
            isVisible ? "scale-100 opacity-100" : "scale-50 opacity-0"
          }`}
          style={{
            background: isFailed 
              ? 'radial-gradient(circle, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.05) 40%, transparent 70%)'
              : isLight 
                ? 'radial-gradient(circle, rgba(5, 150, 105, 0.12) 0%, rgba(5, 150, 105, 0.04) 40%, transparent 70%)'
                : 'radial-gradient(circle, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.05) 40%, transparent 70%)',
            animation: isVisible && !isProcessing ? 'pulse-glow 3s ease-in-out infinite' : 'none',
          }}
        />
        {/* Secondary moving orbs */}
        <div 
          className={`absolute top-1/3 left-1/3 w-[400px] h-[400px] rounded-full transition-all duration-1500 ease-out ${
            isVisible ? "opacity-60" : "opacity-0"
          }`}
          style={{
            background: isLight 
              ? 'radial-gradient(circle, rgba(5, 150, 105, 0.08) 0%, transparent 60%)'
              : 'radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, transparent 60%)',
            animation: isVisible ? 'float-1 8s ease-in-out infinite' : 'none',
          }}
        />
        <div 
          className={`absolute bottom-1/3 right-1/3 w-[300px] h-[300px] rounded-full transition-all duration-1500 ease-out ${
            isVisible ? "opacity-50" : "opacity-0"
          }`}
          style={{
            background: isLight 
              ? 'radial-gradient(circle, rgba(5, 150, 105, 0.06) 0%, transparent 60%)'
              : 'radial-gradient(circle, rgba(52, 211, 153, 0.1) 0%, transparent 60%)',
            animation: isVisible ? 'float-2 6s ease-in-out infinite' : 'none',
          }}
        />
        {/* Subtle particles */}
        {particles.map((p, i) => (
          <div
            key={i}
            className={`absolute w-1 h-1 rounded-full transition-all duration-1000 ${
              isVisible ? "opacity-100" : "opacity-0"
            } ${isLight ? 'bg-emerald-600/30' : 'bg-emerald-400/30'}`}
            style={{
              left: p.left,
              top: p.top,
              animation: isVisible
                ? `particle ${p.durationSeconds}s ease-in-out infinite ${p.delaySeconds}s`
                : 'none',
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div 
        className={`relative z-10 text-center transition-all duration-700 delay-200 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        {/* Icon */}
        <div 
          className={`mx-auto mb-8 w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 delay-300 ${
            isVisible ? "scale-100" : "scale-0"
          }`}
          style={{ 
            background: isFailed 
              ? 'rgba(239, 68, 68, 0.15)' 
              : isLight 
                ? 'rgba(5, 150, 105, 0.12)' 
                : 'rgba(34, 197, 94, 0.15)',
            border: `1px solid ${isFailed ? 'rgba(239, 68, 68, 0.3)' : isLight ? 'rgba(5, 150, 105, 0.25)' : 'rgba(34, 197, 94, 0.3)'}`,
          }}
        >
          {isProcessing ? (
            /* Spinner for processing */
            <svg 
              className={`w-10 h-10 animate-spin ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}
              viewBox="0 0 24 24" 
              fill="none"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : isFailed ? (
            /* X icon for failed */
            <svg 
              className="w-10 h-10 text-red-400"
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          ) : (
            /* Checkmark for complete */
            <svg 
              className={`w-10 h-10 transition-all duration-300 delay-500 ${
                isVisible ? "opacity-100 scale-100" : "opacity-0 scale-50"
              } ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
          )}
        </div>

        {/* Message */}
        <h1 
          className={`text-[28px] font-medium mb-3 transition-all duration-500 delay-400 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          } ${isLight ? 'text-black/85' : 'text-white/90'}`}
        >
          {isFailed ? "Sending failed" : isComplete ? "Email sent!" : "Sending your email..."}
        </h1>
        
        {/* Progress or status message */}
        {isProcessing && (
          <div className={`mb-6 transition-all duration-500 delay-500 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}>
            <p className={`text-[15px] mb-4 ${isLight ? 'text-black/50' : 'text-white/50'}`}>
              {sentCount.toLocaleString()} / {totalRecipients.toLocaleString()} members
            </p>
            {/* Progress bar */}
            <div 
              className="w-64 mx-auto h-2 rounded-full overflow-hidden"
              style={{ background: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)' }}
            >
              <div 
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{ 
                  width: `${progressPercent}%`,
                  background: isLight 
                    ? 'linear-gradient(90deg, rgba(5, 150, 105, 0.9), rgba(4, 120, 87, 0.9))'
                    : 'linear-gradient(90deg, rgba(34, 197, 94, 0.8), rgba(16, 185, 129, 0.8))'
                }}
              />
            </div>
            <p className={`text-[12px] mt-2 ${isLight ? 'text-black/30' : 'text-white/30'}`}>
              {progressPercent}% complete
            </p>
          </div>
        )}

        {isComplete && (
          <p 
            className={`text-[15px] mb-10 transition-all duration-500 delay-500 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            } ${isLight ? 'text-black/50' : 'text-white/50'}`}
          >
            Successfully delivered to {sentCount.toLocaleString()} {sentCount === 1 ? "member" : "members"}
          </p>
        )}

        {isFailed && (
          <p 
            className={`text-[15px] text-red-400/70 mb-10 transition-all duration-500 delay-500 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            {errorMessage || "An error occurred while sending your email"}
          </p>
        )}

        {/* Done button - show when complete or failed */}
        {(isComplete || isFailed) && (
          <button
            onClick={handleDone}
            className={`px-8 py-3 rounded-[10px] text-[11px] font-medium tracking-[0.12em] uppercase transition-all duration-500 delay-600 hover:scale-105 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            } ${isLight ? 'bg-black text-white hover:bg-black/90' : 'btn-glass'}`}
          >
            <span className={isLight ? '' : 'btn-glass-text'}>DONE</span>
          </button>
        )}

        {/* Leave running note for processing */}
        {isProcessing && (
          <p className={`text-[12px] mt-4 ${isLight ? 'text-black/25' : 'text-white/25'}`}>
            You can leave this page — emails will continue sending in the background.
          </p>
        )}
      </div>

      {/* Keyframe animations */}
      <style jsx>{`
        @keyframes pulse-glow {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          50% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.8; }
        }
        @keyframes float-1 {
          0%, 100% { transform: translate(0, 0); }
          33% { transform: translate(30px, -20px); }
          66% { transform: translate(-20px, 15px); }
        }
        @keyframes float-2 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-25px, -30px); }
        }
        @keyframes particle {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.3; }
          50% { transform: translateY(-20px) scale(1.5); opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
