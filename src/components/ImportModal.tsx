"use client";

import { useEffect } from "react";

export interface ImportPreview {
  totalInFile: number;
  duplicates: number;
  invalid: number;
  toImport: number;
  emails: string[];
  invalidEmails: string[];
  duplicateEmails: string[];
}

interface ImportModalProps {
  isOpen: boolean;
  preview: ImportPreview | null;
  isImporting: boolean;
  onClose: () => void;
  onImportWithVerification: () => void;
  onImportWithoutVerification: () => void;
}

export function ImportModal({
  isOpen,
  preview,
  isImporting,
  onClose,
  onImportWithVerification,
  onImportWithoutVerification,
}: ImportModalProps) {
  // Prevent body scroll when modal is open
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

  if (!isOpen || !preview) return null;

  const hasEmailsToImport = preview.toImport > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={!isImporting ? onClose : undefined}
      />
      
      {/* Modal */}
      <div 
        className="relative w-full max-w-[420px] mx-4 rounded-2xl border border-white/[0.08] p-6"
        style={{ background: 'rgb(24, 24, 24)' }}
      >
        {/* Header - Show NEW people count */}
        <p className="text-center text-[15px] text-white/80 mb-5">
          We found <span className="font-semibold text-white">{preview.toImport} new {preview.toImport === 1 ? 'person' : 'people'}</span> in your file.
        </p>

        {/* Stats - Always show details */}
        <div className="mb-5 p-4 rounded-xl border border-white/[0.06]" style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
          <p className="text-[13px] text-white/50 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
            {preview.totalInFile} total in file
          </p>
          {preview.duplicates > 0 && (
            <p className="text-[13px] text-white/50 flex items-center gap-2 mt-2">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500/70" />
              {preview.duplicates} already in your tribe
            </p>
          )}
          {preview.invalid > 0 && (
            <p className="text-[13px] text-white/50 flex items-center gap-2 mt-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500/70" />
              {preview.invalid} invalid email{preview.invalid > 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Main info box */}
        <div 
          className="p-5 rounded-xl border border-white/[0.08] mb-5"
          style={{ background: 'rgba(255, 255, 255, 0.03)' }}
        >
          <div className="flex items-start gap-3">
            <CheckCircleIcon className="w-5 h-5 text-white/60 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-[14px] font-medium text-white/90 mb-2">Verification</h3>
              <p className="text-[13px] text-white/50 leading-relaxed">
                You can either automatically send a verification email to everyone in that list, 
                or add them to your tribe without sending verification emails.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {hasEmailsToImport ? (
          <div className="flex gap-3 mb-4">
            <button
              onClick={onImportWithVerification}
              disabled={isImporting}
              className="flex-1 px-5 py-2.5 rounded-[20px] text-[10px] font-medium tracking-[0.12em] uppercase border border-white/[0.08] text-white/60 hover:text-white/80 hover:bg-white/[0.05] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'rgba(255, 255, 255, 0.03)' }}
            >
              {isImporting ? "IMPORTING..." : "ADD WITH VERIFICATION"}
            </button>
            <button
              onClick={onImportWithoutVerification}
              disabled={isImporting}
              className="flex-1 px-5 py-2.5 rounded-[20px] text-[10px] font-medium tracking-[0.12em] uppercase text-white/90 hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'rgba(255, 255, 255, 0.12)' }}
            >
              {isImporting ? "IMPORTING..." : "ADD WITHOUT VERIFICATION"}
            </button>
          </div>
        ) : (
          <div className="mb-4 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-center">
            <p className="text-[13px] text-amber-200/70">
              No new emails to import. All emails are either duplicates or invalid.
            </p>
          </div>
        )}

        {/* Cancel */}
        <button
          onClick={onClose}
          disabled={isImporting}
          className="w-full py-2.5 text-[10px] font-medium tracking-[0.12em] uppercase text-white/40 hover:text-white/60 transition-colors disabled:opacity-50"
        >
          CANCEL
        </button>

        {/* Importing overlay */}
        {isImporting && (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/50">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-white/20 border-t-white/70 rounded-full animate-spin" />
              <p className="text-[13px] text-white/60">Importing...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M7 10L9 12L13 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

