"use client";

import { useState, useEffect } from "react";
import { getDashboardStats, getSentEmails } from "@/lib/actions";
import type { TimePeriod } from "@/lib/types";
import Link from "next/link";
import { TipsCarousel } from "@/components/TipsCarousel";

interface DashboardStats {
  totalSubscribers: number;
  periodSubscribers: number;
  totalEmailsSent: number;
  periodEmailsSent: number;
  openRate: number;
  periodOpens: number;
  totalCampaigns: number;
  periodCampaigns: number;
  totalReplies: number;
  periodReplies: number;
  chartData: number[];
  chartLabels: string[];
  period: TimePeriod;
}

interface SentEmail {
  id: string;
  subject: string | null;
  recipient_count: number;
  sent_at: string;
}

export default function DashboardPage() {
  const [period, setPeriod] = useState<TimePeriod>("7d");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    try {
      const [statsData, emailsData] = await Promise.all([
        getDashboardStats(period),
        getSentEmails(),
      ]);
      setStats(statsData);
      setSentEmails(emailsData);
    } catch (error) {
      console.error("Failed to load dashboard:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const periodLabels = {
    "24h": "Last 24 hours",
    "7d": "Last 7 days",
    "30d": "Last 30 days",
  };

  if (isLoading || !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[13px] text-white/30">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center pt-14 px-6 pb-12">
      <div className="w-full max-w-[540px]">
        {/* Header with Filters */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <h1 className="text-[20px] font-medium text-white/90">
            Dashboard
          </h1>
          
          {/* Time Period Filters */}
          <div className="flex gap-1 p-1 rounded-[10px] border border-white/[0.06] shrink-0" style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
            {(["24h", "7d", "30d"] as TimePeriod[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-[8px] text-[11px] font-medium tracking-[0.05em] uppercase transition-all ${
                  period === p
                    ? "bg-white/[0.1] text-white/80"
                    : "text-white/40 hover:text-white/60"
                }`}
              >
                {p === "24h" ? "24H" : p === "7d" ? "7D" : "30D"}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* People in your tribe */}
          <div 
            className="rounded-[12px] p-5 border border-white/[0.06]"
            style={{ background: 'rgba(255, 255, 255, 0.02)' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(59, 130, 246, 0.15)' }}
              >
                <UsersIcon className="w-4 h-4 text-blue-400" />
              </div>
              <span className="text-[12px] text-white/40">Your tribe</span>
            </div>
            <p className="text-[28px] font-medium text-white/90">
              {stats.totalSubscribers}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] text-white/30">{periodLabels[period]}</span>
              <span className={`text-[11px] font-medium ${stats.periodSubscribers > 0 ? 'text-emerald-400' : 'text-white/50'}`}>
                {stats.periodSubscribers > 0 ? `+${stats.periodSubscribers}` : '0'}
              </span>
            </div>
          </div>

          {/* Emails Sent */}
          <div 
            className="rounded-[12px] p-5 border border-white/[0.06]"
            style={{ background: 'rgba(255, 255, 255, 0.02)' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(34, 197, 94, 0.15)' }}
              >
                <EmailIcon className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-[12px] text-white/40">Emails sent</span>
            </div>
            <p className="text-[28px] font-medium text-white/90">
              {stats.totalEmailsSent}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] text-white/30">{periodLabels[period]}</span>
              <span className={`text-[11px] font-medium ${stats.periodEmailsSent > 0 ? 'text-emerald-400' : 'text-white/50'}`}>
                {stats.periodEmailsSent > 0 ? `+${stats.periodEmailsSent}` : '0'}
              </span>
            </div>
          </div>

          {/* Open Rate */}
          <div 
            className="rounded-[12px] p-5 border border-white/[0.06]"
            style={{ background: 'rgba(255, 255, 255, 0.02)' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(168, 85, 247, 0.15)' }}
              >
                <EyeIcon className="w-4 h-4 text-purple-400" />
              </div>
              <span className="text-[12px] text-white/40">Open rate</span>
            </div>
            <p className="text-[28px] font-medium text-white/90">
              {stats.openRate > 0 ? `${stats.openRate}%` : '—'}
            </p>
            <p className="text-[11px] text-white/30 mt-1">
              {stats.periodOpens > 0 ? `${stats.periodOpens} opens ${periodLabels[period].toLowerCase()}` : 'No data yet'}
            </p>
          </div>

          {/* Replies */}
          <div 
            className="rounded-[12px] p-5 border border-white/[0.06]"
            style={{ background: 'rgba(255, 255, 255, 0.02)' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(251, 191, 36, 0.15)' }}
              >
                <ReplyIcon className="w-4 h-4 text-amber-400" />
              </div>
              <span className="text-[12px] text-white/40">Replies</span>
            </div>
            <p className="text-[28px] font-medium text-white/90">
              {stats.totalReplies}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] text-white/30">{periodLabels[period]}</span>
              <span className={`text-[11px] font-medium ${stats.periodReplies > 0 ? 'text-emerald-400' : 'text-white/50'}`}>
                {stats.periodReplies > 0 ? `+${stats.periodReplies}` : '0'}
              </span>
            </div>
          </div>
        </div>

        {/* Growth Chart */}
        <div 
          className="rounded-[12px] p-5 border border-white/[0.06] mt-3"
          style={{ background: 'rgba(255, 255, 255, 0.02)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[13px] font-medium text-white/70">Tribe growth</h3>
            <span className="text-[11px] text-white/30">{periodLabels[period]}</span>
          </div>
          <div className="h-[100px] flex items-end gap-1.5">
            {stats.chartData.map((value, i) => {
              const maxValue = Math.max(...stats.chartData, 1);
              const minValue = Math.min(...stats.chartData);
              const range = maxValue - minValue || 1;
              const height = ((value - minValue) / range) * 80 + 20; // Min 20% height for visibility
              const isLast = i === stats.chartData.length - 1;
              return (
                <div
                  key={i}
                  className="flex-1 rounded-t-sm transition-all relative group"
                  style={{ 
                    height: `${height}%`,
                    background: isLast 
                      ? 'rgba(59, 130, 246, 0.6)' 
                      : 'rgba(59, 130, 246, 0.25)',
                  }}
                >
                  {/* Tooltip on hover */}
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="bg-white/10 backdrop-blur-sm px-2 py-1 rounded text-[10px] text-white/80 whitespace-nowrap">
                      {value}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2">
            {stats.chartLabels.map((label, i) => {
              // Only show some labels to avoid crowding
              let showLabel = true;
              if (period === "30d") {
                showLabel = i % 5 === 0 || i === stats.chartLabels.length - 1;
              } else if (period === "24h") {
                // Show every 4 hours: 12AM, 4AM, 8AM, 12PM, 4PM, 8PM, and current
                showLabel = i % 4 === 0 || i === stats.chartLabels.length - 1;
              }
              return (
                <span key={i} className="text-[10px] text-white/25 flex-1 text-center">
                  {showLabel ? label : ''}
                </span>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        {sentEmails.length > 0 && (
          <div 
            className="rounded-[12px] p-5 border border-white/[0.06] mt-3"
            style={{ background: 'rgba(255, 255, 255, 0.02)' }}
          >
            <h3 className="text-[13px] font-medium text-white/70 mb-3">Recent emails</h3>
            <div className="space-y-2">
              {sentEmails.slice(0, 3).map((email) => (
                <Link 
                  key={email.id}
                  href={`/email/${email.id}`}
                  className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] -mx-2 px-2 rounded-lg transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-white/60 truncate">
                      {email.subject || 'Untitled'}
                    </p>
                    <p className="text-[11px] text-white/30">
                      {email.recipient_count} recipients
                    </p>
                  </div>
                  <span className="text-[11px] text-white/25 ml-3">
                    {formatRelativeTime(email.sent_at)}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Tips for Creators */}
        <div className="mt-3">
          <TipsCarousel />
        </div>
      </div>
    </div>
  );
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="5" r="2.5" />
      <path d="M3 14c0-2.5 2.5-4 5-4s5 1.5 5 4" />
    </svg>
  );
}

function EmailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3.5" width="12" height="9" rx="1.5" />
      <path d="M2 5.5l6 3.5 6-3.5" />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="2" />
      <path d="M1.5 8c0 0 2.5-4.5 6.5-4.5s6.5 4.5 6.5 4.5-2.5 4.5-6.5 4.5-6.5-4.5-6.5-4.5z" />
    </svg>
  );
}

function ReplyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 5L2 8l4 3" />
      <path d="M2 8h8a4 4 0 0 1 4 4v1" />
    </svg>
  );
}

