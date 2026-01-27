"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface PaywallModalProps {
  isOpen: boolean;
  onClose?: () => void;
}

export function PaywallModal({ isOpen, onClose }: PaywallModalProps) {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">("yearly");
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

  const handleSubscribe = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selectedPlan }),
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div 
        className="relative w-full max-w-md mx-4 rounded-[16px] border border-white/[0.08] overflow-hidden"
        style={{ background: 'linear-gradient(180deg, rgba(30, 30, 35, 0.98) 0%, rgba(20, 20, 24, 0.98) 100%)' }}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/10 transition-all z-10"
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
          <h2 className="text-[20px] font-medium text-white/90 mb-2">
            Unlock Email Sending
          </h2>
          <p className="text-[14px] text-white/50 leading-relaxed">
            Upgrade to Tribe to send emails to your community
          </p>
        </div>

        {/* Pricing Options */}
        <div className="px-6 pb-4">
          <div className="space-y-3">
            {/* Yearly Plan */}
            <button
              onClick={() => setSelectedPlan("yearly")}
              className={`w-full p-4 pl-12 rounded-[12px] border transition-all text-left relative ${
                selectedPlan === "yearly"
                  ? "border-[#E8B84A]/50 bg-[#E8B84A]/[0.08]"
                  : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.12]"
              }`}
            >
              {/* Best Value Badge */}
              <div className="absolute -top-2 right-4">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium tracking-[0.05em] uppercase bg-[#E8B84A] text-black">
                  Best Value
                </span>
              </div>
              
              {/* Radio indicator */}
              <div className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                selectedPlan === "yearly" ? "border-[#E8B84A]" : "border-white/20"
              }`}>
                {selectedPlan === "yearly" && (
                  <div className="w-2 h-2 rounded-full bg-[#E8B84A]" />
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[14px] font-medium text-white/80">Yearly</p>
                  <p className="text-[12px] text-white/40 mt-0.5">Billed annually</p>
                </div>
                <div className="text-right">
                  <p className="text-[20px] font-medium text-white/90">$60<span className="text-[13px] text-white/40">/year</span></p>
                  <p className="text-[11px] text-[#E8B84A]">$5/month · Save 37%</p>
                </div>
              </div>
            </button>

            {/* Monthly Plan */}
            <button
              onClick={() => setSelectedPlan("monthly")}
              className={`w-full p-4 pl-12 rounded-[12px] border transition-all text-left relative ${
                selectedPlan === "monthly"
                  ? "border-[#E8B84A]/50 bg-[#E8B84A]/[0.08]"
                  : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.12]"
              }`}
            >
              {/* Radio indicator */}
              <div className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                selectedPlan === "monthly" ? "border-[#E8B84A]" : "border-white/20"
              }`}>
                {selectedPlan === "monthly" && (
                  <div className="w-2 h-2 rounded-full bg-[#E8B84A]" />
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[14px] font-medium text-white/80">Monthly</p>
                  <p className="text-[12px] text-white/40 mt-0.5">Billed monthly</p>
                </div>
                <div className="text-right">
                  <p className="text-[20px] font-medium text-white/90">$8<span className="text-[13px] text-white/40">/month</span></p>
                  <p className="text-[11px] text-white/40">Cancel anytime</p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Features */}
        <div className="px-6 pb-4">
          <div className="p-4 rounded-[10px] border border-white/[0.06]" style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
            <p className="text-[11px] text-white/40 uppercase tracking-[0.08em] mb-3">What&apos;s included</p>
            <div className="space-y-2">
              {[
                "2 emails per week",
                "Email scheduling",
                "Open rate tracking",
                "Reply management",
                "Custom email signatures",
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-2">
                  <CheckIcon className="w-4 h-4 text-emerald-400" />
                  <span className="text-[13px] text-white/60">{feature}</span>
                </div>
              ))}
            </div>
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
            className="w-full py-3.5 rounded-[10px] text-[12px] font-medium tracking-[0.1em] uppercase transition-all btn-glass"
            style={{ 
              background: 'linear-gradient(135deg, #E8B84A 0%, #D4A43A 100%)',
              color: '#000',
            }}
          >
            <span>{isLoading ? "Loading..." : `Upgrade ${selectedPlan === "yearly" ? "for $60/year" : "for $8/month"}`}</span>
          </button>
          <p className="text-[11px] text-white/30 text-center mt-3">
            Secure payment powered by Stripe
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
