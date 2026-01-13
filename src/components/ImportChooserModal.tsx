"use client";

import { useState, useEffect } from "react";

interface ImportChooserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChooseFile: () => void;
  onEnterManually: () => void;
}

export function ImportChooserModal({
  isOpen,
  onClose,
  onChooseFile,
  onEnterManually,
}: ImportChooserModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className="relative w-full max-w-[400px] mx-4 rounded-2xl border border-white/[0.08] p-8"
        style={{ background: 'rgb(24, 24, 24)' }}
      >
        {/* Icon */}
        <div className="flex justify-center mb-5">
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255, 255, 255, 0.06)' }}
          >
            <ImportIcon className="w-5 h-5 text-white/60" />
          </div>
        </div>

        {/* Header */}
        <h2 className="text-[18px] font-medium text-white/90 text-center mb-2">
          Add people to your tribe
        </h2>
        <p className="text-[13px] text-white/40 text-center mb-8 leading-relaxed">
          Import a list of email addresses from a file or add them one by one.
        </p>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={onChooseFile}
            className="w-full px-5 py-3.5 rounded-[10px] text-[11px] font-medium tracking-[0.1em] uppercase btn-glass"
          >
            <span className="btn-glass-text">CHOOSE A FILE</span>
          </button>
          <button
            onClick={onEnterManually}
            className="w-full px-5 py-3.5 rounded-[10px] text-[11px] font-medium tracking-[0.1em] uppercase btn-glass-secondary"
          >
            <span className="btn-glass-text">ENTER MANUALLY</span>
          </button>
        </div>

        {/* Cancel */}
        <button
          onClick={onClose}
          className="w-full mt-4 py-2 text-[10px] font-medium tracking-[0.1em] uppercase text-white/30 hover:text-white/50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

interface ManualEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (email: string) => Promise<void>;
}

export function ManualEntryModal({
  isOpen,
  onClose,
  onAdd,
}: ManualEntryModalProps) {
  const [email, setEmail] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setEmail("");
      setError("");
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const validateEmail = (email: string) => {
    const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return pattern.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmedEmail = email.trim().toLowerCase();
    
    if (!trimmedEmail) {
      setError("Please enter an email address");
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsAdding(true);
    try {
      await onAdd(trimmedEmail);
      setEmail("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add email");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={!isAdding ? onClose : undefined}
      />
      
      {/* Modal */}
      <div 
        className="relative w-full max-w-[400px] mx-4 rounded-2xl border border-white/[0.08] p-8"
        style={{ background: 'rgb(24, 24, 24)' }}
      >
        {/* Header */}
        <h2 className="text-[18px] font-medium text-white/90 text-center mb-2">
          Add email manually
        </h2>
        <p className="text-[13px] text-white/40 text-center mb-6 leading-relaxed">
          Enter an email address to add to your tribe.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError("");
            }}
            placeholder="email@example.com"
            autoFocus
            className="w-full px-4 py-3 rounded-[10px] text-[14px] text-white/80 placeholder:text-white/25 focus:outline-none transition-colors border border-white/[0.08] mb-2"
            style={{ background: 'rgba(255, 255, 255, 0.04)' }}
            disabled={isAdding}
          />
          
          {error && (
            <p className="text-[12px] text-red-400/80 mb-4">{error}</p>
          )}

          {/* Info */}
          <p className="text-[11px] text-white/30 mb-6">
            A verification email will be sent to confirm their subscription.
          </p>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isAdding}
              className="flex-1 px-5 py-3 rounded-[10px] text-[10px] font-medium tracking-[0.1em] uppercase btn-glass-secondary"
            >
              <span className="btn-glass-text">CANCEL</span>
            </button>
            <button
              type="submit"
              disabled={isAdding || !email.trim()}
              className="flex-1 px-5 py-3 rounded-[10px] text-[11px] font-medium tracking-[0.1em] uppercase btn-glass"
            >
              <span className="btn-glass-text">{isAdding ? "ADDING..." : "ADD"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ImportIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 2V12M10 12L6 8M10 12L14 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3 13V15C3 16.1046 3.89543 17 5 17H15C16.1046 17 17 16.1046 17 15V13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
