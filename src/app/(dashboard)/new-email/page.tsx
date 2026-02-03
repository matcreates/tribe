"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getRecipientCounts, sendEmail, scheduleEmail, getEmailSignature, getSubscriptionStatus, sendTestEmailAction, getWeeklyEmailStatus, updateTribeSettings } from "@/lib/actions";
import type { SubscriptionStatus, WeeklyEmailStatus } from "@/lib/types";
import { Toast, useToast } from "@/components/Toast";
import { EmailSentSuccess } from "@/components/EmailSentSuccess";
import { ScheduleModal } from "@/components/ScheduleModal";
import { PaywallModal } from "@/components/PaywallModal";
import { ContactSupportModal } from "@/components/ContactSupportModal";
import { useRouter, useSearchParams } from "next/navigation";

export default function NewEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [counts, setCounts] = useState({ verified: 0, nonVerified: 0, all: 0 });
  const [isSending, setIsSending] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastCampaignId, setLastCampaignId] = useState<string | null>(null);
  const [lastTotalRecipients, setLastTotalRecipients] = useState(0);
  const [isEmpty, setIsEmpty] = useState(true);
  const [signature, setSignature] = useState("");
  const [isSavingSignature, setIsSavingSignature] = useState(false);
  const [allowReplies, setAllowReplies] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [subject, setSubject] = useState("");
  const [showTestModal, setShowTestModal] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testEmailError, setTestEmailError] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testEmailSent, setTestEmailSent] = useState(false);
  const [weeklyStatus, setWeeklyStatus] = useState<WeeklyEmailStatus | null>(null);
  const [showContactSupport, setShowContactSupport] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const { toast, showToast, hideToast } = useToast();
  const editorRef = useRef<HTMLDivElement>(null);
  const signatureTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const signatureRef = useRef<HTMLTextAreaElement>(null);

  const isWeeklyLimitReached = !!(subscription?.canSendEmails && weeklyStatus && !weeklyStatus.canSendEmail);

  useEffect(() => {
    loadCounts();
    loadSignature();
    
    // Check for subscription success from Stripe redirect
    const subscriptionParam = searchParams.get('subscription');
    if (subscriptionParam === 'success') {
      syncAndLoadSubscription();
      router.replace('/new-email');
    } else {
      loadSubscription();
    }
    
    loadWeeklyStatus();
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-resize signature textarea
  const resizeSignature = useCallback(() => {
    if (signatureRef.current) {
      signatureRef.current.style.height = 'auto';
      signatureRef.current.style.height = signatureRef.current.scrollHeight + 'px';
    }
  }, []);

  useEffect(() => {
    resizeSignature();
  }, [signature, resizeSignature]);

  const syncAndLoadSubscription = async () => {
    try {
      const response = await fetch('/api/stripe/verify-subscription', {
        method: 'POST',
      });
      const data = await response.json();
      
      if (data.synced && data.status === 'active') {
        showToast("Subscription activated! You can now send emails.");
        setShowPaywall(false);
      }
      
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
      setSignature(sig || "");
    } catch (error) {
      console.error("Failed to load signature:", error);
    }
  };

  const loadSubscription = async () => {
    try {
      const status = await getSubscriptionStatus();
      setSubscription(status);
    } catch (error) {
      console.error("Failed to load subscription:", error);
    }
  };

  const loadWeeklyStatus = async () => {
    try {
      const status = await getWeeklyEmailStatus();
      setWeeklyStatus(status);
    } catch (error) {
      console.error("Failed to load weekly email status:", error);
    }
  };

  const getCurrentCount = () => {
    // Only send to verified members
    return counts.verified;
  };

  const getPlainText = useCallback(() => {
    if (!editorRef.current) return "";
    return editorRef.current.innerText || "";
  }, []);

  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    const text = getPlainText();
    setIsEmpty(!text.trim());
  }, [getPlainText]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!editorRef.current) return;

    if (e.key === "Enter") {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      
      const range = selection.getRangeAt(0);
      const node = range.startContainer;
      const textContent = node.textContent || "";
      
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
        if (currentLine.trim() === "-" || currentLine.trim() === "•" || currentLine.trim() === "*") {
          e.preventDefault();
          document.execCommand("delete");
          document.execCommand("delete");
          document.execCommand("insertLineBreak");
          return;
        }
        
        e.preventDefault();
        document.execCommand("insertLineBreak");
        document.execCommand("insertText", false, bulletMatch[1].trim() + " ");
      }
    }

    if (e.key === " ") {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      
      const range = selection.getRangeAt(0);
      const node = range.startContainer;
      
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || "";
        const offset = range.startOffset;
        
        const beforeCursor = text.slice(0, offset);
        const lastNewline = beforeCursor.lastIndexOf("\n");
        const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;
        const lineText = beforeCursor.slice(lineStart);
        
        if (lineText === "-" || lineText === "*") {
          e.preventDefault();
          const before = text.slice(0, lineStart);
          const after = text.slice(offset);
          node.textContent = before + "• " + after;
          
          const newRange = document.createRange();
          newRange.setStart(node, lineStart + 2);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      }
    }
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
    handleInput();
  }, [handleInput]);

  const formatContent = useCallback((html: string) => {
    const urlRegex = /(https?:\/\/[^\s<]+)/g;
    return html.replace(urlRegex, '<span class="underline text-white/70">$1</span>');
  }, []);

  const handleBlur = useCallback(() => {
    if (!editorRef.current) return;
    
    const selection = window.getSelection();
    const savedRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;
    
    const content = editorRef.current.innerHTML;
    const formatted = formatContent(content);
    
    if (formatted !== content) {
      editorRef.current.innerHTML = formatted;
    }
    
    if (savedRange && selection) {
      try {
        selection.removeAllRanges();
        selection.addRange(savedRange);
      } catch {
        // Cursor restore failed
      }
    }
  }, [formatContent]);

  // Auto-save signature with debounce
  const handleSignatureChange = (newSignature: string) => {
    setSignature(newSignature);
    
    // Clear existing timeout
    if (signatureTimeoutRef.current) {
      clearTimeout(signatureTimeoutRef.current);
    }
    
    // Debounce save
    signatureTimeoutRef.current = setTimeout(async () => {
      setIsSavingSignature(true);
      try {
        await updateTribeSettings({ emailSignature: newSignature });
      } catch (error) {
        console.error("Failed to save signature:", error);
      } finally {
        setIsSavingSignature(false);
      }
    }, 1000);
  };

  const handleSend = async () => {
    const body = getPlainText();
    if (!body.trim() || !subject.trim() || isSending) return;

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
      const result = await sendEmail(subject.trim(), body, "verified", allowReplies);
      
      if (editorRef.current) {
        editorRef.current.innerHTML = "";
      }
      setIsEmpty(true);
      setSubject("");
      setLastCampaignId(result.id);
      setLastTotalRecipients(result.totalRecipients);
      setShowSuccess(true);
      loadWeeklyStatus();
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
      await scheduleEmail(subject.trim(), body, scheduledAt, "verified", allowReplies);
      
      if (editorRef.current) {
        editorRef.current.innerHTML = "";
      }
      setIsEmpty(true);
      setSubject("");
      setShowScheduleModal(false);
      
      const formattedDate = scheduledAt.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
      showToast(`Email scheduled for ${formattedDate}`);
      loadWeeklyStatus();
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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(testEmail.trim())) {
      setTestEmailError("Please enter a valid email address");
      return;
    }

    setIsSendingTest(true);
    setTestEmailError("");
    
    try {
      const result = await sendTestEmailAction(testEmail.trim(), subject.trim(), body, allowReplies);
      
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

  const canSend = !isEmpty && subject.trim() && getCurrentCount() > 0 && !isWeeklyLimitReached;

  if (showSuccess) {
    return (
      <EmailSentSuccess 
        campaignId={lastCampaignId || undefined}
        totalRecipients={lastTotalRecipients} 
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
        currentTribeSize={subscription?.currentTribeSize}
      />

      {/* Contact Support Modal */}
      <ContactSupportModal
        isOpen={showContactSupport}
        onClose={() => setShowContactSupport(false)}
        reason="Weekly email limit inquiry"
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
                <div className="mb-4">
                  <h3 className="text-[16px] font-medium text-white/90">Send test email</h3>
                  <p className="text-[12px] text-white/40 mt-1">Preview how your email will look</p>
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

      <div className="flex flex-col items-center pt-14 px-6 pb-12">
        <div className="w-full max-w-[540px]">
          {/* Header */}
          <h1 className="text-[24px] font-normal text-white/90 mb-5" style={{ fontFamily: 'HeritageSerif, Georgia, serif' }}>
            Write
          </h1>

          {/* Free user info banner */}
          {subscription && !subscription.canSendEmails && subscription.tier === 'free' && !subscription.isTribeFull && (
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

          {/* Tribe size limit reached banner */}
          {subscription && subscription.isTribeFull && (
            <div 
              className="p-5 rounded-[12px] border border-red-500/20 mb-5"
              style={{ background: 'rgba(239, 68, 68, 0.06)' }}
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(239, 68, 68, 0.15)' }}>
                  <LimitIcon className="w-4 h-4 text-red-400" />
                </div>
                <div>
                  <h3 className="text-[15px] font-medium text-white/90 mb-1">
                    Your tribe has reached its size limit
                  </h3>
                  <p className="text-[13px] text-white/50 mb-3">
                    You have {subscription.currentTribeSize?.toLocaleString()} members, which exceeds the {subscription.tribeSizeLimit?.toLocaleString()} member limit for your plan.
                    {subscription.tier === 'small' ? ' Upgrade to Big Creators for unlimited members.' : ' Upgrade your plan to continue.'}
                  </p>
                  <button
                    onClick={() => setShowPaywall(true)}
                    className="px-4 py-2 rounded-[8px] text-[11px] font-medium tracking-[0.08em] uppercase"
                    style={{ background: '#E8B84A', color: '#000' }}
                  >
                    {subscription.tier === 'small' ? 'Upgrade to Big Creators' : 'Upgrade'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Weekly email limit reached banner */}
          {subscription?.canSendEmails && weeklyStatus && !weeklyStatus.canSendEmail && (
            <div 
              className="p-6 rounded-[12px] border border-red-500/20 mb-5"
              style={{ background: 'rgba(239, 68, 68, 0.06)' }}
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(239, 68, 68, 0.15)' }}>
                  <LimitIcon className="w-4 h-4 text-red-400" />
                </div>
                <div>
                  <h3 className="text-[15px] font-medium text-white/90 mb-1">
                    You reached the limit of emails you can send to your Tribe per week.
                  </h3>
                  <p className="text-[13px] text-white/50">
                    You will be able to send the next email on Monday.
                  </p>
                </div>
              </div>
              
              <div className="ml-11 mb-4">
                <p className="text-[12px] text-white/40 mb-3">Please keep in mind:</p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-[12px] text-white/50">
                    <span className="text-red-400/70 mt-0.5">•</span>
                    Each email sent has a carbon emission cost, it&apos;s our duty to send emails responsibly
                  </li>
                  <li className="flex items-start gap-2 text-[12px] text-white/50">
                    <span className="text-red-400/70 mt-0.5">•</span>
                    People don&apos;t like to be spammed, as much as the members of your Tribe love you, receiving 1 or 2 emails per week from you is probably enough.
                  </li>
                  <li className="flex items-start gap-2 text-[12px] text-white/50">
                    <span className="text-red-400/70 mt-0.5">•</span>
                    We don&apos;t want your emails to end up in the Junk/Spam folder: when email senders send too many emails, email providers often will consider those as Junk/Spam
                  </li>
                </ul>
              </div>
              
              <button
                onClick={() => setShowContactSupport(true)}
                className="ml-11 px-4 py-2 rounded-[8px] text-[11px] font-medium tracking-[0.08em] uppercase text-white/60 hover:text-white/80 transition-colors border border-white/10 hover:border-white/20"
                style={{ background: 'rgba(255, 255, 255, 0.03)' }}
              >
                Contact support
              </button>
            </div>
          )}

          {/* Main Compose Card */}
          <div 
            className={`rounded-[14px] border border-white/[0.06] overflow-hidden ${isWeeklyLimitReached ? 'opacity-40 pointer-events-none' : ''}`}
            style={{ background: 'rgba(255, 255, 255, 0.02)' }}
          >
            {/* Recipients */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.04]">
              <span className="text-[13px] text-white/40">To</span>
              <div className="flex-1 px-3.5 py-2 rounded-[8px] text-[13px] text-white/60 border border-white/[0.06]" style={{ background: 'rgba(255, 255, 255, 0.04)' }}>
                All verified members ({counts.verified})
              </div>
            </div>

            {/* Subject */}
            <div className="px-5 py-4 border-b border-white/[0.04]">
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject"
                disabled={isWeeklyLimitReached}
                className="w-full text-[18px] font-normal text-white/90 placeholder:text-white/25 bg-transparent disabled:cursor-not-allowed"
                style={{ outline: 'none', border: 'none', boxShadow: 'none', fontFamily: 'HeritageSerif, Georgia, serif' }}
              />
            </div>

            {/* Message Editor */}
            <div className="relative px-5 py-4 border-b border-white/[0.04]">
              <div
                ref={editorRef}
                contentEditable={!isWeeklyLimitReached}
                onInput={handleInput}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                onBlur={handleBlur}
                className="w-full min-h-[180px] text-[14px] leading-relaxed text-white/70 focus:outline-none focus:ring-0 whitespace-pre-wrap break-words"
                style={{ outline: 'none' }}
                suppressContentEditableWarning
              />
              {isEmpty && (
                <div className="absolute left-5 top-4 text-[14px] text-white/25 pointer-events-none">
                  Write your message...
                </div>
              )}
            </div>

            {/* Signature */}
            <div className="px-5 py-4 border-b border-white/[0.04]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-white/30 uppercase tracking-[0.08em]">
                  Signature
                </span>
                {isSavingSignature && (
                  <span className="text-[10px] text-white/30">Saving...</span>
                )}
              </div>
              <textarea
                ref={signatureRef}
                value={signature}
                onChange={(e) => {
                  handleSignatureChange(e.target.value);
                  resizeSignature();
                }}
                placeholder="Add your signature (e.g., Best, John)"
                disabled={isWeeklyLimitReached}
                className="w-full min-h-[24px] text-[13px] text-white/50 placeholder:text-white/20 bg-transparent resize-none disabled:cursor-not-allowed overflow-hidden"
                style={{ outline: 'none', border: 'none', boxShadow: 'none' }}
              />
            </div>

            {/* Allow Replies Toggle */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.04]">
              <div className="flex items-center gap-3">
                <div 
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: allowReplies ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.05)' }}
                >
                  <ReplyToggleIcon className={`w-3.5 h-3.5 ${allowReplies ? 'text-emerald-400' : 'text-white/40'}`} />
                </div>
                <div>
                  <p className="text-[13px] text-white/70">Allow replies</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAllowReplies(!allowReplies)}
                disabled={isWeeklyLimitReached}
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  allowReplies ? 'bg-emerald-500/60' : 'bg-white/10'
                } disabled:cursor-not-allowed`}
              >
                <span 
                  className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    allowReplies ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Send Actions */}
            <div className="flex items-center justify-between px-5 py-4">
              {getCurrentCount() === 0 ? (
                <p className="text-[12px] text-white/30">
                  No verified members yet
                </p>
              ) : (
                <p className="text-[11px] text-white/25">
                  Links auto-detected • Type <span className="text-white/35">-</span> for bullets
                </p>
              )}
              
              <div className="flex items-center gap-0.5">
                <button
                  onClick={handleSend}
                  disabled={isSending || isScheduling || !canSend}
                  className="px-5 py-2.5 rounded-l-[10px] text-[10px] font-medium tracking-[0.12em] uppercase btn-glass disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="btn-glass-text">{isSending ? "SENDING..." : "SEND"}</span>
                </button>
                
                {/* More Options Dropdown */}
                <div className="relative" ref={moreMenuRef}>
                  <button
                    onClick={() => setShowMoreMenu(!showMoreMenu)}
                    disabled={isSending || isScheduling || !canSend}
                    className="px-2.5 py-2.5 rounded-r-[10px] text-[10px] btn-glass disabled:opacity-40 disabled:cursor-not-allowed border-l border-white/[0.08]"
                  >
                    <ChevronDownIcon className="w-3.5 h-3.5 text-white/60" />
                  </button>
                  
                  {showMoreMenu && (
                    <div 
                      className="absolute right-0 bottom-full mb-2 w-44 rounded-[10px] border border-white/[0.08] overflow-hidden shadow-xl z-10"
                      style={{ background: 'rgb(28, 28, 28)' }}
                    >
                      <button
                        onClick={() => {
                          setShowMoreMenu(false);
                          setShowScheduleModal(true);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-[12px] text-white/70 hover:bg-white/[0.05] transition-colors text-left"
                      >
                        <ClockIcon className="w-4 h-4 text-white/50" />
                        Schedule for later
                      </button>
                      <button
                        onClick={() => {
                          setShowMoreMenu(false);
                          setShowTestModal(true);
                        }}
                        disabled={!subject.trim() || isEmpty}
                        className="w-full flex items-center gap-3 px-4 py-3 text-[12px] text-white/70 hover:bg-white/[0.05] transition-colors text-left disabled:opacity-40 disabled:cursor-not-allowed border-t border-white/[0.04]"
                      >
                        <TestIcon className="w-4 h-4 text-white/50" />
                        Send test email
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

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

function TestIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 4l6 4 6-4" />
      <rect x="1" y="3" width="14" height="10" rx="2" />
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

function LimitIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6.5" />
      <path d="M5 5l6 6M11 5l-6 6" />
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
