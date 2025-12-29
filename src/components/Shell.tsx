"use client";

import { Sidebar } from "./Sidebar";

interface ShellProps {
  children: React.ReactNode;
  sentEmails: { id: string; subject: string | null }[];
}

export function Shell({ children, sentEmails }: ShellProps) {
  return (
    <div className="min-h-screen" style={{ background: 'rgb(24, 24, 24)' }}>
      <Sidebar sentEmails={sentEmails} />
      <main className="ml-[220px] min-h-screen">
        {children}
      </main>
    </div>
  );
}
