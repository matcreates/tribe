"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface EmailSentSuccessProps {
  sentCount: number;
  onClose: () => void;
}

export function EmailSentSuccess({ sentCount, onClose }: EmailSentSuccessProps) {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation after mount
    requestAnimationFrame(() => {
      setIsVisible(true);
    });
  }, []);

  const handleDone = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
      router.push("/dashboard");
    }, 300);
  };

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-500 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
      style={{ background: 'rgb(12, 12, 12)' }}
    >
      {/* Animated background gradient */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Primary glow */}
        <div 
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full transition-all duration-1000 ease-out ${
            isVisible ? "scale-100 opacity-100" : "scale-50 opacity-0"
          }`}
          style={{
            background: 'radial-gradient(circle, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.05) 40%, transparent 70%)',
            animation: isVisible ? 'pulse-glow 3s ease-in-out infinite' : 'none',
          }}
        />
        {/* Secondary moving orbs */}
        <div 
          className={`absolute top-1/3 left-1/3 w-[400px] h-[400px] rounded-full transition-all duration-1500 ease-out ${
            isVisible ? "opacity-60" : "opacity-0"
          }`}
          style={{
            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, transparent 60%)',
            animation: isVisible ? 'float-1 8s ease-in-out infinite' : 'none',
          }}
        />
        <div 
          className={`absolute bottom-1/3 right-1/3 w-[300px] h-[300px] rounded-full transition-all duration-1500 ease-out ${
            isVisible ? "opacity-50" : "opacity-0"
          }`}
          style={{
            background: 'radial-gradient(circle, rgba(52, 211, 153, 0.1) 0%, transparent 60%)',
            animation: isVisible ? 'float-2 6s ease-in-out infinite' : 'none',
          }}
        />
        {/* Subtle particles */}
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className={`absolute w-1 h-1 rounded-full bg-emerald-400/30 transition-all duration-1000 ${
              isVisible ? "opacity-100" : "opacity-0"
            }`}
            style={{
              left: `${20 + Math.random() * 60}%`,
              top: `${20 + Math.random() * 60}%`,
              animation: isVisible ? `particle ${3 + Math.random() * 4}s ease-in-out infinite ${Math.random() * 2}s` : 'none',
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
        {/* Success checkmark */}
        <div 
          className={`mx-auto mb-8 w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 delay-300 ${
            isVisible ? "scale-100" : "scale-0"
          }`}
          style={{ 
            background: 'rgba(34, 197, 94, 0.15)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
          }}
        >
          <svg 
            className={`w-10 h-10 text-emerald-400 transition-all duration-300 delay-500 ${
              isVisible ? "opacity-100 scale-100" : "opacity-0 scale-50"
            }`}
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>

        {/* Message */}
        <h1 
          className={`text-[28px] font-medium text-white/90 mb-3 transition-all duration-500 delay-400 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          Email sent!
        </h1>
        <p 
          className={`text-[15px] text-white/50 mb-10 transition-all duration-500 delay-500 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          Successfully delivered to {sentCount} {sentCount === 1 ? "subscriber" : "subscribers"}
        </p>

        {/* Done button */}
        <button
          onClick={handleDone}
          className={`px-8 py-3 rounded-[10px] text-[11px] font-medium tracking-[0.12em] uppercase btn-glass transition-all duration-500 delay-600 hover:scale-105 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <span className="btn-glass-text">DONE</span>
        </button>
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

