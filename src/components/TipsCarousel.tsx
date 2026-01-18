"use client";

import { useState, useEffect, useCallback } from "react";

// Tips for creators - deliverability best practices
const CREATOR_TIPS = [
  {
    title: "Avoid spam trigger words",
    description: "Words like 'FREE', 'ACT NOW', or using ALL CAPS can trigger spam filters. Keep your subject lines natural and conversational.",
  },
  {
    title: "Be consistent with your schedule",
    description: "Sending emails at regular intervals helps build sender reputation. Your tribe will also learn when to expect your content.",
  },
  {
    title: "Personalize your content",
    description: "Emails that feel personal perform better. Share your authentic voice and stories — your tribe joined for YOU.",
  },
  {
    title: "Keep your list clean",
    description: "Regularly engaged subscribers improve deliverability. Consider re-engaging inactive members or letting them go.",
  },
  {
    title: "Quality over quantity",
    description: "It's better to send one great email than multiple mediocre ones. Your 2 emails per week limit is actually a feature!",
  },
  {
    title: "Write compelling subject lines",
    description: "Your subject line is the first impression. Make it intriguing but honest — avoid clickbait that disappoints.",
  },
];

function LightbulbIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 14h4" />
      <path d="M6 12h4" />
      <path d="M5.5 10c-1.5-1-2.5-2.5-2.5-4.5a5 5 0 1 1 10 0c0 2-1 3.5-2.5 4.5" />
      <path d="M8 2v1" />
      <path d="M12 4l-.7.7" />
      <path d="M4 4l.7.7" />
    </svg>
  );
}

export function TipsCarousel() {
  const [currentTip, setCurrentTip] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState<'left' | 'right'>('right');

  const goToTip = useCallback((index: number) => {
    if (index === currentTip || isAnimating) return;
    setDirection(index > currentTip ? 'right' : 'left');
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentTip(index);
      setIsAnimating(false);
    }, 200);
  }, [currentTip, isAnimating]);

  // Auto-cycle through tips every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const nextTip = (currentTip + 1) % CREATOR_TIPS.length;
      goToTip(nextTip);
    }, 5000);

    return () => clearInterval(interval);
  }, [currentTip, goToTip]);

  const tip = CREATOR_TIPS[currentTip];

  return (
    <div 
      className="rounded-[12px] p-5 border overflow-hidden"
      style={{ 
        background: 'rgba(251, 191, 36, 0.03)',
        borderColor: 'rgba(251, 191, 36, 0.2)',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div 
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: 'rgba(251, 191, 36, 0.15)' }}
        >
          <LightbulbIcon className="w-4 h-4 text-amber-400" />
        </div>
        <span className="text-[12px] font-medium text-amber-400/80 tracking-wide uppercase">
          Tip for creators
        </span>
      </div>

      {/* Tip Content with Animation */}
      <div className="relative min-h-[80px]">
        <div 
          className={`transition-all duration-200 ease-out ${
            isAnimating 
              ? direction === 'right'
                ? 'opacity-0 -translate-x-4'
                : 'opacity-0 translate-x-4'
              : 'opacity-100 translate-x-0'
          }`}
        >
          <h3 className="text-[15px] font-medium text-white/90 mb-2">
            {tip.title}
          </h3>
          <p className="text-[13px] text-white/50 leading-relaxed">
            {tip.description}
          </p>
        </div>
      </div>

      {/* Dot Navigation */}
      <div className="flex items-center justify-center gap-1.5 mt-4 pt-3 border-t border-amber-400/10">
        {CREATOR_TIPS.map((_, index) => (
          <button
            key={index}
            onClick={() => goToTip(index)}
            className="group relative p-1"
            aria-label={`Go to tip ${index + 1}`}
          >
            <div 
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                index === currentTip 
                  ? 'bg-amber-400 scale-125' 
                  : 'bg-white/20 group-hover:bg-white/40'
              }`}
            />
            {/* Progress indicator for current dot */}
            {index === currentTip && (
              <svg 
                className="absolute inset-0 w-full h-full -rotate-90"
                viewBox="0 0 24 24"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="8"
                  fill="none"
                  stroke="rgba(251, 191, 36, 0.3)"
                  strokeWidth="1.5"
                  className="animate-progress-ring"
                  style={{
                    strokeDasharray: '50.26',
                    strokeDashoffset: '50.26',
                    animation: 'progress-ring 5s linear forwards',
                  }}
                />
              </svg>
            )}
          </button>
        ))}
      </div>

      {/* Keyframe animation for progress ring */}
      <style jsx>{`
        @keyframes progress-ring {
          from {
            stroke-dashoffset: 50.26;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </div>
  );
}
