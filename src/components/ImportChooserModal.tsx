"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/lib/theme";

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
  const { theme } = useTheme();
  const isLight = theme === 'light';

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
        className={`relative w-full max-w-[400px] mx-4 rounded-2xl border p-8 ${
          isLight ? 'border-black/[0.08]' : 'border-white/[0.08]'
        }`}
        style={{ background: isLight ? 'rgb(252, 250, 247)' : 'rgb(24, 24, 24)' }}
      >
        {/* Icon */}
        <div className="flex justify-center mb-5">
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.06)' }}
          >
            <ImportIcon className={`w-5 h-5 ${isLight ? 'text-black/50' : 'text-white/60'}`} />
          </div>
        </div>

        {/* Header */}
        <h2 className={`text-[18px] font-medium text-center mb-2 ${isLight ? 'text-black/85' : 'text-white/90'}`}>
          Add people to your tribe
        </h2>
        <p className={`text-[13px] text-center mb-8 leading-relaxed ${isLight ? 'text-black/50' : 'text-white/40'}`}>
          Import a list of email addresses from a file or add them one by one.
        </p>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={onChooseFile}
            className={`w-full px-5 py-3.5 rounded-[10px] text-[11px] font-medium tracking-[0.1em] uppercase transition-colors ${
              isLight 
                ? 'bg-black text-white hover:bg-black/90' 
                : 'btn-glass'
            }`}
          >
            <span className={isLight ? '' : 'btn-glass-text'}>CHOOSE A FILE</span>
          </button>
          <button
            onClick={onEnterManually}
            className={`w-full px-5 py-3.5 rounded-[10px] text-[11px] font-medium tracking-[0.1em] uppercase transition-colors ${
              isLight 
                ? 'bg-black/[0.06] text-black/70 hover:bg-black/[0.1]' 
                : 'btn-glass-secondary'
            }`}
          >
            <span className={isLight ? '' : 'btn-glass-text'}>ENTER MANUALLY</span>
          </button>
        </div>

        {/* Cancel */}
        <button
          onClick={onClose}
          className={`w-full mt-4 py-2 text-[10px] font-medium tracking-[0.1em] uppercase transition-colors ${
            isLight ? 'text-black/30 hover:text-black/50' : 'text-white/30 hover:text-white/50'
          }`}
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
  const { theme } = useTheme();
  const isLight = theme === 'light';
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
        className={`relative w-full max-w-[400px] mx-4 rounded-2xl border p-8 ${
          isLight ? 'border-black/[0.08]' : 'border-white/[0.08]'
        }`}
        style={{ background: isLight ? 'rgb(252, 250, 247)' : 'rgb(24, 24, 24)' }}
      >
        {/* Header */}
        <h2 className={`text-[18px] font-medium text-center mb-2 ${isLight ? 'text-black/85' : 'text-white/90'}`}>
          Add email manually
        </h2>
        <p className={`text-[13px] text-center mb-6 leading-relaxed ${isLight ? 'text-black/50' : 'text-white/40'}`}>
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
            className={`w-full px-4 py-3 rounded-[10px] text-[14px] focus:outline-none transition-colors border mb-2 ${
              isLight 
                ? 'text-black/80 placeholder:text-black/30 border-black/[0.08] bg-black/[0.03]' 
                : 'text-white/80 placeholder:text-white/25 border-white/[0.08]'
            }`}
            style={{ background: isLight ? undefined : 'rgba(255, 255, 255, 0.04)' }}
            disabled={isAdding}
          />
          
          {error && (
            <p className="text-[12px] text-red-400/80 mb-4">{error}</p>
          )}

          {/* Info */}
          <p className={`text-[11px] mb-6 ${isLight ? 'text-black/30' : 'text-white/30'}`}>
            A verification email will be sent to confirm their spot.
          </p>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isAdding}
              className={`flex-1 px-5 py-3 rounded-[10px] text-[10px] font-medium tracking-[0.1em] uppercase transition-colors ${
                isLight 
                  ? 'bg-black/[0.06] text-black/70 hover:bg-black/[0.1]' 
                  : 'btn-glass-secondary'
              }`}
            >
              <span className={isLight ? '' : 'btn-glass-text'}>CANCEL</span>
            </button>
            <button
              type="submit"
              disabled={isAdding || !email.trim()}
              className={`flex-1 px-5 py-3 rounded-[10px] text-[11px] font-medium tracking-[0.1em] uppercase transition-colors disabled:opacity-40 ${
                isLight 
                  ? 'bg-black text-white hover:bg-black/90' 
                  : 'btn-glass'
              }`}
            >
              <span className={isLight ? '' : 'btn-glass-text'}>{isAdding ? "ADDING..." : "ADD"}</span>
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
