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
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 2L20 3" />
      <path d="M3 2L4 3" />
      <path d="M21 16L20 15" />
      <path d="M3 16L4 15" />
      <path d="M9 18H15" />
      <path d="M10 21H14" />
      <path d="M11.9998 3C7.9997 3 5.95186 4.95029 5.99985 8C6.02324 9.48689 6.4997 10.5 7.49985 11.5C8.5 12.5 9 13 8.99985 15H14.9998C15 13.0001 15.5 12.5 16.4997 11.5001L16.4998 11.5C17.4997 10.5 17.9765 9.48689 17.9998 8C18.0478 4.95029 16 3 11.9998 3Z" />
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
      <div className="flex items-center justify-center gap-1.5 mt-4">
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
