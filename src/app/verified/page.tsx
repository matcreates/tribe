"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function VerifiedContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get("status");
  const message = searchParams.get("message");

  const isSuccess = status === "success";

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'rgb(18, 18, 18)' }}>
      <div 
        className="w-full max-w-[360px] rounded-[16px] border border-white/[0.08] p-8 text-center"
        style={{ background: 'rgba(255, 255, 255, 0.03)' }}
      >
        {isSuccess ? (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: 'rgba(45, 138, 138, 0.2)' }}>
              <CheckIcon className="w-8 h-8 text-[#2d8a8a]" />
            </div>
            <h1 className="text-[20px] font-medium text-white/90 mb-2">
              You&apos;re verified!
            </h1>
            <p className="text-[13px] text-white/50 leading-relaxed">
              Your email has been confirmed. You&apos;ll now receive updates from this tribe.
            </p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: 'rgba(239, 68, 68, 0.2)' }}>
              <XIcon className="w-8 h-8 text-red-400" />
            </div>
            <h1 className="text-[20px] font-medium text-white/90 mb-2">
              Verification failed
            </h1>
            <p className="text-[13px] text-white/50 leading-relaxed">
              {message === "invalid-token" 
                ? "This verification link is invalid or has already been used."
                : message === "missing-token"
                ? "No verification token provided."
                : "Something went wrong. Please try again."}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifiedPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'rgb(18, 18, 18)' }}>
        <p className="text-white/50">Loading...</p>
      </div>
    }>
      <VerifiedContent />
    </Suspense>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

