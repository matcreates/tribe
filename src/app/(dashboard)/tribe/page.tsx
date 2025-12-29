"use client";

import { useState, useEffect, useRef } from "react";
import { getSubscribers, removeSubscriber, importSubscribers, exportSubscribers } from "@/lib/actions";
import { Toast, useToast } from "@/components/Toast";

interface Subscriber {
  id: string;
  email: string;
  name: string | null;
  verified: boolean;
  verification_token: string | null;
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
                <span 
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-[4px] ${
                    subscriber.verified 
                      ? 'text-[#2d8a8a]/80' 
                      : 'text-white/40'
                  }`}
                  style={{ 
                    background: subscriber.verified 
                      ? 'rgba(45, 138, 138, 0.15)' 
                      : 'rgba(255, 255, 255, 0.05)' 
                  }}
                >
                  {subscriber.verified ? 'Verified' : 'Non-Verified'}
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
    <svg className={className} viewBox="0 0 12 12" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M5.14286 0C2.30254 0 0 2.30254 0 5.14286C0 7.98321 2.30254 10.2857 5.14286 10.2857C6.35715 10.2857 7.47315 9.86487 8.35298 9.1611L11.0245 11.8326C11.2477 12.0558 11.6095 12.0558 11.8326 11.8326C12.0558 11.6095 12.0558 11.2477 11.8326 11.0245L9.1611 8.35298C9.86487 7.47315 10.2857 6.35715 10.2857 5.14286C10.2857 2.30254 7.98321 0 5.14286 0ZM1.14286 5.14286C1.14286 2.93372 2.93372 1.14286 5.14286 1.14286C7.35201 1.14286 9.14287 2.93372 9.14287 5.14286C9.14287 7.35201 7.35201 9.14287 5.14286 9.14287C2.93372 9.14287 1.14286 7.35201 1.14286 5.14286Z" />
    </svg>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 12 12" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M1.25067 1.25067C1.35296 1.14838 1.4917 1.09091 1.63636 1.09091H6.54545C6.69011 1.09091 6.82887 1.14838 6.93115 1.25067C7.03342 1.35296 7.09091 1.4917 7.09091 1.63636V2.18182C7.09091 2.48306 7.33511 2.72727 7.63636 2.72727C7.93762 2.72727 8.18182 2.48306 8.18182 2.18182V1.63636C8.18182 1.20237 8.0094 0.786158 7.70253 0.47928C7.39565 0.172402 6.97942 0 6.54545 0H1.63636C1.20237 0 0.786158 0.172402 0.47928 0.47928C0.172402 0.786158 0 1.20237 0 1.63636V6.54545C0 6.97942 0.172402 7.39565 0.47928 7.70253C0.786158 8.0094 1.20237 8.18182 1.63636 8.18182H2.18182C2.48306 8.18182 2.72727 7.93762 2.72727 7.63636C2.72727 7.33511 2.48306 7.09091 2.18182 7.09091H1.63636C1.4917 7.09091 1.35296 7.03342 1.25067 6.93115C1.14838 6.82887 1.09091 6.69011 1.09091 6.54545V1.63636C1.09091 1.4917 1.14838 1.35296 1.25067 1.25067Z" />
      <path fillRule="evenodd" clipRule="evenodd" d="M5.45455 3.81818C4.55081 3.81818 3.81818 4.55081 3.81818 5.45455V10.3636C3.81818 11.2674 4.55081 12 5.45455 12H10.3636C11.2674 12 12 11.2674 12 10.3636V5.45455C12 4.55081 11.2674 3.81818 10.3636 3.81818H5.45455ZM4.90909 5.45455C4.90909 5.15329 5.15329 4.90909 5.45455 4.90909H10.3636C10.6649 4.90909 10.9091 5.15329 10.9091 5.45455V10.3636C10.9091 10.6649 10.6649 10.9091 10.3636 10.9091H5.45455C5.15329 10.9091 4.90909 10.6649 4.90909 10.3636V5.45455Z" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 10 11" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M2.5 1.5C2.5 0.671575 3.17158 0 4 0H6C6.82845 0 7.5 0.671575 7.5 1.5V2H9.5C9.77615 2 10 2.22386 10 2.5C10 2.77614 9.77615 3 9.5 3H8.9697L8.55765 9.59355C8.5082 10.3841 7.85265 11 7.06055 11H2.93945C2.14736 11 1.49178 10.3841 1.44237 9.59355L1.03028 3H0.5C0.22386 3 0 2.77614 0 2.5C0 2.22386 0.22386 2 0.5 2H2.5V1.5ZM3.5 2H6.5V1.5C6.5 1.22386 6.27615 1 6 1H4C3.72386 1 3.5 1.22386 3.5 1.5V2ZM2.03222 3L2.44042 9.5312C2.45689 9.7947 2.67542 10 2.93945 10H7.06055C7.3246 10 7.5431 9.7947 7.55955 9.5312L7.96775 3H2.03222Z" />
    </svg>
  );
}
