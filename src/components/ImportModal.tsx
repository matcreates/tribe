"use client";

import { useEffect, useState } from "react";
import { ContactSupportModal } from "./ContactSupportModal";
import { useTheme } from "@/lib/theme";

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

const MAX_IMPORT_LIMIT = 10000;

export function ImportModal({
  isOpen,
  preview,
  isImporting,
  onClose,
  onImportWithVerification,
  onImportWithoutVerification,
}: ImportModalProps) {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [showContactSupport, setShowContactSupport] = useState(false);
  
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
  const exceedsLimit = preview.toImport > MAX_IMPORT_LIMIT;

  // Show contact support modal for imports over 10,000
  if (exceedsLimit) {
    return (
      <>
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />
          <div 
            className={`relative w-full max-w-[420px] mx-4 rounded-2xl border p-8 ${isLight ? 'border-black/[0.08]' : 'border-white/[0.08]'}`}
            style={{ background: isLight ? 'rgb(252, 250, 247)' : 'rgb(24, 24, 24)' }}
          >
            <div className="text-center">
              <div 
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(234, 179, 8, 0.15)' }}
              >
                <svg className="w-7 h-7 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 9v4" />
                  <path d="M12 17h.01" />
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <h3 className={`text-[18px] font-medium mb-2 ${isLight ? 'text-black/85' : 'text-white/90'}`}>Import limit exceeded</h3>
              <p className={`text-[14px] mb-2 ${isLight ? 'text-black/50' : 'text-white/50'}`}>
                Your file contains <span className={`font-medium ${isLight ? 'text-black/80' : 'text-white/80'}`}>{preview.toImport.toLocaleString()}</span> contacts.
              </p>
              <p className={`text-[13px] mb-6 ${isLight ? 'text-black/40' : 'text-white/40'}`}>
                The maximum import limit is {MAX_IMPORT_LIMIT.toLocaleString()} contacts at a time. Please contact support for bulk imports.
              </p>
              <button
                onClick={() => setShowContactSupport(true)}
                className={`w-full py-3 rounded-[10px] text-[11px] font-medium tracking-[0.1em] uppercase mb-3 ${
                  isLight ? 'bg-black text-white hover:bg-black/90' : 'btn-glass'
                }`}
              >
                <span className={isLight ? '' : 'btn-glass-text'}>Contact Support</span>
              </button>
              <button
                onClick={onClose}
                className={`w-full py-3 text-[11px] font-medium tracking-[0.1em] uppercase transition-colors ${
                  isLight ? 'text-black/40 hover:text-black/60' : 'text-white/40 hover:text-white/60'
                }`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
        <ContactSupportModal
          isOpen={showContactSupport}
          onClose={() => setShowContactSupport(false)}
          reason={`Bulk import request: ${preview.toImport.toLocaleString()} contacts`}
        />
      </>
    );
  }

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={!isImporting ? onClose : undefined}
      />
      
      {/* Modal */}
      <div 
        className={`relative w-full max-w-[520px] mx-4 rounded-2xl border p-8 ${isLight ? 'border-black/[0.08]' : 'border-white/[0.08]'}`}
        style={{ background: isLight ? 'rgb(252, 250, 247)' : 'rgb(24, 24, 24)' }}
      >
        {/* Header - Show NEW people count */}
        <p className={`text-center text-[16px] mb-6 ${isLight ? 'text-black/80' : 'text-white/80'}`}>
          We found <span className={`font-semibold ${isLight ? 'text-black' : 'text-white'}`}>{preview.toImport} new {preview.toImport === 1 ? 'person' : 'people'}</span> in your file.
        </p>

        {/* Stats - Always show details */}
        <div 
          className={`mb-6 p-5 rounded-xl border ${isLight ? 'border-black/[0.06]' : 'border-white/[0.06]'}`}
          style={{ background: isLight ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.02)' }}
        >
          <p className={`text-[13px] flex items-center gap-2.5 ${isLight ? 'text-black/50' : 'text-white/50'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isLight ? 'bg-black/40' : 'bg-white/40'}`} />
            {preview.totalInFile} {preview.totalInFile === 1 ? 'email' : 'emails'} found in the file
          </p>
          {preview.duplicates > 0 && (
            <p className={`text-[13px] flex items-center gap-2.5 mt-2.5 ${isLight ? 'text-black/50' : 'text-white/50'}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500/70" />
              {preview.duplicates} already in your tribe
            </p>
          )}
          {preview.invalid > 0 && (
            <p className={`text-[13px] flex items-center gap-2.5 mt-2.5 ${isLight ? 'text-black/50' : 'text-white/50'}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-red-500/70" />
              {preview.invalid} invalid {preview.invalid === 1 ? 'email' : 'emails'}
            </p>
          )}
        </div>

        {/* Main info box */}
        <div 
          className={`p-5 rounded-xl border mb-6 ${isLight ? 'border-black/[0.08]' : 'border-white/[0.08]'}`}
          style={{ background: isLight ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.03)' }}
        >
          <div className="flex items-start gap-3">
            <CheckCircleIcon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isLight ? 'text-black/50' : 'text-white/60'}`} />
            <div>
              <h3 className={`text-[14px] font-medium mb-2 ${isLight ? 'text-black/85' : 'text-white/90'}`}>Verification</h3>
              <p className={`text-[13px] leading-relaxed ${isLight ? 'text-black/50' : 'text-white/50'}`}>
                You can either automatically send a verification email to everyone in that list, 
                or add them to your tribe without sending verification emails.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {hasEmailsToImport ? (
          <div className="flex gap-3 mb-5">
            <button
              onClick={onImportWithVerification}
              disabled={isImporting}
              className={`flex-1 px-5 py-3 rounded-[10px] text-[10px] font-medium tracking-[0.12em] uppercase transition-colors ${
                isLight 
                  ? 'bg-black/[0.06] text-black/70 hover:bg-black/[0.1]' 
                  : 'btn-glass-secondary'
              }`}
            >
              <span className={isLight ? '' : 'btn-glass-text'}>{isImporting ? "IMPORTING..." : "ADD WITH VERIFICATION"}</span>
            </button>
            <button
              onClick={onImportWithoutVerification}
              disabled={isImporting}
              className={`flex-1 px-5 py-3 rounded-[10px] text-[10px] font-medium tracking-[0.12em] uppercase transition-colors ${
                isLight 
                  ? 'bg-black text-white hover:bg-black/90' 
                  : 'btn-glass'
              }`}
            >
              <span className={isLight ? '' : 'btn-glass-text'}>{isImporting ? "IMPORTING..." : "ADD WITHOUT VERIFICATION"}</span>
            </button>
          </div>
        ) : (
          <div className="mb-5 p-5 rounded-xl border border-amber-500/20 bg-amber-500/5 text-center">
            <p className="text-[13px] text-amber-200/70">
              No new emails to import. All emails are either duplicates or invalid.
            </p>
          </div>
        )}

        {/* Cancel */}
        <button
          onClick={onClose}
          disabled={isImporting}
          className={`w-full py-3 text-[10px] font-medium tracking-[0.12em] uppercase transition-colors ${
            isLight ? 'text-black/40 hover:text-black/60' : 'text-white/40 hover:text-white/60'
          }`}
        >
          CANCEL
        </button>

        {/* Importing overlay */}
        {isImporting && (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/50">
            <div className="flex flex-col items-center gap-3">
              <div className={`w-8 h-8 border-2 rounded-full animate-spin ${isLight ? 'border-black/20 border-t-black/70' : 'border-white/20 border-t-white/70'}`} />
              <p className={`text-[13px] ${isLight ? 'text-black/60' : 'text-white/60'}`}>Importing...</p>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
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
