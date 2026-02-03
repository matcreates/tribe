"use client";

import { Sidebar } from "./Sidebar";
import { useTheme } from "@/lib/theme";

interface ShellProps {
  children: React.ReactNode;
  sentEmails: { id: string; subject: string | null }[];
  user: {
    name: string;
    avatar: string | null;
  };
}

export function Shell({ children, sentEmails, user }: ShellProps) {
  const { theme } = useTheme();
  
  return (
    <div 
      className="min-h-screen transition-colors duration-300" 
      style={{ background: theme === 'light' ? 'rgb(250, 248, 245)' : 'rgb(24, 24, 24)' }}
    >
      <Sidebar sentEmails={sentEmails} user={user} />
      {/* Main content: full width on mobile, offset by sidebar on desktop */}
      <main className="min-h-screen pt-16 lg:pt-0 lg:ml-[260px]">
        {children}
      </main>
    </div>
  );
}
