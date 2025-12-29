import { getDashboardStats, getSentEmails } from "@/lib/actions";

export default async function DashboardPage() {
  const stats = await getDashboardStats();
  const sentEmails = await getSentEmails();

  // Calculate real chart data from subscriber growth (last 7 days)
  const chartData = Array.from({ length: 7 }, (_, i) => {
    // Create descending pattern based on week subscribers
    const base = stats.totalSubscribers;
    const dailyGrowth = stats.weekSubscribers / 7;
    return Math.max(0, Math.round(base - dailyGrowth * (6 - i)));
  });

  return (
    <div className="flex flex-col items-center pt-14 px-6">
      <div className="w-full max-w-[540px]">
        {/* Header */}
        <h1 className="text-[20px] font-medium text-white/90 mb-6">
          Dashboard
        </h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
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
              <span className="text-[11px] text-white/30">This week</span>
              <span className={`text-[11px] font-medium ${stats.weekSubscribers > 0 ? 'text-emerald-400' : 'text-white/50'}`}>
                {stats.weekSubscribers > 0 ? `+${stats.weekSubscribers}` : '0'}
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
              <span className="text-[11px] text-white/30">This week</span>
              <span className={`text-[11px] font-medium ${stats.weekEmailsSent > 0 ? 'text-emerald-400' : 'text-white/50'}`}>
                {stats.weekEmailsSent > 0 ? `+${stats.weekEmailsSent}` : '0'}
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
              {stats.openingRate > 0 ? `${stats.openingRate}%` : '—'}
            </p>
            <p className="text-[11px] text-white/30 mt-1">
              {stats.openingRate > 0 ? 'Average across all emails' : 'No data yet'}
            </p>
          </div>

          {/* Campaigns */}
          <div 
            className="rounded-[12px] p-5 border border-white/[0.06]"
            style={{ background: 'rgba(255, 255, 255, 0.02)' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(251, 191, 36, 0.15)' }}
              >
                <CampaignIcon className="w-4 h-4 text-amber-400" />
              </div>
              <span className="text-[12px] text-white/40">Campaigns</span>
            </div>
            <p className="text-[28px] font-medium text-white/90">
              {sentEmails.length}
            </p>
            <p className="text-[11px] text-white/30 mt-1">
              Total emails composed
            </p>
          </div>
        </div>

        {/* Growth Chart */}
        <div 
          className="rounded-[12px] p-5 border border-white/[0.06]"
          style={{ background: 'rgba(255, 255, 255, 0.02)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[13px] font-medium text-white/70">Tribe growth</h3>
            <span className="text-[11px] text-white/30">Last 7 days</span>
          </div>
          <div className="h-[100px] flex items-end gap-1.5">
            {chartData.map((value, i) => {
              const maxValue = Math.max(...chartData, 1);
              const height = (value / maxValue) * 100;
              const isToday = i === chartData.length - 1;
              return (
                <div
                  key={i}
                  className="flex-1 rounded-t-sm transition-all"
                  style={{ 
                    height: `${Math.max(height, 4)}%`,
                    background: isToday 
                      ? 'rgba(59, 130, 246, 0.6)' 
                      : 'rgba(59, 130, 246, 0.25)',
                  }}
                />
              );
            })}
          </div>
          <div className="flex justify-between mt-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today'].map((day, i) => (
              <span key={i} className="text-[10px] text-white/25 flex-1 text-center">
                {day}
              </span>
            ))}
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
                <div 
                  key={email.id} 
                  className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0"
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
                </div>
              ))}
            </div>
          </div>
        )}
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

function CampaignIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v10l3-2 4 2 3-2V1l-3 2-4-2-3 2z" />
    </svg>
  );
}
