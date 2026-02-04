"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/lib/theme";

interface PaywallModalProps {
  isOpen: boolean;
  onClose?: () => void;
  currentTribeSize?: number;
}

type PlanType = "small_monthly" | "small_yearly" | "big_monthly" | "big_yearly";

export function PaywallModal({ isOpen, onClose, currentTribeSize = 0 }: PaywallModalProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [selectedTier, setSelectedTier] = useState<"small" | "big">("small");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      router.push("/dashboard");
    }
  };

  const getSelectedPlan = (): PlanType => {
    return `${selectedTier}_${billingCycle}` as PlanType;
  };

  const getPriceDisplay = () => {
    if (selectedTier === "small") {
      return billingCycle === "yearly" ? "$60/year" : "$8/month";
    }
    return billingCycle === "yearly" ? "$200/year" : "$20/month";
  };

  const handleSubscribe = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: getSelectedPlan() }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        setError(data.error || "Failed to create checkout session");
        return;
      }
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError("No checkout URL received. Please check your Stripe configuration.");
      }
    } catch (err) {
      console.error("Checkout error:", err);
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Check if user needs Big Creator (tribe size > 10k)
  const needsBigCreator = currentTribeSize > 10000;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div 
        className={`relative w-full max-w-lg mx-4 rounded-[16px] border overflow-hidden max-h-[90vh] overflow-y-auto ${
          isLight ? 'border-black/[0.08]' : 'border-white/[0.08]'
        }`}
        style={{ background: isLight ? 'linear-gradient(180deg, rgba(252, 250, 247, 0.98) 0%, rgba(245, 243, 240, 0.98) 100%)' : 'linear-gradient(180deg, rgba(30, 30, 35, 0.98) 0%, rgba(20, 20, 24, 0.98) 100%)' }}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className={`absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-all z-10 ${
            isLight ? 'text-black/40 hover:text-black/70 hover:bg-black/10' : 'text-white/40 hover:text-white/70 hover:bg-white/10'
          }`}
        >
          <CloseIcon className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="p-6 pb-4 text-center">
          <div 
            className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, rgba(232, 184, 74, 0.2) 0%, rgba(232, 184, 74, 0.05) 100%)' }}
          >
            <LockIcon className="w-7 h-7 text-[#E8B84A]" />
          </div>
          <h2 className={`text-[20px] font-medium mb-2 ${isLight ? 'text-black/85' : 'text-white/90'}`}>
            Unlock Email Sending
          </h2>
          <p className={`text-[14px] leading-relaxed ${isLight ? 'text-black/50' : 'text-white/50'}`}>
            Choose the plan that fits your tribe
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="px-6 pb-4">
          <div 
            className={`flex gap-1 p-1 rounded-[10px] border ${isLight ? 'border-black/[0.06]' : 'border-white/[0.06]'}`}
            style={{ background: isLight ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.02)' }}
          >
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`flex-1 py-2 rounded-[8px] text-[12px] font-medium tracking-[0.05em] uppercase transition-all ${
                billingCycle === "monthly"
                  ? isLight ? "bg-black/[0.08] text-black/80" : "bg-white/[0.1] text-white/80"
                  : isLight ? "text-black/40 hover:text-black/60" : "text-white/40 hover:text-white/60"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`flex-1 py-2 rounded-[8px] text-[12px] font-medium tracking-[0.05em] uppercase transition-all ${
                billingCycle === "yearly"
                  ? isLight ? "bg-black/[0.08] text-black/80" : "bg-white/[0.1] text-white/80"
                  : isLight ? "text-black/40 hover:text-black/60" : "text-white/40 hover:text-white/60"
              }`}
            >
              Yearly <span className="text-[#E8B84A]">Save 17%+</span>
            </button>
          </div>
        </div>

        {/* Plan Options */}
        <div className="px-6 pb-4">
          <div className="space-y-3">
            {/* Small Creators Plan */}
            <button
              onClick={() => !needsBigCreator && setSelectedTier("small")}
              disabled={needsBigCreator}
              className={`w-full p-4 rounded-[12px] border transition-all text-left relative ${
                needsBigCreator
                  ? isLight ? "border-black/[0.04] bg-black/[0.01] opacity-50 cursor-not-allowed" : "border-white/[0.04] bg-white/[0.01] opacity-50 cursor-not-allowed"
                  : selectedTier === "small"
                  ? "border-[#E8B84A]/50 bg-[#E8B84A]/[0.08]"
                  : isLight ? "border-black/[0.08] bg-black/[0.02] hover:border-black/[0.12]" : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.12]"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className={`text-[15px] font-medium ${isLight ? 'text-black/80' : 'text-white/80'}`}>Small Creators</p>
                    {selectedTier === "small" && !needsBigCreator && (
                      <div className="w-4 h-4 rounded-full bg-[#E8B84A] flex items-center justify-center">
                        <CheckIcon className="w-2.5 h-2.5 text-black" />
                      </div>
                    )}
                  </div>
                  <p className={`text-[12px] mb-2 ${isLight ? 'text-black/40' : 'text-white/40'}`}>Up to 10,000 tribe members</p>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <CheckIcon className={`w-3 h-3 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                      <span className={`text-[11px] ${isLight ? 'text-black/50' : 'text-white/50'}`}>2 emails per week</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckIcon className={`w-3 h-3 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                      <span className={`text-[11px] ${isLight ? 'text-black/50' : 'text-white/50'}`}>All features included</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-[22px] font-medium ${isLight ? 'text-black/85' : 'text-white/90'}`}>
                    {billingCycle === "yearly" ? "$5" : "$8"}
                    <span className={`text-[12px] ${isLight ? 'text-black/40' : 'text-white/40'}`}>/mo</span>
                  </p>
                  {billingCycle === "yearly" && (
                    <p className={`text-[11px] ${isLight ? 'text-black/40' : 'text-white/40'}`}>$60/year</p>
                  )}
                </div>
              </div>
              {needsBigCreator && (
                <p className="text-[11px] text-amber-500 mt-2">
                  Your tribe has {currentTribeSize.toLocaleString()} members - upgrade to Big Creators
                </p>
              )}
            </button>

            {/* Big Creators Plan */}
            <button
              onClick={() => setSelectedTier("big")}
              className={`w-full p-4 rounded-[12px] border transition-all text-left relative ${
                selectedTier === "big"
                  ? "border-[#E8B84A]/50 bg-[#E8B84A]/[0.08]"
                  : isLight ? "border-black/[0.08] bg-black/[0.02] hover:border-black/[0.12]" : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.12]"
              }`}
            >
              {/* Popular Badge */}
              <div className="absolute -top-2 right-4">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium tracking-[0.05em] uppercase bg-[#E8B84A] text-black">
                  Unlimited
                </span>
              </div>
              
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className={`text-[15px] font-medium ${isLight ? 'text-black/80' : 'text-white/80'}`}>Big Creators</p>
                    {selectedTier === "big" && (
                      <div className="w-4 h-4 rounded-full bg-[#E8B84A] flex items-center justify-center">
                        <CheckIcon className="w-2.5 h-2.5 text-black" />
                      </div>
                    )}
                  </div>
                  <p className={`text-[12px] mb-2 ${isLight ? 'text-black/40' : 'text-white/40'}`}>Unlimited tribe members</p>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <CheckIcon className={`w-3 h-3 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                      <span className={`text-[11px] ${isLight ? 'text-black/50' : 'text-white/50'}`}>2 emails per week</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckIcon className={`w-3 h-3 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                      <span className={`text-[11px] ${isLight ? 'text-black/50' : 'text-white/50'}`}>All features included</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckIcon className={`w-3 h-3 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                      <span className={`text-[11px] ${isLight ? 'text-black/50' : 'text-white/50'}`}>No tribe size limits</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-[22px] font-medium ${isLight ? 'text-black/85' : 'text-white/90'}`}>
                    {billingCycle === "yearly" ? "$17" : "$20"}
                    <span className={`text-[12px] ${isLight ? 'text-black/40' : 'text-white/40'}`}>/mo</span>
                  </p>
                  {billingCycle === "yearly" && (
                    <p className={`text-[11px] ${isLight ? 'text-black/40' : 'text-white/40'}`}>$200/year</p>
                  )}
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* CTA */}
        <div className="p-6 pt-2">
          {error && (
            <div className="mb-3 p-3 rounded-[8px] bg-red-500/10 border border-red-500/20">
              <p className="text-[12px] text-red-400 text-center">{error}</p>
            </div>
          )}
          <button
            onClick={handleSubscribe}
            disabled={isLoading}
            className="w-full py-3.5 rounded-[10px] text-[12px] font-medium tracking-[0.1em] uppercase transition-all"
            style={{ 
              background: 'linear-gradient(135deg, #E8B84A 0%, #D4A43A 100%)',
              color: '#000',
            }}
          >
            <span>{isLoading ? "Loading..." : `Upgrade for ${getPriceDisplay()}`}</span>
          </button>
          <p className={`text-[11px] text-center mt-3 ${isLight ? 'text-black/30' : 'text-white/30'}`}>
            Secure payment powered by Stripe · Cancel anytime
          </p>
        </div>
      </div>
    </div>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 8.5l3 3 6-6" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}
