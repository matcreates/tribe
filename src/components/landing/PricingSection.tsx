"use client";

import Link from "next/link";
import { useState } from "react";

// Accent colors
const GOLD = "#E8B84A";
const PURPLE = "#A855F7";

export function PricingSection() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("yearly");

  const smallPrice = billing === "yearly" ? { amount: "$5", suffix: "/mo", yearly: "$60/year" } : { amount: "$8", suffix: "/mo", yearly: null };
  const bigPrice = billing === "yearly" ? { amount: "$17", suffix: "/mo", yearly: "$200/year" } : { amount: "$20", suffix: "/mo", yearly: null };

  const paidFeatures = [
    "Create your newsletter",
    "Collect members",
    "Gift downloads",
    "Send 2 emails/week",
    "Email scheduling",
    "Open rate analytics",
    "Reply management",
  ];

  return (
    <section className="relative pt-24 sm:pt-40 pb-16 sm:pb-32 px-4 sm:px-6" id="pricing">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8 sm:mb-10">
          <h2 
            className="text-[clamp(1.5rem,4vw,2.5rem)] font-normal text-black/85 mb-4"
            style={{ fontFamily: 'HeritageSerif, Georgia, serif' }}
          >
            Free until you&apos;re ready to send.
          </h2>
          <p className="text-[15px] text-black/45 max-w-lg mx-auto">
            Start free. Upgrade when you&apos;re ready to send emails.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex justify-center mb-10">
          <div
            className="inline-flex items-center gap-1 p-1 rounded-full border border-black/[0.08] bg-white/60"
          >
            <button
              type="button"
              onClick={() => setBilling("monthly")}
              className={
                "px-4 py-2 rounded-full text-[11px] font-medium tracking-[0.1em] uppercase transition-colors " +
                (billing === "monthly"
                  ? "text-black/90 bg-black/[0.08]"
                  : "text-black/50 hover:text-black/70")
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
                  ? "text-black/90 bg-black/[0.08]"
                  : "text-black/50 hover:text-black/70")
              }
              aria-pressed={billing === "yearly"}
            >
              Yearly <span style={{ color: GOLD }}>Save 17%+</span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4 sm:gap-5 items-stretch">
          {/* Free */}
          <div
            className="p-7 rounded-2xl border border-black/[0.06] transition-colors hover:border-black/[0.12] flex flex-col bg-white/60"
          >
            <p className="text-[12px] text-black/50 uppercase tracking-wider mb-2">Free</p>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-[36px] font-medium text-black/85">$0</span>
              <span className="text-[14px] text-black/40">/forever</span>
            </div>
            <p className="text-[13px] text-black/40 mb-5">Up to 500 members</p>

            <div className="space-y-2.5 mb-6 flex-grow">
              {[
                "Create your newsletter",
                "Collect members",
                "Gift downloads",
                "Preview emails",
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-black/40" />
                  <span className="text-[12px] text-black/60">{feature}</span>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <XCircle className="w-3.5 h-3.5 text-black/25" />
                <span className="text-[12px] text-black/35">Send emails</span>
              </div>
            </div>

            <Link
              href="/signup"
              className="block w-full py-3 rounded-full text-center text-[10px] font-medium tracking-[0.1em] uppercase bg-black/[0.06] text-black/70 hover:bg-black/[0.1] transition-colors mt-auto"
            >
              Get started
            </Link>
          </div>

          {/* Small Creators */}
          <div
            className="relative p-7 rounded-2xl border transition-colors flex flex-col"
            style={{
              borderColor: `${GOLD}4D`,
              background: `linear-gradient(180deg, ${GOLD}15 0%, #ffffff 100%)`,
            }}
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span 
                className="px-3 py-1 rounded-full text-[10px] font-medium tracking-[0.05em] uppercase text-black"
                style={{ background: GOLD }}
              >
                Most Popular
              </span>
            </div>
            
            <p className="text-[12px] uppercase tracking-wider mb-2" style={{ color: `${GOLD}` }}>
              Small Creators
            </p>

            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-[36px] font-medium text-black/85">{smallPrice.amount}</span>
              <span className="text-[14px] text-black/40">{smallPrice.suffix}</span>
            </div>

            <p className="text-[13px] text-black/40 mb-5">
              {smallPrice.yearly ? `${smallPrice.yearly} · ` : ""}Up to 10,000 members
            </p>

            <div className="space-y-2.5 mb-6 flex-grow">
              {paidFeatures.map((feature) => (
                <div key={feature} className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-black/40" />
                  <span className="text-[12px] text-black/60">{feature}</span>
                </div>
              ))}
            </div>

            <Link
              href="/signup"
              className="block w-full py-3 rounded-full text-center text-[10px] font-medium tracking-[0.1em] uppercase text-black transition-all hover:opacity-90 mt-auto"
              style={{ background: GOLD }}
            >
              Get started
            </Link>
          </div>

          {/* Big Creators */}
          <div
            className="relative p-7 rounded-2xl border transition-colors flex flex-col"
            style={{ 
              borderColor: `${PURPLE}4D`,
              background: `linear-gradient(180deg, ${PURPLE}15 0%, #ffffff 100%)`,
            }}
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span 
                className="px-3 py-1 rounded-full text-[10px] font-medium tracking-[0.05em] uppercase text-white"
                style={{ background: PURPLE }}
              >
                Unlimited
              </span>
            </div>

            <p className="text-[12px] uppercase tracking-wider mb-2" style={{ color: PURPLE }}>
              Big Creators
            </p>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-[36px] font-medium text-black/85">{bigPrice.amount}</span>
              <span className="text-[14px] text-black/40">{bigPrice.suffix}</span>
            </div>
            <p className="text-[13px] text-black/40 mb-5">
              {bigPrice.yearly ? `${bigPrice.yearly} · ` : ""}Unlimited members
            </p>

            <div className="space-y-2.5 mb-6 flex-grow">
              {paidFeatures.map((feature) => (
                <div key={feature} className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-black/40" />
                  <span className="text-[12px] text-black/60">{feature}</span>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5" style={{ color: PURPLE }} />
                <span className="text-[12px] text-black/80 font-medium">Unlimited tribe size</span>
              </div>
            </div>

            <Link
              href="/signup"
              className="block w-full py-3 rounded-full text-center text-[10px] font-medium tracking-[0.1em] uppercase text-white transition-all hover:opacity-90 mt-auto"
              style={{ background: PURPLE }}
            >
              Get started
            </Link>
          </div>
        </div>

        <p className="text-center text-[13px] text-black/35 mt-8">
          All paid plans include 2 emails per week · Cancel anytime
        </p>
      </div>
    </section>
  );
}

function CheckCircle({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 16 16" fill="none">
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
