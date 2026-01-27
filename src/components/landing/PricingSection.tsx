"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export function PricingSection() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");

  const paid = useMemo(() => {
    if (billing === "yearly") {
      return {
        priceTop: "$60",
        priceSuffix: "/year",
        sub: "Billed yearly. Equivalent to 5$/month.",
      };
    }

    return {
      priceTop: "$5",
      priceSuffix: "/month",
      sub: "Billed monthly. Cancel anytime.",
    };
  }, [billing]);

  return (
    <section className="relative py-32 px-6" id="pricing">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-[clamp(1.75rem,4vw,2.5rem)] font-medium text-white/90 mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-[15px] text-white/40 max-w-lg mx-auto">
            Start free. Upgrade when you’re ready.
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
              Yearly
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Free */}
          <div
            className="p-8 rounded-2xl border border-white/[0.08] transition-colors hover:border-white/[0.12]"
            style={{ background: "rgba(255, 255, 255, 0.02)" }}
          >
            <p className="text-[13px] text-white/50 uppercase tracking-wider mb-2">Free</p>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-[42px] font-medium text-white/90">$0</span>
              <span className="text-[15px] text-white/40">/forever</span>
            </div>
            <p className="text-[14px] text-white/40 mb-6 h-5">Explore everything. No credit card.</p>

            <div className="space-y-3 mb-8">
              {["Create your newsletter", "Collect subscribers", "Write drafts", "Preview emails"].map(
                (feature) => (
                  <div key={feature} className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400/80" />
                    <span className="text-[13px] text-white/60">{feature}</span>
                  </div>
                ),
              )}
            </div>

            <Link
              href="/signup"
              className="block w-full py-3 rounded-full text-center text-[11px] font-medium tracking-[0.1em] uppercase btn-glass"
            >
              <span className="btn-glass-text">Get started</span>
            </Link>
          </div>

          {/* Paid */}
          <div
            className="relative p-8 rounded-2xl border border-[#E8B84A]/30 transition-colors"
            style={{
              background:
                "linear-gradient(180deg, rgba(232, 184, 74, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)",
            }}
          >
            <p className="text-[13px] text-[#E8B84A]/80 uppercase tracking-wider mb-2">
              5$/month
            </p>

            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-[42px] font-medium text-white/90">{paid.priceTop}</span>
              <span className="text-[15px] text-white/40">{paid.priceSuffix}</span>
            </div>

            <p className="text-[14px] text-[#E8B84A]/70 mb-6 h-5">{paid.sub}</p>

            <div className="space-y-3 mb-8">
              {["Send emails", "Email scheduling", "Open rate analytics", "Reply management"].map(
                (feature) => (
                  <div key={feature} className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400/80" />
                    <span className="text-[13px] text-white/60">{feature}</span>
                  </div>
                ),
              )}
            </div>

            <Link
              href="/signup"
              className="block w-full py-3 rounded-full text-center text-[11px] font-medium tracking-[0.1em] uppercase btn-glass-gold"
            >
              <span className="btn-glass-text">Upgrade</span>
            </Link>
          </div>
        </div>

        <p className="text-center text-[13px] text-white/30 mt-8">
          ✨ Free accounts can explore all features — subscription only required to send emails
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
