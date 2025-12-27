import { getDashboardStats } from "@/lib/actions";

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div className="flex flex-col items-center pt-14 px-6">
      <div className="w-full max-w-[540px] space-y-4">
        {/* Main Stats Card - People in your tribe */}
        <div 
          className="rounded-[16px] border border-white/[0.06] p-6"
          style={{ background: 'rgba(255, 255, 255, 0.03)' }}
        >
          <div className="flex">
            {/* Left side - Stats */}
            <div className="flex-1">
              <p className="text-[13px] text-white/45 mb-2">People in your tribe</p>
              <p className="text-[48px] font-medium text-white/90 leading-none mb-4 tracking-tight">
                {stats.totalSubscribers.toLocaleString()}
              </p>
              
              <div className="space-y-1.5">
                <div className="flex items-center justify-between max-w-[180px]">
                  <span className="text-[12px] text-white/40">Today</span>
                  <span className="text-[12px] text-white/70 font-medium">
                    {stats.todaySubscribers > 0 ? `+${stats.todaySubscribers}` : stats.todaySubscribers}
                  </span>
                </div>
                <div className="flex items-center justify-between max-w-[180px]">
                  <span className="text-[12px] text-white/40">This week</span>
                  <span className="text-[12px] text-white/90 font-medium">
                    {stats.weekSubscribers > 0 ? `+${stats.weekSubscribers}` : stats.weekSubscribers}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Right side - Chart */}
            <div className="flex items-center justify-center w-[200px]">
              <MiniChart />
            </div>
          </div>
        </div>

        {/* Bottom row - Two cards */}
        <div className="grid grid-cols-2 gap-4">
          {/* Overall emails sent */}
          <div 
            className="rounded-[16px] border border-white/[0.06] p-5"
            style={{ background: 'rgba(255, 255, 255, 0.03)' }}
          >
            <p className="text-[12px] text-white/40 mb-2">Overall email sent</p>
            <p className="text-[32px] font-medium text-white/90 leading-none mb-3 tracking-tight">
              {stats.totalEmailsSent.toLocaleString()}
            </p>
            
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-white/35">Today</span>
                <span className="text-[11px] text-white/60 font-medium">
                  {stats.todayEmailsSent}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-white/35">This week</span>
                <span className="text-[11px] text-white/80 font-medium">
                  {stats.weekEmailsSent.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Overall opening rate */}
          <div 
            className="rounded-[16px] border border-white/[0.06] p-5"
            style={{ background: 'rgba(255, 255, 255, 0.03)' }}
          >
            <p className="text-[12px] text-white/40 mb-2">Overall opening rate</p>
            <p className="text-[32px] font-medium text-white/90 leading-none mb-3 tracking-tight">
              {stats.openingRate > 0 ? `${stats.openingRate}%` : '—'}
            </p>
            
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-white/35">Today</span>
                <span className="text-[11px] text-white/60 font-medium">
                  {stats.todayOpeningRate > 0 ? `${stats.todayOpeningRate}%` : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-white/35">This week</span>
                <span className="text-[11px] text-white/80 font-medium">
                  {stats.weekOpeningRate > 0 ? `${stats.weekOpeningRate}%` : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniChart() {
  const points = [
    { x: 0, y: 70 },
    { x: 20, y: 65 },
    { x: 40, y: 55 },
    { x: 60, y: 60 },
    { x: 80, y: 45 },
    { x: 100, y: 50 },
    { x: 120, y: 35 },
    { x: 140, y: 25 },
    { x: 160, y: 30 },
    { x: 180, y: 20 },
  ];

  const pathData = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  return (
    <div className="relative w-full h-[80px]">
      <div 
        className="absolute left-0 top-0 bottom-0 w-px"
        style={{ 
          background: 'repeating-linear-gradient(to bottom, rgba(255,255,255,0.15) 0px, rgba(255,255,255,0.15) 4px, transparent 4px, transparent 8px)' 
        }}
      />
      
      <div 
        className="absolute left-0 right-0 bottom-0 h-px"
        style={{ 
          background: 'repeating-linear-gradient(to right, rgba(255,255,255,0.1) 0px, rgba(255,255,255,0.1) 4px, transparent 4px, transparent 8px)' 
        }}
      />
      
      <svg 
        viewBox="0 0 180 80" 
        className="w-full h-full"
        preserveAspectRatio="none"
      >
        <path
          d={pathData}
          fill="none"
          stroke="rgba(255, 255, 255, 0.7)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
