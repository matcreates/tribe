"use client";

import { Sidebar } from "./Sidebar";

interface ShellProps {
  children: React.ReactNode;
  sentEmails: { id: string; subject: string | null }[];
  user: {
    name: string;
    avatar: string | null;
  };
}

export function Shell({ children, sentEmails, user }: ShellProps) {
  return (
    <div className="min-h-screen" style={{ background: 'rgb(24, 24, 24)' }}>
      <Sidebar sentEmails={sentEmails} user={user} />
      {/* Main content: full width on mobile, offset by sidebar on desktop */}
      <main className="min-h-screen pt-16 lg:pt-0 lg:ml-[260px]">
        {children}
      </main>
    </div>
  );
}
