"use client";

import Link from "next/link";
import { useState } from "react";

export function PricingSection() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("yearly");

  const smallPrice = billing === "yearly" ? { amount: "$5", suffix: "/mo", yearly: "$60/year" } : { amount: "$8", suffix: "/mo", yearly: null };
  const bigPrice = billing === "yearly" ? { amount: "$17", suffix: "/mo", yearly: "$200/year" } : { amount: "$20", suffix: "/mo", yearly: null };

  return (
    <section className="relative py-32 px-6" id="pricing">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-[clamp(1.75rem,4vw,2.5rem)] font-medium text-white/90 mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-[15px] text-white/40 max-w-lg mx-auto">
            Start free. Upgrade when you&apos;re ready to send emails.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex justify-center mb-10">
          <div
            className="inline-flex items-center gap-1 p-1 rounded-full border border-white/[0.08]"
            style={{ background: "rgba(255, 255, 255, 0.02)" }}
          >
            <button
              type="button"
              onClick={() => setBilling("monthly")}
              className={
                "px-4 py-2 rounded-full text-[11px] font-medium tracking-[0.1em] uppercase transition-colors " +
                (billing === "monthly"
                  ? "text-black bg-white/90"
                  : "text-white/50 hover:text-white/80")
              }
              aria-pressed={billing === "monthly"}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBilling("yearly")}
              className={
                "px-4 py-2 rounded-full text-[11px] font-medium tracking-[0.1em] uppercase transition-colors " +
                (billing === "yearly"
                  ? "text-black bg-white/90"
                  : "text-white/50 hover:text-white/80")
              }
              aria-pressed={billing === "yearly"}
            >
              Yearly <span className="text-[#E8B84A]">Save 17%+</span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-5 max-w-4xl mx-auto">
          {/* Free */}
          <div
            className="p-7 rounded-2xl border border-white/[0.08] transition-colors hover:border-white/[0.12]"
            style={{ background: "rgba(255, 255, 255, 0.02)" }}
          >
            <p className="text-[12px] text-white/50 uppercase tracking-wider mb-2">Free</p>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-[36px] font-medium text-white/90">$0</span>
              <span className="text-[14px] text-white/40">/forever</span>
            </div>
            <p className="text-[13px] text-white/40 mb-5">Up to 500 members</p>

            <div className="space-y-2.5 mb-6">
              {[
                "Create your newsletter",
                "Collect subscribers",
                "Gift downloads",
                "Preview emails",
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400/80" />
                  <span className="text-[12px] text-white/60">{feature}</span>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <XCircle className="w-3.5 h-3.5 text-white/30" />
                <span className="text-[12px] text-white/40">Send emails</span>
              </div>
            </div>

            <Link
              href="/signup"
              className="block w-full py-3 rounded-full text-center text-[10px] font-medium tracking-[0.1em] uppercase btn-glass"
            >
              <span className="btn-glass-text">Get started</span>
            </Link>
          </div>

          {/* Small Creators */}
          <div
            className="relative p-7 rounded-2xl border border-[#E8B84A]/30 transition-colors"
            style={{
              background:
                "linear-gradient(180deg, rgba(232, 184, 74, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)",
            }}
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="px-3 py-1 rounded-full text-[10px] font-medium tracking-[0.05em] uppercase bg-[#E8B84A] text-black">
                Most Popular
              </span>
            </div>
            
            <p className="text-[12px] text-[#E8B84A]/80 uppercase tracking-wider mb-2">
              Small Creators
            </p>

            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-[36px] font-medium text-white/90">{smallPrice.amount}</span>
              <span className="text-[14px] text-white/40">{smallPrice.suffix}</span>
            </div>

            <p className="text-[13px] text-white/40 mb-5">
              {smallPrice.yearly ? `${smallPrice.yearly} · ` : ""}Up to 10,000 members
            </p>

            <div className="space-y-2.5 mb-6">
              {[
                "Everything in Free",
                "Send 2 emails/week",
                "Email scheduling",
                "Open rate analytics",
                "Reply management",
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400/80" />
                  <span className="text-[12px] text-white/60">{feature}</span>
                </div>
              ))}
            </div>

            <Link
              href="/signup"
              className="block w-full py-3 rounded-full text-center text-[10px] font-medium tracking-[0.1em] uppercase btn-glass-gold"
            >
              <span className="btn-glass-text">Upgrade</span>
            </Link>
          </div>

          {/* Big Creators */}
          <div
            className="p-7 rounded-2xl border border-white/[0.08] transition-colors hover:border-white/[0.12]"
            style={{ background: "rgba(255, 255, 255, 0.02)" }}
          >
            <p className="text-[12px] text-white/50 uppercase tracking-wider mb-2">Big Creators</p>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-[36px] font-medium text-white/90">{bigPrice.amount}</span>
              <span className="text-[14px] text-white/40">{bigPrice.suffix}</span>
            </div>
            <p className="text-[13px] text-white/40 mb-5">
              {bigPrice.yearly ? `${bigPrice.yearly} · ` : ""}Unlimited members
            </p>

            <div className="space-y-2.5 mb-6">
              {[
                "Everything in Small",
                "Unlimited tribe size",
                "Receive replies",
                "Priority support",
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400/80" />
                  <span className="text-[12px] text-white/60">{feature}</span>
                </div>
              ))}
            </div>

            <Link
              href="/signup"
              className="block w-full py-3 rounded-full text-center text-[10px] font-medium tracking-[0.1em] uppercase btn-glass"
            >
              <span className="btn-glass-text">Get started</span>
            </Link>
          </div>
        </div>

        <p className="text-center text-[13px] text-white/30 mt-8">
          All plans include 2 emails per week limit · Cancel anytime
        </p>
      </div>
    </section>
  );
}

function CheckCircle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M5 8l2 2 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function XCircle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M5.5 5.5l5 5M10.5 5.5l-5 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
