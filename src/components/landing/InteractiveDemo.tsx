"use client";

import { useState } from "react";
import Image from "next/image";

type DemoTab = "dashboard" | "write" | "tribe" | "gifts" | "join";

const SENT_EMAILS = [
  { id: "1", subject: "Something I've been working on", recipients: 1247, time: "2 days ago", opens: 847, openRate: 68 },
  { id: "2", subject: "A quick personal update", recipients: 1189, time: "5 days ago", opens: 892, openRate: 75 },
  { id: "3", subject: "Behind the scenes", recipients: 1102, time: "1 week ago", opens: 771, openRate: 70 },
];

const REPLIES = [
  { email: "alex@example.com", subject: "Re: Something I've been working on", text: "This looks incredible! Can't wait to try it out.", time: "2 hours ago" },
  { email: "jordan@example.com", subject: "Re: A quick personal update", text: "Really appreciate you sharing this. Keep going!", time: "1 day ago" },
  { email: "sam@example.com", subject: "Re: Behind the scenes", text: "Love seeing the process. More of this please!", time: "3 days ago" },
];

export function InteractiveDemo() {
  const [activeTab, setActiveTab] = useState<DemoTab>("write");

  return (
    <section className="relative px-4 sm:px-6 -mt-16 sm:-mt-32 z-20">
      <div className="max-w-6xl mx-auto">
        {/* Mobile: Static image */}
        <div className="lg:hidden">
          <div className="rounded-2xl border border-black/[0.08] overflow-hidden shadow-xl bg-white">
            <Image 
              src="/demo-mobile.png" 
              alt="Tribe app demo" 
              width={1200} 
              height={750}
              className="w-full h-auto"
            />
          </div>
          <p className="text-center text-[12px] text-black/30 mt-4">
            Try the full demo on desktop
          </p>
        </div>

        {/* Desktop: Interactive demo */}
        <div 
          className="hidden lg:block rounded-2xl border border-black/[0.1] overflow-hidden shadow-xl"
          style={{ 
            background: "rgb(252, 250, 247)",
            aspectRatio: "16/10",
          }}
        >
          {/* Browser toolbar */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-black/[0.06]" style={{ background: "rgb(252, 250, 247)" }}>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
              <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
              <div className="w-3 h-3 rounded-full bg-[#28CA41]" />
            </div>
            
            <div className="flex-1 max-w-md mx-auto">
              <div 
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] text-black/50 bg-white border border-black/[0.06]"
              >
                <LockIcon className="w-3 h-3" />
                <span>madewithtribe.com/{activeTab === "join" ? "join-page" : activeTab}</span>
              </div>
            </div>
            
            <div className="w-[54px]" />
          </div>

          {/* App content */}
          <div className="flex h-[calc(100%-48px)]">
            {/* Sidebar */}
            <div 
              className="w-[180px] border-r border-black/[0.06] flex flex-col"
              style={{ background: "rgb(252, 250, 247)" }}
            >
              {/* Logo */}
              <div className="px-8 pt-8 pb-6">
                <TribeLogo className="h-[18px] w-auto text-black/80" />
              </div>
              
              {/* Nav items - centered vertically */}
              <nav className="flex-1 px-4 flex flex-col justify-center">
                <ul className="space-y-1">
                  {([
                    { id: "dashboard", label: "Dashboard", icon: DashboardIcon },
                    { id: "write", label: "Write", icon: PencilIcon },
                    { id: "tribe", label: "Your tribe", icon: UsersIcon },
                    { id: "gifts", label: "Gifts", icon: GiftIcon },
                    { id: "join", label: "Join page", icon: SquarePlusIcon },
                  ] as const).map(({ id, label, icon: Icon }) => (
                    <li key={id}>
                      <button
                        onClick={() => setActiveTab(id)}
                        className={`w-full flex items-center gap-2.5 px-4 py-2 rounded-md text-[11px] transition-colors ${
                          activeTab === id
                            ? "bg-black/[0.06] text-black/90"
                            : "text-black/45 hover:text-black/70 hover:bg-black/[0.04]"
                        }`}
                      >
                        <Icon className="w-[13px] h-[13px]" />
                        {label}
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>
              
              {/* Sent emails section */}
              <div className="px-4 pb-6">
                <p className="px-4 mb-2 text-[10px] text-black/30 tracking-wide">
                  Emails sent
                </p>
                <ul className="space-y-0">
                  {SENT_EMAILS.slice(0, 3).map((email) => (
                    <li key={email.id}>
                      <button className="w-full text-left px-4 py-1.5 text-[10px] text-black/50 truncate rounded-md hover:bg-black/[0.04] hover:text-black/70 transition-colors">
                        {email.subject}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              
              {/* User section */}
              <div className="px-4 pb-8 border-t border-black/[0.06] pt-4">
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-black/[0.04] transition-colors cursor-pointer">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-[10px] font-medium text-white">
                    M
                  </div>
                  <span className="text-[11px] text-black/60">Mat</span>
                </div>
              </div>
            </div>

            {/* Main content */}
            <div className="flex-1 overflow-auto" style={{ background: "rgb(252, 250, 247)" }}>
              <div className="pt-10 px-6 pb-8 flex justify-center">
                <div className="w-full max-w-[480px]">
                  {activeTab === "dashboard" && <DemoDashboard />}
                  {activeTab === "write" && <DemoWrite />}
                  {activeTab === "tribe" && <DemoTribe />}
                  {activeTab === "gifts" && <DemoGifts />}
                  {activeTab === "join" && <DemoJoinPage />}
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="hidden lg:block text-center text-[13px] text-black/35 mt-6">
          Interactive demo · Click around to explore Tribe
        </p>
      </div>
    </section>
  );
}

// Demo Dashboard
function DemoDashboard() {
  const [period, setPeriod] = useState<"24h" | "7d" | "30d">("7d");
  const [showReplies, setShowReplies] = useState(false);

  return (
    <div className="space-y-5">
      {/* Header with period toggle */}
      <div className="flex items-center justify-between">
        <h1 className="text-[18px] font-normal text-black/85" style={{ fontFamily: 'HeritageSerif, Georgia, serif' }}>Dashboard</h1>
        <div className="flex gap-1 p-1 rounded-[8px] border border-black/[0.08] bg-white/60">
          {(["24h", "7d", "30d"] as const).map((p) => (
            <button 
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-2.5 py-1 rounded-[6px] text-[10px] font-medium uppercase transition-colors ${
                period === p ? "bg-black/[0.08] text-black/80" : "text-black/40 hover:text-black/60"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={<UsersIcon className="w-4 h-4" />} iconBg="rgba(59, 130, 246, 0.15)" iconColor="#3b82f6" label="Your tribe" value="1,247" change="+12" />
        <StatCard icon={<EmailIcon className="w-4 h-4" />} iconBg="rgba(34, 197, 94, 0.15)" iconColor="#22c55e" label="Emails sent" value="8" change="2 left" />
        <StatCard icon={<EyeIcon className="w-4 h-4" />} iconBg="rgba(168, 85, 247, 0.15)" iconColor="#a855f7" label="Open rate" value="68%" change="+5%" />
        <StatCard icon={<ReplyIcon className="w-4 h-4" />} iconBg="rgba(234, 179, 8, 0.15)" iconColor="#eab308" label="Replies" value="14" change="+3" />
      </div>
      
      {/* Chart */}
      <div 
        className="p-4 rounded-[12px] border border-black/[0.06] bg-white/60"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] text-black/50">Tribe growth</span>
          <span className="text-[10px] text-emerald-600">+47 this week</span>
        </div>
        <DemoChart />
      </div>

      {/* Recent emails / Replies toggle */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-2">
            <button 
              onClick={() => setShowReplies(false)}
              className={`text-[11px] uppercase tracking-wider ${!showReplies ? "text-black/70" : "text-black/35 hover:text-black/55"}`}
            >
              Recent emails
            </button>
            <button 
              onClick={() => setShowReplies(true)}
              className={`text-[11px] uppercase tracking-wider ${showReplies ? "text-black/70" : "text-black/35 hover:text-black/55"}`}
            >
              Replies ({REPLIES.length})
            </button>
          </div>
        </div>
        
        {!showReplies ? (
          <div className="space-y-2">
            {SENT_EMAILS.slice(0, 2).map((email) => (
              <div 
                key={email.id}
                className="flex items-center justify-between p-3 rounded-[10px] border border-black/[0.06] hover:border-black/[0.12] cursor-pointer transition-colors bg-white/60"
              >
                <div>
                  <p className="text-[12px] text-black/70">{email.subject}</p>
                  <p className="text-[10px] text-black/40">{email.recipients} recipients</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-black/55">{email.openRate}% opened</p>
                  <p className="text-[9px] text-black/35">{email.time}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {REPLIES.slice(0, 2).map((reply, i) => (
              <div 
                key={i}
                className="p-3 rounded-[10px] border border-black/[0.06] bg-white/60"
              >
                <div className="flex items-start justify-between mb-1">
                  <p className="text-[11px] text-black/65">{reply.email}</p>
                  <span className="text-[9px] text-black/35">{reply.time}</span>
                </div>
                <p className="text-[10px] text-black/50 line-clamp-1">{reply.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, iconBg, iconColor, label, value, change }: { 
  icon: React.ReactNode; 
  iconBg: string; 
  iconColor: string; 
  label: string; 
  value: string; 
  change: string;
}) {
  return (
    <div 
      className="p-4 rounded-[12px] border border-black/[0.06] bg-white/60"
    >
      <div className="flex items-start justify-between mb-2">
        <div 
          className="w-8 h-8 rounded-[8px] flex items-center justify-center"
          style={{ background: iconBg, color: iconColor }}
        >
          {icon}
        </div>
        <span className="text-[10px] text-emerald-600">{change}</span>
      </div>
      <p className="text-[22px] font-medium text-black/85 mb-0.5">{value}</p>
      <p className="text-[10px] text-black/50">{label}</p>
    </div>
  );
}

function DemoChart() {
  const data = [30, 45, 35, 50, 65, 55, 70, 80, 75, 90, 85, 100];
  const max = Math.max(...data);
  
  return (
    <div className="h-24 flex items-end gap-1">
      {data.map((value, i) => (
        <div 
          key={i}
          className="flex-1 rounded-t-[3px] transition-all hover:opacity-80 cursor-pointer"
          style={{ 
            height: `${(value / max) * 100}%`,
            background: "linear-gradient(180deg, rgba(0, 0, 0, 0.15) 0%, rgba(0, 0, 0, 0.05) 100%)",
          }}
        />
      ))}
    </div>
  );
}

// Demo Write
function DemoWrite() {
  const [subject, setSubject] = useState("Something I've been working on");
  const [body, setBody] = useState("Hey,\n\nI wanted to share something with you that I've been quietly building for the past few months.\n\nIt's still early, but your feedback means everything to me. I'd love to hear what you think.\n\nMore details coming soon.");
  const [allowReplies, setAllowReplies] = useState(true);
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="space-y-5">
      <h1 className="text-[18px] font-normal text-black/85" style={{ fontFamily: 'HeritageSerif, Georgia, serif' }}>Write</h1>
      
      <div 
        className="rounded-[14px] border border-black/[0.08] overflow-hidden bg-white/70"
      >
        {/* Recipients */}
        <div className="px-4 py-3 border-b border-black/[0.06]">
          <div className="text-[12px] text-black/55">
            To all verified members (1,247)
          </div>
        </div>
        
        {/* Subject */}
        <div className="px-4 py-3 border-b border-black/[0.06]">
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full text-[16px] text-black/80 bg-transparent focus:outline-none"
            style={{ fontFamily: 'HeritageSerif, Georgia, serif' }}
            placeholder="Subject..."
          />
        </div>
        
        {/* Message */}
        <div className="px-4 py-3 border-b border-black/[0.06]">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            className="w-full text-[12px] text-black/70 bg-transparent focus:outline-none resize-none leading-relaxed"
            placeholder="Write your message..."
          />
        </div>

        {/* Signature preview */}
        <div className="px-4 py-3 border-b border-black/[0.06]">
          <div className="text-[11px] text-black/45 leading-relaxed" style={{ fontFamily: 'Garamond, Georgia, serif' }}>
            Mat
          </div>
        </div>
        
        {/* Allow replies toggle */}
        <div className="px-4 py-3 border-b border-black/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ReplyIcon className="w-3.5 h-3.5 text-black/45" />
            <span className="text-[11px] text-black/60">Allow replies</span>
          </div>
          <button
            onClick={() => setAllowReplies(!allowReplies)}
            className={`w-9 h-5 rounded-full transition-colors relative ${allowReplies ? "bg-emerald-500" : "bg-black/10"}`}
          >
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${allowReplies ? "left-[18px]" : "left-0.5"}`} />
          </button>
        </div>
        
        {/* Actions */}
        <div className="px-4 py-3 flex items-center gap-2">
          <button 
            className="px-5 py-2 rounded-[8px] text-[10px] font-medium tracking-wider uppercase text-black/80 bg-black/[0.06] border border-black/[0.1] hover:bg-black/[0.1] transition-colors"
          >
            Send
          </button>
          
          {/* Options dropdown */}
          <div className="relative">
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className="px-3 py-2 rounded-[8px] text-[10px] text-black/50 hover:text-black/70 hover:bg-black/[0.04] transition-colors flex items-center gap-1"
            >
              <ChevronDownIcon className="w-3 h-3" />
            </button>
            
            {showMenu && (
              <div 
                className="absolute bottom-full left-0 mb-1 w-36 rounded-[8px] border border-black/[0.1] py-1 shadow-lg bg-white"
              >
                <button className="w-full px-3 py-2 text-left text-[11px] text-black/60 hover:bg-black/[0.04] flex items-center gap-2">
                  <ClockIcon className="w-3 h-3" />
                  Schedule
                </button>
                <button className="w-full px-3 py-2 text-left text-[11px] text-black/60 hover:bg-black/[0.04] flex items-center gap-2">
                  <TestIcon className="w-3 h-3" />
                  Send test email
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Demo Tribe
function DemoTribe() {
  const [filter, setFilter] = useState<"verified" | "all" | "non-verified">("verified");
  
  const members = [
    { email: "alex@example.com", verified: true, date: "Jan 15" },
    { email: "sam@example.com", verified: true, date: "Jan 14" },
    { email: "jordan@example.com", verified: true, date: "Jan 13" },
    { email: "taylor@example.com", verified: true, date: "Jan 12" },
    { email: "casey@example.com", verified: true, date: "Jan 11" },
    { email: "morgan@example.com", verified: true, date: "Jan 10" },
    { email: "riley@example.com", verified: true, date: "Jan 9" },
    { email: "jamie@example.com", verified: false, date: "Jan 8" },
    { email: "drew@example.com", verified: true, date: "Jan 7" },
    { email: "avery@example.com", verified: true, date: "Jan 6" },
    { email: "blake@example.com", verified: true, date: "Jan 5" },
    { email: "chris@example.com", verified: true, date: "Jan 4" },
  ];

  const filteredMembers = members.filter(m => {
    if (filter === "verified") return m.verified;
    if (filter === "non-verified") return !m.verified;
    return true;
  });

  const counts = {
    verified: members.filter(m => m.verified).length,
    all: members.length,
    nonVerified: members.filter(m => !m.verified).length,
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[18px] font-normal text-black/85 mb-1" style={{ fontFamily: 'HeritageSerif, Georgia, serif' }}>
          Your tribe is made of <span className="text-black">{counts.verified}</span> people
        </h1>
        <p className="text-[11px] text-black/45">
          A tribe is a group of people who choose to follow your work.
        </p>
      </div>
      
      {/* Filters */}
      <div className="flex gap-2">
        {([
          { id: "verified", label: "Verified", count: counts.verified },
          { id: "all", label: "All", count: counts.all },
          { id: "non-verified", label: "Non-verified", count: counts.nonVerified },
        ] as const).map(({ id, label, count }) => (
          <button 
            key={id}
            onClick={() => setFilter(id)}
            className={`px-3 py-1.5 rounded-[8px] text-[10px] transition-colors ${
              filter === id ? "bg-black/[0.08] text-black/80" : "text-black/45 hover:bg-black/[0.04]"
            }`}
          >
            {label} ({count})
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black/35" />
        <input
          type="text"
          placeholder="Search..."
          className="w-full pl-9 pr-3 py-2 rounded-[8px] text-[11px] text-black/70 placeholder:text-black/35 bg-white/70 border border-black/[0.08] focus:outline-none focus:border-black/[0.15]"
        />
      </div>
      
      {/* Members list */}
      <div 
        className="rounded-[12px] border border-black/[0.06] overflow-hidden divide-y divide-black/[0.06] bg-white/70"
      >
        {filteredMembers.slice(0, 6).map((member) => (
          <div 
            key={member.email}
            className="flex items-center justify-between px-4 py-2.5 hover:bg-black/[0.02] transition-colors"
          >
            <div className="flex items-center gap-3">
              {member.verified ? (
                <div className="px-1.5 py-0.5 rounded text-[8px] font-medium uppercase tracking-wider" style={{ background: "rgba(45, 138, 138, 0.15)", color: "#2d8a8a" }}>
                  Verified
                </div>
              ) : (
                <div className="w-2 h-2 rounded-full bg-black/20" />
              )}
              <span className="text-[11px] text-black/70">{member.email}</span>
            </div>
            <span className="text-[10px] text-black/35">{member.date}</span>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-center gap-2 text-[10px] text-black/45">
        <button className="px-2 py-1 rounded hover:bg-black/[0.04]">← Prev</button>
        <span>Page 1 of 125</span>
        <button className="px-2 py-1 rounded hover:bg-black/[0.04]">Next →</button>
      </div>
    </div>
  );
}

// Demo Gifts
function DemoGifts() {
  const gifts = [
    { name: "Free eBook.pdf", size: "2.4 MB", downloads: 156, code: "abc123" },
    { name: "Exclusive Wallpaper.zip", size: "8.1 MB", downloads: 89, code: "xyz789" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-[18px] font-normal text-black/85" style={{ fontFamily: 'HeritageSerif, Georgia, serif' }}>Gifts</h1>
        <button 
          className="px-3 py-1.5 rounded-[8px] text-[10px] font-medium tracking-wider uppercase text-black"
          style={{ background: "#E8B84A" }}
        >
          Upload
        </button>
      </div>
      
      <p className="text-[11px] text-black/45">
        Offer free downloads to people joining your tribe.
      </p>
      
      <div className="space-y-3">
        {gifts.map((gift) => (
          <div 
            key={gift.name}
            className="p-4 rounded-[12px] border border-black/[0.06] bg-white/70"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[8px] bg-black/[0.04] flex items-center justify-center">
                  <GiftIcon className="w-5 h-5 text-black/35" />
                </div>
                <div>
                  <p className="text-[12px] text-black/70">{gift.name}</p>
                  <p className="text-[10px] text-black/40">{gift.size} · {gift.downloads} downloads</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div 
                className="flex-1 px-2.5 py-1.5 rounded-[6px] text-[10px] text-black/50 truncate bg-black/[0.03]"
              >
                madewithtribe.com/g/{gift.code}
              </div>
              <button className="px-2 py-1.5 rounded-[6px] text-[9px] text-black/45 hover:text-black/70 hover:bg-black/[0.05]">
                Copy
              </button>
            </div>
          </div>
        ))}
      </div>
      
      <p className="text-[10px] text-black/40 text-center">2/5 gifts uploaded</p>
    </div>
  );
}

// Demo Join Page
function DemoJoinPage() {
  const [email, setEmail] = useState("");

  return (
    <div className="space-y-5">
      <h1 className="text-[18px] font-normal text-black/85" style={{ fontFamily: 'HeritageSerif, Georgia, serif' }}>Join page</h1>
      
      <p className="text-[11px] text-black/45">
        This is how your public join page looks. Share the link to grow your tribe.
      </p>

      {/* Preview of join page - matching actual design */}
      <div 
        className="rounded-[14px] border border-black/[0.08] overflow-hidden bg-white/80"
      >
        <div className="py-10 px-6 flex flex-col items-center text-center">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-[28px] font-medium text-white mb-3 ring-2 ring-black/10">
            M
          </div>
          
          {/* Name */}
          <p className="text-[14px] text-black/60 mb-4">Mat</p>
          
          {/* Title */}
          <h2 className="text-[20px] font-semibold text-black/85 mb-3">Join my tribe</h2>
          
          {/* Description */}
          <p className="text-[13px] text-black/50 leading-relaxed max-w-[280px] mb-6">
            A tribe is a group of people who choose to follow your work, support your ideas, and stay connected.
          </p>
          
          {/* Email input - full width */}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your email address"
            className="w-full max-w-[320px] px-4 py-3 rounded-[10px] text-[13px] text-black/70 placeholder:text-black/35 bg-black/[0.03] border border-black/[0.1] focus:outline-none focus:border-black/[0.2] text-center mb-4"
          />
          
          {/* Join button - centered below */}
          <button 
            className="px-8 py-2.5 rounded-[10px] text-[11px] font-medium tracking-[0.15em] uppercase text-black/80 bg-black/[0.08] hover:bg-black/[0.12] transition-colors"
          >
            Join
          </button>
          
          {/* Made with Tribe footer */}
          <p className="mt-8 text-[11px] text-black/30">
            made with <span className="text-black/50">Tribe</span>
          </p>
        </div>
      </div>

      {/* Page URL */}
      <div className="flex items-center gap-2">
        <div 
          className="flex-1 px-3 py-2 rounded-[8px] text-[11px] text-black/55 truncate bg-black/[0.03]"
        >
          madewithtribe.com/@mat
        </div>
        <button className="px-3 py-2 rounded-[8px] text-[10px] text-black/45 hover:text-black/70 hover:bg-black/[0.05]">
          Copy
        </button>
      </div>
    </div>
  );
}

// Icons - matching actual Sidebar icons
function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="7" width="10" height="7" rx="1.5" />
      <path d="M5 7V5a3 3 0 0 1 6 0v2" />
    </svg>
  );
}

function TribeLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 60 25" fill="currentColor">
      <path d="M16.812 1.044L16.596 5.796C16.572 6.204 16.524 6.48 16.452 6.624C16.404 6.744 16.284 6.804 16.092 6.804C15.924 6.804 15.792 6.744 15.696 6.624C15.624 6.504 15.552 6.336 15.48 6.12C15.432 5.904 15.372 5.652 15.3 5.364C15.228 5.076 15.144 4.752 15.048 4.392C14.712 3.624 14.256 3.144 13.68 2.952C13.104 2.736 12.264 2.628 11.16 2.628H10.584C10.44 2.628 10.32 2.7 10.224 2.844C10.152 2.964 10.116 3.084 10.116 3.204V20.844C10.116 21.228 10.116 21.54 10.116 21.78C10.14 22.02 10.176 22.224 10.224 22.392C10.296 22.536 10.392 22.656 10.512 22.752C10.656 22.848 10.848 22.932 11.088 23.004C11.304 23.076 11.508 23.124 11.7 23.148C11.892 23.148 12.06 23.16 12.204 23.184C12.348 23.208 12.456 23.256 12.528 23.328C12.624 23.4 12.672 23.532 12.672 23.724C12.672 24.06 12.42 24.228 11.916 24.228C11.532 24.228 11.052 24.192 10.476 24.12C9.924 24.024 9.264 23.976 8.496 23.976C7.752 23.976 7.092 24.024 6.516 24.12C5.94 24.192 5.46 24.228 5.076 24.228C4.572 24.228 4.32 24.036 4.32 23.652C4.32 23.484 4.368 23.364 4.464 23.292C4.56 23.22 4.68 23.172 4.824 23.148C4.968 23.124 5.136 23.112 5.328 23.112C5.52 23.112 5.712 23.076 5.904 23.004C6.36 22.86 6.636 22.656 6.732 22.392C6.828 22.128 6.876 21.612 6.876 20.844V3.312C6.876 3.168 6.828 3.024 6.732 2.88C6.66 2.712 6.552 2.628 6.408 2.628H5.4C4.656 2.628 4.044 2.772 3.564 3.06C3.084 3.348 2.616 3.78 2.16 4.356C1.728 5.076 1.392 5.64 1.152 6.048C0.936 6.456 0.684 6.66 0.396 6.66H0.324C0.228 6.66 0.144 6.636 0.072 6.588C0.024 6.54 0 6.396 0 6.156C0 6.132 0.012 6.06 0.036 5.94C0.06 5.82 0.096 5.688 0.144 5.544L1.044 1.872C1.164 1.32 1.248 0.876 1.296 0.54C1.368 0.204 1.524 0.036 1.764 0.036C1.86 0.036 1.932 0.096 1.98 0.216C2.052 0.336 2.112 0.48 2.16 0.648C2.232 0.792 2.292 0.936 2.34 1.08C2.388 1.2 2.472 1.26 2.592 1.26C2.808 1.476 3.372 1.584 4.284 1.584C4.62 1.584 5.004 1.584 5.436 1.584C5.868 1.56 6.348 1.548 6.876 1.548H11.304C11.904 1.548 12.432 1.56 12.888 1.584C13.368 1.608 13.776 1.62 14.112 1.62C14.688 1.62 15.072 1.56 15.264 1.44C15.432 1.344 15.564 1.212 15.66 1.044C15.78 0.876 15.876 0.72 15.948 0.576C16.02 0.408 16.092 0.276 16.164 0.18C16.236 0.06 16.32 0 16.416 0C16.56 0 16.656 0.084 16.704 0.252C16.776 0.396 16.812 0.528 16.812 0.648V1.044Z" />
      <path d="M18.56 8.388V9.792C18.56 10.008 18.596 10.116 18.668 10.116C18.716 10.116 18.824 10.032 18.992 9.864L19.712 9.072C20.48 8.16 21.296 7.704 22.16 7.704C22.808 7.704 23.36 7.944 23.816 8.424C24.272 8.904 24.5 9.504 24.5 10.224C24.5 10.752 24.332 11.184 23.996 11.52C23.684 11.856 23.3 12.024 22.844 12.024C22.484 12.024 22.172 11.94 21.908 11.772C21.644 11.58 21.404 11.376 21.188 11.16C20.972 10.944 20.768 10.752 20.576 10.584C20.384 10.392 20.192 10.296 20 10.296C19.112 10.296 18.668 11.424 18.668 13.68V21.492C18.668 21.9 18.716 22.212 18.812 22.428C18.908 22.62 19.1 22.776 19.388 22.896C19.676 23.04 19.94 23.136 20.18 23.184C20.42 23.208 20.612 23.244 20.756 23.292C20.924 23.316 21.056 23.364 21.152 23.436C21.248 23.508 21.296 23.64 21.296 23.832C21.296 23.976 21.224 24.108 21.08 24.228C20.96 24.324 20.768 24.372 20.504 24.372C20.024 24.372 19.496 24.324 18.92 24.228C18.368 24.156 17.78 24.12 17.156 24.12C16.58 24.12 16.04 24.156 15.536 24.228C15.056 24.3 14.624 24.336 14.24 24.336C13.808 24.336 13.592 24.144 13.592 23.76C13.592 23.592 13.628 23.484 13.7 23.436C13.772 23.364 13.868 23.316 13.988 23.292C14.108 23.244 14.252 23.208 14.42 23.184C14.588 23.16 14.768 23.1 14.96 23.004C15.296 22.836 15.488 22.668 15.536 22.5C15.608 22.308 15.644 22.044 15.644 21.708V12.492C15.644 12.06 15.56 11.772 15.392 11.628C15.248 11.484 15.08 11.388 14.888 11.34C14.72 11.292 14.552 11.256 14.384 11.232C14.24 11.184 14.168 11.052 14.168 10.836C14.168 10.572 14.324 10.38 14.636 10.26C14.948 10.116 15.356 9.876 15.86 9.54C16.556 9.06 17.06 8.628 17.372 8.244C17.708 7.836 17.984 7.632 18.2 7.632C18.44 7.632 18.56 7.884 18.56 8.388Z" />
      <path d="M29.68 8.388V21.528C29.68 21.96 29.716 22.284 29.788 22.5C29.884 22.716 30.04 22.884 30.256 23.004C30.448 23.1 30.628 23.16 30.796 23.184C30.988 23.208 31.144 23.244 31.264 23.292C31.408 23.316 31.516 23.364 31.588 23.436C31.684 23.508 31.732 23.628 31.732 23.796C31.732 24.18 31.516 24.372 31.084 24.372C30.724 24.372 30.292 24.324 29.788 24.228C29.284 24.156 28.744 24.12 28.168 24.12C27.544 24.12 27.016 24.156 26.584 24.228C26.152 24.324 25.804 24.372 25.54 24.372C25.18 24.372 25 24.168 25 23.76C25 23.592 25.024 23.472 25.072 23.4C25.144 23.328 25.228 23.28 25.324 23.256C25.444 23.232 25.564 23.22 25.684 23.22C25.804 23.196 25.936 23.148 26.08 23.076C26.344 22.932 26.5 22.764 26.548 22.572C26.62 22.356 26.656 22.008 26.656 21.528V13.032C26.656 12.384 26.572 11.952 26.404 11.736C26.26 11.52 26.092 11.388 25.9 11.34C25.732 11.268 25.564 11.232 25.396 11.232C25.252 11.208 25.18 11.076 25.18 10.836C25.18 10.572 25.336 10.356 25.648 10.188C25.984 10.02 26.452 9.768 27.052 9.432C27.412 9.216 27.712 9 27.952 8.784C28.216 8.568 28.432 8.376 28.6 8.208C28.72 8.088 29.232 7.744 29.352 7.812C29.507 7.812 29.68 7.884 29.68 8.388Z" />
      <path d="M35.38 4V9.912C35.38 10.056 35.404 10.128 35.452 10.128C35.524 10.128 35.62 10.068 35.74 9.948L36.172 9.516C36.844 8.82 37.468 8.316 38.044 8.004C38.644 7.668 39.34 7.5 40.132 7.5C40.924 7.5 41.68 7.692 42.4 8.076C43.12 8.46 43.744 9.012 44.272 9.732C44.8 10.428 45.22 11.28 45.532 12.288C45.844 13.296 46 14.412 46 15.636C46 16.98 45.82 18.204 45.46 19.308C45.1 20.412 44.584 21.36 43.912 22.152C43.264 22.944 42.484 23.556 41.572 23.988C40.684 24.444 39.7 24.672 38.62 24.672C36.5 24.672 35 24.004 35 24.004C35 24.004 33.868 23.592 33 23.004C32.633 22.756 32.5 22.504 32.464 22.004C32.408 21.227 32.356 20.904 32.356 19.92V4.648C32.356 4.336 32.312 4.024 32 3.868C31 3.368 31.284 2.46 32.392 2.164C33.5 1.868 33.844 1.564 34.228 1.3C34.636 1.012 34.9 0.868 35.02 0.868C35.212 0.868 35.332 0.928 35.38 1.048C35.428 1.168 35.452 1.336 35.452 1.552C35.452 1.912 35.44 2.296 35.416 2.704C35.392 3.088 35.38 3.52 35.38 4ZM35.38 20.208C35.38 21.36 35.632 22.212 36.136 22.764C36.664 23.316 37.384 23.592 38.296 23.592C38.992 23.592 39.628 23.424 40.204 23.088C40.78 22.752 41.272 22.284 41.68 21.684C42.112 21.06 42.436 20.328 42.652 19.488C42.892 18.624 43.012 17.688 43.012 16.68C43.012 14.52 42.556 12.864 41.644 11.712C40.756 10.536 39.628 9.948 38.26 9.948C37.564 9.948 37.024 10.068 36.64 10.308C36.256 10.548 35.968 10.884 35.776 11.316C35.584 11.748 35.464 12.276 35.416 12.9C35.392 13.5 35.38 14.172 35.38 14.916V20.208Z" />
      <path d="M52.728 12.72C53.904 12.72 54.756 12.588 55.284 12.324C55.836 12.06 56.112 11.532 56.112 10.74C56.112 10.14 55.86 9.588 55.356 9.084C54.876 8.58 54.252 8.328 53.484 8.328C52.644 8.328 51.912 8.652 51.288 9.3C50.664 9.948 50.256 10.764 50.064 11.748L49.956 12.324V12.396C49.956 12.612 50.1 12.72 50.388 12.72H52.728ZM58.056 13.836H50.1C49.908 13.836 49.788 13.872 49.74 13.944C49.692 14.016 49.668 14.172 49.668 14.412V15.276C49.668 17.508 50.136 19.272 51.072 20.568C52.032 21.864 53.268 22.512 54.78 22.512C55.452 22.512 56.028 22.404 56.508 22.188C57.012 21.972 57.42 21.732 57.732 21.468C58.068 21.204 58.32 20.964 58.488 20.748C58.68 20.532 58.812 20.424 58.884 20.424C59.076 20.424 59.172 20.556 59.172 20.82C59.172 21.084 59.028 21.432 58.74 21.864C58.452 22.296 58.032 22.728 57.48 23.16C56.952 23.568 56.316 23.928 55.572 24.24C54.828 24.552 53.988 24.708 53.052 24.708C52.068 24.708 51.168 24.504 50.352 24.096C49.56 23.712 48.876 23.148 48.3 22.404C47.724 21.66 47.28 20.76 46.968 19.704C46.656 18.648 46.5 17.46 46.5 16.14C46.5 14.82 46.668 13.632 47.004 12.576C47.364 11.496 47.856 10.584 48.48 9.84C49.104 9.096 49.836 8.52 50.676 8.112C51.54 7.704 52.476 7.5 53.484 7.5C54.348 7.5 55.14 7.656 55.86 7.968C56.58 8.256 57.192 8.652 57.696 9.156C58.2 9.66 58.584 10.248 58.848 10.92C59.136 11.592 59.28 12.312 59.28 13.08C59.28 13.392 59.184 13.596 58.992 13.692C58.8 13.788 58.488 13.836 58.056 13.836Z" />
      <path d="M30 3.5C30 4.881 29.105 6 28 6C26.895 6 26 4.881 26 3.5C26 2.119 26.895 1 28 1C29.105 1 30 2.119 30 3.5Z" />
    </svg>
  );
}

// Icons matching the actual Sidebar
function DashboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 10 11" fill="currentColor">
      <path fillRule="evenodd" clipRule="evenodd" d="M5.30695 0.105325C5.1264 -0.0351083 4.8736 -0.0351083 4.69305 0.105325L0.19303 3.60532C0.071235 3.70005 0 3.8457 0 4V9.5C0 10.0523 0.447715 10.5 1 10.5H9C9.5523 10.5 10 10.0523 10 9.5V4C10 3.8457 9.92875 3.70005 9.80695 3.60532L5.30695 0.105325ZM7 9.5H9V4.24454L5 1.13343L1 4.24454V9.5H3V5.5C3 5.22385 3.22386 5 3.5 5H6.5C6.77615 5 7 5.22385 7 5.5V9.5ZM4 9.5V6H6V9.5H4Z" />
    </svg>
  );
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 12 12" fill="currentColor">
      <path fillRule="evenodd" clipRule="evenodd" d="M9.85944 1.2C9.73596 1.2 9.61362 1.22433 9.4995 1.27159C9.38538 1.31886 9.2817 1.38814 9.19434 1.47548L1.95395 8.71588L1.45514 10.5449L3.28412 10.046L10.5245 2.80564C10.6118 2.7183 10.6811 2.61461 10.7284 2.5005C10.7757 2.38639 10.8 2.26408 10.8 2.14056C10.8 2.01705 10.7757 1.89474 10.7284 1.78062C10.6811 1.66651 10.6118 1.56282 10.5245 1.47548C10.4372 1.38814 10.3335 1.31886 10.2194 1.27159C10.1053 1.22433 9.98298 1.2 9.85944 1.2ZM9.04026 0.162942C9.3 0.0553678 9.57834 0 9.85944 0C10.1405 0 10.4189 0.0553678 10.6786 0.162942C10.9383 0.270515 11.1743 0.428189 11.3731 0.626956C11.5718 0.825724 11.7295 1.0617 11.8371 1.32141C11.9446 1.58111 12 1.85946 12 2.14056C12 2.42166 11.9446 2.70001 11.8371 2.95972C11.7295 3.21942 11.5718 3.4554 11.3731 3.65417L4.01998 11.0072C3.94615 11.0811 3.85432 11.1344 3.75358 11.1618L0.757883 11.9789C0.550157 12.0355 0.328001 11.9765 0.175751 11.8242C0.023501 11.672 -0.0354971 11.4498 0.0211549 11.2421L0.838163 8.24644C0.865637 8.1457 0.918923 8.05384 0.992759 7.98004L8.34582 0.626956C8.5446 0.428189 8.78058 0.270515 9.04026 0.162942Z" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 11 12" fill="currentColor">
      <path fillRule="evenodd" clipRule="evenodd" d="M5.5 0C3.82934 0 2.475 1.34314 2.475 3C2.475 4.65686 3.82934 6 5.5 6C7.17068 6 8.525 4.65686 8.525 3C8.525 1.34314 7.17068 0 5.5 0ZM3.575 3C3.575 1.94564 4.43685 1.09091 5.5 1.09091C6.56315 1.09091 7.425 1.94564 7.425 3C7.425 4.05436 6.56315 4.90909 5.5 4.90909C4.43685 4.90909 3.575 4.05436 3.575 3Z" />
      <path d="M3.3 7.09091C1.47746 7.09091 0 8.55616 0 10.3636V11.4545C0 11.7558 0.246246 12 0.55 12C0.853754 12 1.1 11.7558 1.1 11.4545V10.3636C1.1 9.15867 2.08497 8.18182 3.3 8.18182H7.7C8.915 8.18182 9.9 9.15867 9.9 10.3636V11.4545C9.9 11.7558 10.1462 12 10.45 12C10.7538 12 11 11.7558 11 11.4545V10.3636C11 8.55616 9.52254 7.09091 7.7 7.09091H3.3Z" />
    </svg>
  );
}

function GiftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 22 21" fill="currentColor">
      <path fillRule="evenodd" clipRule="evenodd" d="M3 3.5C3 4.02384 3.11743 4.53557 3.33772 5H1C0.44772 5 0 5.44772 0 6V11C0 11.5523 0.44772 12 1 12H2V20C2 20.5523 2.44772 21 3 21H19C19.5523 21 20 20.5523 20 20V12H21C21.5523 12 22 11.5523 22 11V6C22 5.44772 21.5523 5 21 5H18.6623C18.8826 4.53557 19 4.02384 19 3.5C19 2.57174 18.6313 1.6815 17.9749 1.02513C17.3185 0.36875 16.4283 0 15.5 0C14.1769 0 13.1209 0.37202 12.3032 0.97769C11.7384 1.39606 11.316 1.90438 11 2.42396C10.684 1.90438 10.2616 1.39606 9.6968 0.97769C8.87913 0.37202 7.82309 0 6.5 0C5.57174 0 4.6815 0.36875 4.02513 1.02513C3.36875 1.6815 3 2.57174 3 3.5ZM6.5 2C6.10218 2 5.72064 2.15804 5.43934 2.43934C5.15804 2.72064 5 3.10218 5 3.5C5 3.89782 5.15804 4.27936 5.43934 4.56066C5.72064 4.84196 6.10218 5 6.5 5H9.8745C9.8032 4.66322 9.6934 4.2833 9.5256 3.91036C9.2937 3.39508 8.96597 2.92528 8.50633 2.58481C8.05837 2.25298 7.42691 2 6.5 2ZM12.1255 5H15.5C15.8978 5 16.2794 4.84196 16.5607 4.56066C16.842 4.27936 17 3.89782 17 3.5C17 3.10218 16.842 2.72064 16.5607 2.43934C16.2794 2.15804 15.8978 2 15.5 2C14.5731 2 13.9416 2.25298 13.4937 2.58481C13.034 2.92528 12.7063 3.39508 12.4744 3.91036C12.3066 4.2833 12.1968 4.66322 12.1255 5ZM12 7V10H20V7H12ZM10 7V10H2V7H10ZM12 19H18V12H12V19ZM10 12V19H4V12H10Z" />
    </svg>
  );
}

function SquarePlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 12 12" fill="currentColor">
      <path d="M6 2.4C6.33138 2.4 6.6 2.66863 6.6 3V5.4H9C9.33138 5.4 9.6 5.66862 9.6 6C9.6 6.33138 9.33138 6.6 9 6.6H6.6V9C6.6 9.33138 6.33138 9.6 6 9.6C5.66862 9.6 5.4 9.33138 5.4 9V6.6H3C2.66863 6.6 2.4 6.33138 2.4 6C2.4 5.66862 2.66863 5.4 3 5.4H5.4V3C5.4 2.66863 5.66862 2.4 6 2.4Z" />
      <path fillRule="evenodd" clipRule="evenodd" d="M0 1.5C0 0.671574 0.671574 0 1.5 0H10.5C11.3284 0 12 0.671574 12 1.5V10.5C12 11.3284 11.3284 12 10.5 12H1.5C0.671574 12 0 11.3284 0 10.5V1.5ZM1.5 1.2C1.33432 1.2 1.2 1.33432 1.2 1.5V10.5C1.2 10.6657 1.33432 10.8 1.5 10.8H10.5C10.6657 10.8 10.8 10.6657 10.8 10.5V1.5C10.8 1.33432 10.6657 1.2 10.5 1.2H1.5Z" />
    </svg>
  );
}

function EmailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="3" width="12" height="10" rx="1.5" />
      <path d="M2 5l6 4 6-4" />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" />
      <circle cx="8" cy="8" r="2" />
    </svg>
  );
}

function ReplyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 4L2 8l4 4" />
      <path d="M2 8h9a3 3 0 0 1 3 3v1" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 6l4 4 4-4" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 5v3l2 2" />
    </svg>
  );
}

function TestIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M14 2L6 10l-3-3" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="7" cy="7" r="4" />
      <path d="M10 10l4 4" />
    </svg>
  );
}
