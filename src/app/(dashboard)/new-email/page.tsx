"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getRecipientCounts, sendEmail, scheduleEmail, RecipientFilter } from "@/lib/actions";
import { Toast, useToast } from "@/components/Toast";
import { EmailSentSuccess } from "@/components/EmailSentSuccess";
import { ScheduleModal } from "@/components/ScheduleModal";
import { useRouter } from "next/navigation";

export default function NewEmailPage() {
  const router = useRouter();
  const [counts, setCounts] = useState({ verified: 0, nonVerified: 0, all: 0 });
  const [recipientFilter, setRecipientFilter] = useState<RecipientFilter>("verified");
  const [isSending, setIsSending] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastSentCount, setLastSentCount] = useState(0);
  const [isEmpty, setIsEmpty] = useState(true);
  const { toast, showToast, hideToast } = useToast();
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadCounts();
  }, []);

  const loadCounts = async () => {
    try {
      const result = await getRecipientCounts();
      setCounts(result);
    } catch (error) {
      console.error("Failed to load recipient counts:", error);
    }
  };

  const getCurrentCount = () => {
    switch (recipientFilter) {
      case "verified": return counts.verified;
      case "non-verified": return counts.nonVerified;
      case "all": return counts.all;
    }
  };

  // Get plain text content from editor
  const getPlainText = useCallback(() => {
    if (!editorRef.current) return "";
    return editorRef.current.innerText || "";
  }, []);

  // Get HTML content from editor
  const getHtmlContent = useCallback(() => {
    if (!editorRef.current) return "";
    return editorRef.current.innerHTML || "";
  }, []);

  // Handle input and auto-format
  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    
    const text = getPlainText();
    setIsEmpty(!text.trim());
  }, [getPlainText]);

  // Handle key events for smart formatting
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!editorRef.current) return;

    // Handle Enter key for list continuation
    if (e.key === "Enter") {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      
      const range = selection.getRangeAt(0);
      const node = range.startContainer;
      const textContent = node.textContent || "";
      
      // Check if current line starts with bullet
      const lines = textContent.split("\n");
      const cursorPos = range.startOffset;
      let charCount = 0;
      let currentLineIndex = 0;
      
      for (let i = 0; i < lines.length; i++) {
        if (charCount + lines[i].length >= cursorPos) {
          currentLineIndex = i;
          break;
        }
        charCount += lines[i].length + 1;
      }
      
      const currentLine = lines[currentLineIndex] || "";
      const bulletMatch = currentLine.match(/^(\s*[-•*]\s*)/);
      
      if (bulletMatch) {
        // If line only has bullet, remove it
        if (currentLine.trim() === "-" || currentLine.trim() === "•" || currentLine.trim() === "*") {
          e.preventDefault();
          document.execCommand("delete");
          document.execCommand("delete");
          document.execCommand("insertLineBreak");
          return;
        }
        
        // Continue bullet on next line
        e.preventDefault();
        document.execCommand("insertLineBreak");
        document.execCommand("insertText", false, bulletMatch[1].trim() + " ");
      }
    }

    // Auto-format bullets when typing "- " at start of line
    if (e.key === " ") {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      
      const range = selection.getRangeAt(0);
      const node = range.startContainer;
      
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || "";
        const offset = range.startOffset;
        
        // Check if we just typed "- " at start or after newline
        const beforeCursor = text.slice(0, offset);
        const lastNewline = beforeCursor.lastIndexOf("\n");
        const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;
        const lineText = beforeCursor.slice(lineStart);
        
        if (lineText === "-" || lineText === "*") {
          e.preventDefault();
          // Replace with bullet
          const before = text.slice(0, lineStart);
          const after = text.slice(offset);
          node.textContent = before + "• " + after;
          
          // Move cursor after bullet
          const newRange = document.createRange();
          newRange.setStart(node, lineStart + 2);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      }
    }
  }, []);

  // Paste as plain text and auto-detect links
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    
    // Insert plain text
    document.execCommand("insertText", false, text);
    
    // Trigger input handler
    handleInput();
  }, [handleInput]);

  // Format content for display (linkify URLs)
  const formatContent = useCallback((html: string) => {
    // URL regex
    const urlRegex = /(https?:\/\/[^\s<]+)/g;
    
    // Replace URLs with underlined spans
    return html.replace(urlRegex, '<span class="underline text-white/70">$1</span>');
  }, []);

  // Handle blur to format links
  const handleBlur = useCallback(() => {
    if (!editorRef.current) return;
    
    const selection = window.getSelection();
    const savedRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;
    
    const content = editorRef.current.innerHTML;
    const formatted = formatContent(content);
    
    if (formatted !== content) {
      editorRef.current.innerHTML = formatted;
    }
    
    // Restore cursor position if possible
    if (savedRange && selection) {
      try {
        selection.removeAllRanges();
        selection.addRange(savedRange);
      } catch {
        // Cursor restore failed, that's ok
      }
    }
  }, [formatContent]);

  const handleSend = async () => {
    const body = getPlainText();
    if (!body.trim() || isSending) return;

    const count = getCurrentCount();
    if (count === 0) {
      showToast("No recipients to send to");
      return;
    }

    setIsSending(true);
    
    try {
      // Extract first line as subject
      const lines = body.trim().split("\n");
      const subject = lines[0].slice(0, 60) || "Untitled";
      
      const result = await sendEmail(subject, body, recipientFilter);
      
      if (editorRef.current) {
        editorRef.current.innerHTML = "";
      }
      setIsEmpty(true);
      setLastSentCount(result.sentCount);
      setShowSuccess(true);
      router.refresh();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to send email";
      showToast(msg);
    } finally {
      setIsSending(false);
    }
  };

  const handleSchedule = async (scheduledAt: Date) => {
    const body = getPlainText();
    if (!body.trim() || isScheduling) return;

    const count = getCurrentCount();
    if (count === 0) {
      showToast("No recipients to send to");
      return;
    }

    setIsScheduling(true);
    
    try {
      // Extract first line as subject
      const lines = body.trim().split("\n");
      const subject = lines[0].slice(0, 60) || "Untitled";
      
      await scheduleEmail(subject, body, scheduledAt, recipientFilter);
      
      if (editorRef.current) {
        editorRef.current.innerHTML = "";
      }
      setIsEmpty(true);
      setShowScheduleModal(false);
      
      // Format the scheduled time for toast
      const formattedDate = scheduledAt.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
      showToast(`Email scheduled for ${formattedDate}`);
      router.refresh();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to schedule email";
      showToast(msg);
    } finally {
      setIsScheduling(false);
    }
  };

  if (showSuccess) {
    return (
      <EmailSentSuccess 
        sentCount={lastSentCount} 
        onClose={() => setShowSuccess(false)} 
      />
    );
  }

  return (
    <div className="flex flex-col items-center pt-14 px-6">
      <div className="w-full max-w-[540px]">
        {/* Header */}
        <h1 className="text-[20px] font-medium text-white/90 mb-5">
          Send an email
        </h1>

        {/* Recipient Selector */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-[13px] text-white/40">to</span>
          <div className="relative">
            <select
              value={recipientFilter}
              onChange={(e) => setRecipientFilter(e.target.value as RecipientFilter)}
              className="appearance-none px-3.5 py-2 pr-9 rounded-[8px] text-[13px] text-white/60 focus:outline-none cursor-pointer border border-white/[0.06]"
              style={{ background: 'rgba(255, 255, 255, 0.04)' }}
            >
              <option value="verified">All verified ({counts.verified})</option>
              <option value="all">All subscribers ({counts.all})</option>
              <option value="non-verified">Non-verified only ({counts.nonVerified})</option>
            </select>
            <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/35 pointer-events-none" />
          </div>
        </div>

        {/* Smart Editor */}
        <div className="relative mb-5">
          <div
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onBlur={handleBlur}
            className="w-full min-h-[200px] px-4 py-3 rounded-[10px] text-[14px] leading-relaxed text-white/70 focus:outline-none transition-colors whitespace-pre-wrap break-words border border-white/[0.06]"
            style={{ background: 'rgba(255, 255, 255, 0.02)' }}
            suppressContentEditableWarning
          />
          {isEmpty && (
            <div className="absolute left-4 top-3 text-[14px] text-white/25 pointer-events-none">
              Write your email...
            </div>
          )}
        </div>

        {/* Helper text */}
        <p className="text-[11px] text-white/25 mb-5">
          Links are auto-detected • Type <span className="text-white/35">-</span> for bullet lists
        </p>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSend}
            disabled={isSending || isScheduling || isEmpty || getCurrentCount() === 0}
            className="px-5 py-2 rounded-[8px] text-[11px] font-medium tracking-[0.1em] text-white/60 transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/[0.08]"
            style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.06)' }}
          >
            {isSending ? "SENDING..." : "SEND"}
          </button>
          <button
            onClick={() => setShowScheduleModal(true)}
            disabled={isSending || isScheduling || isEmpty || getCurrentCount() === 0}
            className="flex items-center gap-2 px-5 py-2 rounded-[8px] text-[11px] font-medium tracking-[0.1em] text-white/60 transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/[0.08]"
            style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.06)' }}
          >
            <ClockIcon className="w-3.5 h-3.5" />
            SCHEDULE
          </button>
        </div>

        {getCurrentCount() === 0 && (
          <p className="mt-3 text-[12px] text-white/30">
            {recipientFilter === "verified" 
              ? "No verified subscribers yet" 
              : recipientFilter === "non-verified"
              ? "No non-verified subscribers"
              : "Add subscribers to your tribe first"}
          </p>
        )}

        <Toast message={toast.message} isVisible={toast.visible} onClose={hideToast} />
      </div>

      {/* Schedule Modal */}
      <ScheduleModal
        isOpen={showScheduleModal}
        isScheduling={isScheduling}
        onClose={() => setShowScheduleModal(false)}
        onSchedule={handleSchedule}
      />
    </div>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6l4 4 4-4" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6.5" />
      <path d="M8 4v4l2.5 2.5" />
    </svg>
  );
}
