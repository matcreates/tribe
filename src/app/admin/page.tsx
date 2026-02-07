"use client";

import { useState, useEffect } from "react";

interface PaidUser {
  email: string;
  name: string | null;
  slug: string;
  plan: string;
  status: string;
  endsAt: string | null;
  memberCount: number;
}

interface AdminStats {
  totalUsers: number;
  totalTribes: number;
  totalSubscribers: number;
  totalVerifiedSubscribers: number;
  totalEmailsSent: number;
  totalGifts: number;
  totalPaidUsers: number;
  paidUsers: PaidUser[];
  recentUsers: { email: string; name: string | null; createdAt: string }[];
}

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 404 || res.status === 401) {
            setError("not_found");
          } else {
            setError("Something went wrong");
          }
          return;
        }
        const data = await res.json();
        setStats(data);
      })
      .catch(() => setError("Something went wrong"))
      .finally(() => setLoading(false));
  }, []);

  // Show nothing useful to non-admins
  if (error === "not_found") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "rgb(252, 250, 247)" }}>
        <p className="text-[14px] text-black/40">This page doesn&apos;t exist.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "rgb(252, 250, 247)" }}>
        <p className="text-[13px] text-black/30">Loading...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "rgb(252, 250, 247)" }}>
        <p className="text-[14px] text-black/40">{error || "Something went wrong"}</p>
      </div>
    );
  }

  const statCards = [
    { label: "Creators", value: stats.totalUsers, icon: "👤", color: "rgba(59, 130, 246, 0.1)" },
    { label: "Paid users", value: stats.totalPaidUsers, icon: "💰", color: "rgba(232, 184, 74, 0.1)" },
    { label: "Tribes", value: stats.totalTribes, icon: "🏠", color: "rgba(168, 85, 247, 0.1)" },
    { label: "Total members", value: stats.totalSubscribers, icon: "👥", color: "rgba(34, 197, 94, 0.1)" },
    { label: "Verified members", value: stats.totalVerifiedSubscribers, icon: "✅", color: "rgba(5, 150, 105, 0.1)" },
    { label: "Emails sent", value: stats.totalEmailsSent, icon: "✉️", color: "rgba(232, 184, 74, 0.1)" },
    { label: "Gifts uploaded", value: stats.totalGifts, icon: "🎁", color: "rgba(239, 68, 68, 0.1)" },
  ];

  const formatPlan = (plan: string) => {
    switch (plan) {
      case "small_monthly": return "Small / Monthly";
      case "small_yearly": return "Small / Yearly";
      case "big_monthly": return "Big / Monthly";
      case "big_yearly": return "Big / Yearly";
      default: return plan;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div className="min-h-screen" style={{ background: "rgb(252, 250, 247)" }}>
      <div className="max-w-3xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="mb-12">
          <p className="text-[11px] uppercase tracking-[0.15em] text-black/30 mb-2">Admin</p>
          <h1
            className="text-[32px] font-normal text-black/85"
            style={{ fontFamily: "HeritageSerif, Georgia, serif" }}
          >
            Tribe Platform
          </h1>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-12">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="p-5 rounded-[14px] border border-black/[0.06] bg-white/80"
            >
              <div
                className="w-9 h-9 rounded-[10px] flex items-center justify-center text-[16px] mb-3"
                style={{ background: card.color }}
              >
                {card.icon}
              </div>
              <p className="text-[28px] font-medium text-black/85 mb-0.5">
                {card.value.toLocaleString()}
              </p>
              <p className="text-[12px] text-black/40">{card.label}</p>
            </div>
          ))}
        </div>

        {/* Paid Users */}
        {stats.paidUsers.length > 0 && (
          <div className="mb-12">
            <h2 className="text-[14px] font-medium text-black/70 mb-4">Paid users</h2>
            <div className="rounded-[14px] border border-black/[0.06] bg-white/80 overflow-hidden">
              {stats.paidUsers.map((user, i) => (
                <div
                  key={user.email}
                  className={`flex items-center justify-between px-5 py-3.5 ${
                    i !== stats.paidUsers.length - 1 ? "border-b border-black/[0.04]" : ""
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-medium text-black/50 flex-shrink-0"
                      style={{ background: "rgba(232, 184, 74, 0.15)" }}
                    >
                      {(user.name || user.email)[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] text-black/75 truncate">
                        {user.name || "No name"}
                        <span className="text-black/30 ml-1.5">@{user.slug}</span>
                      </p>
                      <p className="text-[11px] text-black/35 truncate">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                    <span className="text-[11px] text-black/40">{user.memberCount.toLocaleString()} members</span>
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-medium tracking-wide"
                      style={{
                        background: user.plan.includes("big") ? "rgba(168, 85, 247, 0.12)" : "rgba(232, 184, 74, 0.15)",
                        color: user.plan.includes("big") ? "#7c3aed" : "#92740a",
                      }}
                    >
                      {formatPlan(user.plan)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Signups */}
        <div>
          <h2 className="text-[14px] font-medium text-black/70 mb-4">Recent signups</h2>
          <div className="rounded-[14px] border border-black/[0.06] bg-white/80 overflow-hidden">
            {stats.recentUsers.map((user, i) => (
              <div
                key={user.email}
                className={`flex items-center justify-between px-5 py-3.5 ${
                  i !== stats.recentUsers.length - 1 ? "border-b border-black/[0.04]" : ""
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-black/[0.06] flex items-center justify-center text-[11px] font-medium text-black/50 flex-shrink-0">
                    {(user.name || user.email)[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] text-black/75 truncate">
                      {user.name || "No name"}
                    </p>
                    <p className="text-[11px] text-black/35 truncate">{user.email}</p>
                  </div>
                </div>
                <span className="text-[11px] text-black/30 flex-shrink-0 ml-4">
                  {formatDate(user.createdAt)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
