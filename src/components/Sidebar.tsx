"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

interface SidebarProps {
  sentEmails: { id: string; subject: string | null }[];
}

export function Sidebar({ sentEmails }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: DashboardIcon },
    { href: "/new-email", label: "New email", icon: PencilIcon },
    { href: "/tribe", label: "Your tribe", icon: UsersIcon },
    { href: "/join", label: "Join page", icon: SquarePlusIcon },
    { href: "/settings", label: "Settings", icon: GearIcon },
  ];

  const handleLogout = () => {
    signOut({ callbackUrl: "/login" });
  };

  return (
    <aside className="w-[200px] h-screen flex flex-col fixed left-0 top-0" style={{ background: 'rgb(18, 18, 18)' }}>
      {/* Logo */}
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-[22px] text-white/90 italic" style={{ fontFamily: 'var(--font-serif), Georgia, serif' }}>
          Tribe
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2.5">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`
                    flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] transition-colors
                    ${isActive 
                      ? "bg-white/[0.08] text-white/90" 
                      : "text-white/45 hover:bg-white/[0.05] hover:text-white/70"
                    }
                  `}
                >
                  <Icon className="w-[15px] h-[15px]" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Sent Emails */}
      <div className="px-2.5 pb-4">
        <p className="px-2.5 mb-1.5 text-[11px] text-white/25 tracking-wide">
          Your emails
        </p>
        <ul className="space-y-0 max-h-[120px] overflow-y-auto">
          {sentEmails.slice(0, 5).map((email) => {
            const isActive = pathname === `/email/${email.id}`;
            return (
              <li key={email.id}>
                <Link
                  href={`/email/${email.id}`}
                  className={`block px-2.5 py-1.5 text-[13px] truncate rounded-md transition-colors ${
                    isActive 
                      ? "bg-white/[0.08] text-white/70" 
                      : "text-white/55 hover:bg-white/[0.05] hover:text-white/70"
                  }`}
                >
                  {email.subject || "Untitled"}
                </Link>
              </li>
            );
          })}
          {sentEmails.length === 0 && (
            <li className="px-2.5 py-1.5 text-[13px] text-white/25 italic">
              No emails sent yet
            </li>
          )}
        </ul>
      </div>

      {/* User & Logout */}
      <div className="px-2.5 pb-5 border-t border-white/[0.06] pt-3 mt-2">
        <div className="px-2.5 mb-2">
          <p className="text-[12px] text-white/50 truncate">
            {session?.user?.email}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] text-white/45 hover:bg-white/[0.05] hover:text-white/70 transition-colors w-full"
        >
          <LogoutIcon className="w-[15px] h-[15px]" />
          Log out
        </button>
      </div>
    </aside>
  );
}

function DashboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="5" height="5" rx="1" />
      <rect x="9" y="2" width="5" height="5" rx="1" />
      <rect x="2" y="9" width="5" height="5" rx="1" />
      <rect x="9" y="9" width="5" height="5" rx="1" />
    </svg>
  );
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11.5 2.5l2 2-8.5 8.5-2.5.5.5-2.5 8.5-8.5z" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="5" r="2.5" />
      <path d="M3 14c0-2.5 2.5-4 5-4s5 1.5 5 4" />
    </svg>
  );
}

function SquarePlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="2.5" width="11" height="11" rx="2" />
      <path d="M8 5.5v5M5.5 8h5" />
    </svg>
  );
}

function GearIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="2" />
      <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.05 3.05l1.1 1.1M11.85 11.85l1.1 1.1M3.05 12.95l1.1-1.1M11.85 4.15l1.1-1.1" />
    </svg>
  );
}

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2H3.5A1.5 1.5 0 002 3.5v9A1.5 1.5 0 003.5 14H6" />
      <path d="M10.5 11.5L14 8l-3.5-3.5" />
      <path d="M14 8H6" />
    </svg>
  );
}
