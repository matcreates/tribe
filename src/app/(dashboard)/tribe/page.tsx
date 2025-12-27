"use client";

import { useState, useEffect, useRef } from "react";
import { getSubscribers, removeSubscriber, importSubscribers, exportSubscribers } from "@/lib/actions";
import { Toast, useToast } from "@/components/Toast";

interface Subscriber {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
}

export default function TribePage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    loadSubscribers();
  }, []);

  const loadSubscribers = async () => {
    try {
      const data = await getSubscribers();
      setSubscribers(data);
    } catch (error) {
      console.error("Failed to load subscribers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredSubscribers = subscribers.filter((s) =>
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleCopy = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email);
      showToast("Email copied");
    } catch {
      showToast("Failed to copy");
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await removeSubscriber(id);
      setSubscribers(subscribers.filter(s => s.id !== id));
      showToast("Subscriber removed");
    } catch {
      showToast("Failed to remove subscriber");
    }
  };

  const handleExport = async () => {
    try {
      const csv = await exportSubscribers();
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "tribe-subscribers.csv";
      a.click();
      URL.revokeObjectURL(url);
      showToast("Exported subscribers");
    } catch {
      showToast("Failed to export");
    }
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const emails = text.split(/[\n,;]/).filter(Boolean);
      try {
        const added = await importSubscribers(emails);
        await loadSubscribers();
        showToast(`Imported ${added} new subscribers`);
      } catch {
        showToast("Failed to import");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[13px] text-white/30">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center pt-14 px-6">
      <div className="w-full max-w-[540px]">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-[20px] font-medium text-white/90">Your tribe</h1>
          <div className="flex-1" />
          <button
            onClick={handleImport}
            className="px-4 py-1.5 rounded-[20px] text-[10px] font-medium tracking-[0.12em] text-white/55 hover:text-white/70 transition-colors"
            style={{ background: 'rgba(255, 255, 255, 0.06)' }}
          >
            IMPORT
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-1.5 rounded-[20px] text-[10px] font-medium tracking-[0.12em] text-white/55 hover:text-white/70 transition-colors"
            style={{ background: 'rgba(255, 255, 255, 0.06)' }}
          >
            EXPORT
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="w-full pl-10 pr-4 py-2.5 rounded-[10px] text-[13px] text-white/70 placeholder:text-white/25 focus:outline-none transition-colors"
            style={{ background: 'rgba(255, 255, 255, 0.05)' }}
          />
        </div>

        {/* Subscriber List */}
        <div className="space-y-1.5">
          {filteredSubscribers.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-[13px] text-white/35">
                {search ? "No subscribers found" : "No subscribers yet"}
              </p>
              {!search && (
                <p className="text-[12px] text-white/25 mt-1">
                  Share your join page to grow your tribe
                </p>
              )}
            </div>
          ) : (
            filteredSubscribers.map((subscriber) => (
              <div
                key={subscriber.id}
                className="flex items-center gap-2 px-4 py-3 rounded-[10px] hover:bg-white/[0.02] transition-colors group"
                style={{ background: 'rgba(255, 255, 255, 0.04)' }}
              >
                <span className="flex-1 text-[13px] text-white/60 truncate">
                  {subscriber.email}
                </span>
                <button
                  onClick={() => handleCopy(subscriber.email)}
                  className="p-1.5 rounded-md hover:bg-white/[0.08] opacity-40 group-hover:opacity-70 transition-all"
                  aria-label="Copy email"
                >
                  <CopyIcon className="w-3.5 h-3.5 text-white/50" />
                </button>
                <button
                  onClick={() => handleRemove(subscriber.id)}
                  className="p-1.5 rounded-md hover:bg-white/[0.08] opacity-40 group-hover:opacity-70 transition-all"
                  aria-label="Remove subscriber"
                >
                  <TrashIcon className="w-3.5 h-3.5 text-white/50" />
                </button>
              </div>
            ))
          )}
        </div>

        <Toast message={toast.message} isVisible={toast.visible} onClose={hideToast} />
      </div>
    </div>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="7" r="4" />
      <path d="M10 10l3.5 3.5" />
    </svg>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5.5" y="5.5" width="7" height="7" rx="1" />
      <path d="M3.5 10.5v-7a1 1 0 011-1h7" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 4.5h9M6.5 4.5V3.5a1 1 0 011-1h1a1 1 0 011 1v1M4.5 4.5v8a1 1 0 001 1h5a1 1 0 001-1v-8" />
    </svg>
  );
}
