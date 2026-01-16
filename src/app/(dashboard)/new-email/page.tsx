"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getRecipientCounts, sendEmail, scheduleEmail, getEmailSignature, getSubscriptionStatus, sendTestEmailAction, RecipientFilter, SubscriptionStatus } from "@/lib/actions";
import { Toast, useToast } from "@/components/Toast";
import { EmailSentSuccess } from "@/components/EmailSentSuccess";
import { ScheduleModal } from "@/components/ScheduleModal";
import { PaywallModal } from "@/components/PaywallModal";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function NewEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [counts, setCounts] = useState({ verified: 0, nonVerified: 0, all: 0 });
  const [recipientFilter, setRecipientFilter] = useState<RecipientFilter>("verified");
  const [isSending, setIsSending] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastSentCount, setLastSentCount] = useState(0);
  const [isEmpty, setIsEmpty] = useState(true);
  const [signature, setSignature] = useState<string | null>(null);
  const [allowReplies, setAllowReplies] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [subject, setSubject] = useState("");
  const [showTestModal, setShowTestModal] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testEmailError, setTestEmailError] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testEmailSent, setTestEmailSent] = useState(false);
  const { toast, showToast, hideToast } = useToast();
  const editorRef = useRef<HTMLDivElement>(null);

  const hasSignature = !!signature?.trim();

  useEffect(() => {
    loadCounts();
    loadSignature();
    
    // Check for subscription success from Stripe redirect
    const subscriptionParam = searchParams.get('subscription');
    if (subscriptionParam === 'success') {
      // Sync subscription status from Stripe (fallback if webhook didn't work)
      syncAndLoadSubscription();
      // Remove the query param
      router.replace('/new-email');
    } else {
      loadSubscription();
    }
  }, []);

  const syncAndLoadSubscription = async () => {
    try {
      // Call the verify endpoint to sync subscription from Stripe
      const response = await fetch('/api/stripe/verify-subscription', {
        method: 'POST',
      });
      const data = await response.json();
      
      if (data.synced && data.status === 'active') {
        showToast("Subscription activated! You can now send emails.");
        setShowPaywall(false);
      }
      
      // Now load the subscription status from our database
      const status = await getSubscriptionStatus();
      setSubscription(status);
      
      if (!status.canSendEmails) {
        setShowPaywall(true);
      } else {
        setShowPaywall(false);
      }
    } catch (error) {
      console.error("Failed to sync subscription:", error);
      loadSubscription();
    }
  };

  const loadCounts = async () => {
    try {
      const result = await getRecipientCounts();
      setCounts(result);
    } catch (error) {
      console.error("Failed to load recipient counts:", error);
    }
  };

  const loadSignature = async () => {
    try {
      const sig = await getEmailSignature();
      setSignature(sig);
    } catch (error) {
      console.error("Failed to load signature:", error);
    }
  };

  const loadSubscription = async () => {
    try {
      const status = await getSubscriptionStatus();
      setSubscription(status);
      // Don't show paywall on load - only when trying to send/schedule
    } catch (error) {
      console.error("Failed to load subscription:", error);
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
    if (!body.trim() || !subject.trim() || isSending) return;

    // Check subscription before sending
    if (!subscription?.canSendEmails) {
      setShowPaywall(true);
      return;
    }

    const count = getCurrentCount();
    if (count === 0) {
      showToast("No recipients to send to");
      return;
    }

    setIsSending(true);
    
    try {
      const result = await sendEmail(subject.trim(), body, recipientFilter, allowReplies);
      
      if (editorRef.current) {
        editorRef.current.innerHTML = "";
      }
      setIsEmpty(true);
      setSubject("");
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
    if (!body.trim() || !subject.trim() || isScheduling) return;

    // Check subscription before scheduling
    if (!subscription?.canSendEmails) {
      setShowPaywall(true);
      setShowScheduleModal(false);
      return;
    }

    const count = getCurrentCount();
    if (count === 0) {
      showToast("No recipients to send to");
      return;
    }

    setIsScheduling(true);
    
    try {
      await scheduleEmail(subject.trim(), body, scheduledAt, recipientFilter, allowReplies);
      
      if (editorRef.current) {
        editorRef.current.innerHTML = "";
      }
      setIsEmpty(true);
      setSubject("");
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

  const handleSendTest = async () => {
    const body = getPlainText();
    if (!body.trim() || !subject.trim() || !testEmail.trim()) return;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(testEmail.trim())) {
      setTestEmailError("Please enter a valid email address");
      return;
    }

    setIsSendingTest(true);
    setTestEmailError("");
    
    try {
      const result = await sendTestEmailAction(testEmail.trim(), subject.trim(), body);
      
      if (!result.success) {
        setTestEmailError(result.error || "Failed to send test email");
      } else {
        setTestEmailSent(true);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to send test email";
      setTestEmailError(msg);
    } finally {
      setIsSendingTest(false);
    }
  };

  const closeTestModal = () => {
    setShowTestModal(false);
    setTestEmail("");
    setTestEmailError("");
    setTestEmailSent(false);
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
    <>
      {/* Paywall Modal */}
      <PaywallModal 
        isOpen={showPaywall} 
        onClose={() => setShowPaywall(false)}
      />

      {/* Test Email Modal */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={closeTestModal}
          />
          <div 
            className="relative w-full max-w-[400px] mx-4 rounded-[16px] p-6"
            style={{ background: 'rgb(24, 24, 24)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {/* Close button */}
            <button
              onClick={closeTestModal}
              className="absolute top-4 right-4 p-1 text-white/40 hover:text-white/60 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M5 5l10 10M15 5L5 15" />
              </svg>
            </button>

            {!testEmailSent ? (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(139, 92, 246, 0.15)' }}
                  >
                    <TestTubeIcon className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-[16px] font-medium text-white/90">Send test email</h3>
                    <p className="text-[12px] text-white/40">Preview how your email will look</p>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-[11px] text-white/40 uppercase tracking-[0.08em] mb-2">
                    Send to
                  </label>
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(e) => {
                      setTestEmail(e.target.value);
                      setTestEmailError("");
                    }}
                    placeholder="your@email.com"
                    className="w-full px-4 py-3 rounded-[10px] text-[14px] text-white/80 placeholder:text-white/25 focus:outline-none border border-white/[0.06] transition-colors focus:border-white/[0.12]"
                    style={{ background: 'rgba(255, 255, 255, 0.03)' }}
                    autoFocus
                  />
                  {testEmailError && (
                    <p className="mt-2 text-[12px] text-red-400">{testEmailError}</p>
                  )}
                </div>

                <button
                  onClick={handleSendTest}
                  disabled={isSendingTest || !testEmail.trim()}
                  className="w-full py-3 rounded-[10px] text-[11px] font-medium tracking-[0.1em] uppercase btn-glass disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="btn-glass-text">{isSendingTest ? "SENDING..." : "SEND TEST EMAIL"}</span>
                </button>
              </>
            ) : (
              <div className="text-center py-4">
                <div 
                  className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ background: 'rgba(34, 197, 94, 0.15)' }}
                >
                  <CheckCircleIcon className="w-7 h-7 text-emerald-400" />
                </div>
                <h3 className="text-[16px] font-medium text-white/90 mb-2">Test email sent!</h3>
                <p className="text-[13px] text-white/50 mb-4">
                  Sent to <span className="text-white/70">{testEmail}</span>
                </p>
                <div 
                  className="p-4 rounded-[10px] mb-5 text-left"
                  style={{ background: 'rgba(234, 179, 8, 0.08)', border: '1px solid rgba(234, 179, 8, 0.2)' }}
                >
                  <p className="text-[12px] text-amber-200/80 leading-relaxed">
                    💡 The email might take a couple of minutes to arrive. Remember to check your Junk/Spam folder if you don&apos;t see it in your inbox.
                  </p>
                </div>
                <button
                  onClick={closeTestModal}
                  className="w-full py-3 rounded-[10px] text-[11px] font-medium tracking-[0.1em] uppercase btn-glass"
                >
                  <span className="btn-glass-text">BACK TO WRITING</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col items-center pt-14 px-6">
        <div className="w-full max-w-[540px]">
          {/* Header */}
          <h1 className="text-[20px] font-medium text-white/90 mb-5">
            Write
          </h1>

          {/* Free user info banner */}
          {subscription && !subscription.canSendEmails && (
            <div 
              className="flex items-center gap-3 p-4 rounded-[10px] border border-amber-500/20 mb-5"
              style={{ background: 'rgba(234, 179, 8, 0.08)' }}
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(234, 179, 8, 0.15)' }}>
                <InfoIcon className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-[13px] text-amber-200/80">
                Sending emails is only available for Premium users. <button onClick={() => setShowPaywall(true)} className="underline hover:text-amber-100 transition-colors">Upgrade now</button>
              </p>
            </div>
          )}

          {/* Subject Field */}
          <div className="mb-4">
            <label className="block text-[11px] text-white/40 uppercase tracking-[0.08em] mb-2">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter email subject..."
              className="w-full px-4 py-3 rounded-[10px] text-[14px] text-white/80 placeholder:text-white/25 focus:outline-none border border-white/[0.06] transition-colors focus:border-white/[0.12]"
              style={{ background: 'rgba(255, 255, 255, 0.03)' }}
            />
          </div>

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

        {/* Allow Replies Toggle */}
        <div 
          className="flex items-center justify-between p-4 rounded-[10px] border border-white/[0.06] mb-5"
          style={{ background: 'rgba(255, 255, 255, 0.02)' }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: allowReplies ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.05)' }}
            >
              <ReplyToggleIcon className={`w-4 h-4 ${allowReplies ? 'text-emerald-400' : 'text-white/40'}`} />
            </div>
            <div>
              <p className="text-[13px] text-white/70">Allow replies</p>
              <p className="text-[11px] text-white/30">Subscribers can reply to this email</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAllowReplies(!allowReplies)}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              allowReplies ? 'bg-emerald-500/60' : 'bg-white/10'
            }`}
          >
            <span 
              className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                allowReplies ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleSend}
            disabled={isSending || isScheduling || isEmpty || !subject.trim() || getCurrentCount() === 0}
            className="px-6 py-2.5 rounded-[10px] text-[10px] font-medium tracking-[0.12em] uppercase btn-glass"
          >
            <span className="btn-glass-text">{isSending ? "SENDING..." : "SEND"}</span>
          </button>
          <button
            onClick={() => setShowScheduleModal(true)}
            disabled={isSending || isScheduling || isEmpty || !subject.trim() || getCurrentCount() === 0}
            className="flex items-center gap-2 px-6 py-2.5 rounded-[10px] text-[10px] font-medium tracking-[0.12em] uppercase btn-glass-secondary"
          >
            <ClockIcon className="w-3 h-3 text-white/60" />
            <span className="btn-glass-text">SCHEDULE</span>
          </button>
          <button
            onClick={() => setShowTestModal(true)}
            disabled={isSending || isScheduling || isEmpty || !subject.trim()}
            className="flex items-center gap-2 px-6 py-2.5 rounded-[10px] text-[10px] font-medium tracking-[0.12em] uppercase border border-white/[0.08] text-white/50 hover:text-white/70 hover:border-white/[0.12] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'rgba(255, 255, 255, 0.02)' }}
          >
            <TestTubeIcon className="w-3 h-3" />
            <span>SEND TEST</span>
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

        {/* Signature Preview or Prompt */}
        {hasSignature ? (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] text-white/30 uppercase tracking-[0.08em]">Your signature</p>
              <Link
                href="/settings"
                className="text-[11px] text-white/40 hover:text-white/60 transition-colors underline"
              >
                Edit
              </Link>
            </div>
            <div 
              className="p-4 rounded-[10px] border border-white/[0.06]"
              style={{ background: 'rgba(255, 255, 255, 0.02)' }}
            >
              <div 
                className="text-[13px] text-white/40 leading-relaxed whitespace-pre-wrap [&_a]:text-[#E8B84A] [&_a]:underline"
                dangerouslySetInnerHTML={{ 
                  __html: (signature || '')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>')
                }}
              />
            </div>
            <p className="text-[10px] text-white/20 mt-2">
              This will be added at the end of your email
            </p>
          </div>
        ) : (
          <div 
            className="mt-6 p-4 rounded-[10px] border border-white/[0.06] flex items-center justify-between gap-4"
            style={{ background: 'rgba(255, 255, 255, 0.02)' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255, 255, 255, 0.05)' }}>
                <SignatureIcon className="w-4 h-4 text-white/40" />
              </div>
              <div>
                <p className="text-[13px] text-white/60">Add your email signature</p>
                <p className="text-[11px] text-white/30">Automatically added to every email</p>
              </div>
            </div>
            <Link
              href="/settings"
              className="px-4 py-2 rounded-[10px] text-[10px] font-medium tracking-[0.12em] uppercase btn-glass"
            >
              <span className="btn-glass-text">SETUP</span>
            </Link>
          </div>
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
    </>
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

function SignatureIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12c1.5-2 3-4.5 4-4.5s2 3 3 3 2.5-3 4-5" />
      <line x1="2" y1="14" x2="14" y2="14" />
    </svg>
  );
}

function ReplyToggleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 5L2 8l4 3" />
      <path d="M2 8h8a3 3 0 0 1 3 3v2" />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6.5" />
      <path d="M8 11V7" />
      <circle cx="8" cy="4.5" r="0.5" fill="currentColor" />
    </svg>
  );
}

function TestTubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2L10 10.5C10 12.433 8.433 14 6.5 14C4.567 14 3 12.433 3 10.5L3 2" />
      <path d="M3 2h7" />
      <path d="M3 6h7" />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="8" />
      <path d="M6 10l3 3 5-6" />
    </svg>
  );
}
