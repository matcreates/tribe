"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function UnsubscribedContent() {
  const searchParams = useSearchParams();
  const success = searchParams.get("success") === "true";
  const error = searchParams.get("error");

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'rgb(18, 18, 18)' }}>
      <div 
        className="w-full max-w-[360px] rounded-[16px] border border-white/[0.08] p-8 text-center"
        style={{ background: 'rgba(255, 255, 255, 0.03)' }}
      >
        {success ? (
          <>
            {/* Success Icon */}
            <div 
              className="w-14 h-14 rounded-full mx-auto mb-5 flex items-center justify-center"
              style={{ background: 'rgba(34, 197, 94, 0.15)' }}
            >
              <svg 
                className="w-7 h-7 text-emerald-400"
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>

            <h1 className="text-[20px] font-medium text-white/90 mb-3">
              You&apos;ve been unsubscribed
            </h1>
            <p className="text-[14px] text-white/50 leading-relaxed mb-6">
              You will no longer receive emails from this tribe. We&apos;re sorry to see you go!
            </p>

            <p className="text-[12px] text-white/30">
              Changed your mind?{" "}
              <a 
                href="/"
                className="text-white/50 underline hover:text-white/70 transition-colors"
              >
                Resubscribe anytime
              </a>
            </p>
          </>
        ) : (
          <>
            {/* Error Icon */}
            <div 
              className="w-14 h-14 rounded-full mx-auto mb-5 flex items-center justify-center"
              style={{ background: 'rgba(239, 68, 68, 0.15)' }}
            >
              <svg 
                className="w-7 h-7 text-red-400"
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M15 9l-6 6M9 9l6 6" />
              </svg>
            </div>

            <h1 className="text-[20px] font-medium text-white/90 mb-3">
              Something went wrong
            </h1>
            <p className="text-[14px] text-white/50 leading-relaxed">
              {error === "missing-token" && "The unsubscribe link is incomplete."}
              {error === "invalid-token" && "This unsubscribe link is invalid or has already been used."}
              {error === "server-error" && "An error occurred. Please try again later."}
              {!error && "Unable to process your unsubscribe request."}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function UnsubscribedPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'rgb(18, 18, 18)' }}>
        <p className="text-white/30 text-[13px]">Loading...</p>
      </div>
    }>
      <UnsubscribedContent />
    </Suspense>
  );
}

