"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getSubscribersPaginated, removeSubscriber, previewImport, importSubscribers, exportSubscribers, addSubscriberManually, removeAllUnverifiedSubscribers } from "@/lib/actions";
import type { SubscriberFilter, SubscriberSort, PaginatedSubscribersResult } from "@/lib/types";
import { Toast, useToast } from "@/components/Toast";
import { ImportModal, ImportPreview } from "@/components/ImportModal";
import { ImportChooserModal, ManualEntryModal } from "@/components/ImportChooserModal";

interface Subscriber {
  id: string;
  email: string;
  name: string | null;
  verified: boolean;
  created_at: string;
}

const PAGE_SIZE = 50;

// Email regex for extraction
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Smart email extraction that handles CSV files with multiple columns
function extractEmailsFromText(text: string): string[] {
  const emails: string[] = [];
  const seen = new Set<string>();
  
  // Split by lines first
  const lines = text.split(/[\r\n]+/).filter(line => line.trim().length > 0);
  
  for (const line of lines) {
    // Skip common header rows
    const lowerLine = line.toLowerCase();
    if (lowerLine.includes('email') && (lowerLine.includes('name') || lowerLine.includes('first') || lowerLine.includes('last') || lowerLine.includes('date'))) {
      continue; // This looks like a header row
    }
    
    // Extract all email addresses from this line using regex
    const matches = line.match(EMAIL_PATTERN);
    if (matches) {
      for (const email of matches) {
        const normalized = email.toLowerCase().trim();
        if (!seen.has(normalized)) {
          seen.add(normalized);
          emails.push(normalized);
        }
      }
    }
  }
  
  return emails;
}

export default function TribePage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filter, setFilter] = useState<SubscriberFilter>("verified");
  const [sort, setSort] = useState<SubscriberSort>("newest");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalVerified, setTotalVerified] = useState(0);
  const [totalNonVerified, setTotalNonVerified] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const { toast, showToast, hideToast } = useToast();

  // Import modal state
  const [showImportChooser, setShowImportChooser] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [pendingEmails, setPendingEmails] = useState<string[]>([]);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to first page on search
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Load subscribers when filters change
  const loadSubscribers = useCallback(async () => {
    setIsLoading(true);
    try {
      const result: PaginatedSubscribersResult = await getSubscribersPaginated(
        page,
        PAGE_SIZE,
        filter,
        sort,
        debouncedSearch
      );
      setSubscribers(result.subscribers);
      setTotal(result.total);
      setTotalVerified(result.totalVerified);
      setTotalNonVerified(result.totalNonVerified);
      setTotalPages(result.totalPages);
      setPage(result.page);
    } catch (error) {
      console.error("Failed to load subscribers:", error);
    } finally {
      setIsLoading(false);
    }
  }, [page, filter, sort, debouncedSearch]);

  useEffect(() => {
    loadSubscribers();
  }, [loadSubscribers]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setShowSortDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sort options config
  const sortOptions: { value: SubscriberSort; label: string }[] = [
    { value: "newest", label: "Newest to oldest" },
    { value: "oldest", label: "Oldest to newest" },
    { value: "a-z", label: "Alphabetical: A to Z" },
    { value: "z-a", label: "Alphabetical: Z to A" },
    { value: "verified-first", label: "Verified first" },
    { value: "unverified-first", label: "Unverified first" },
  ];

  const currentSortLabel = sortOptions.find(o => o.value === sort)?.label || "Sort";

  // Handle filter change - reset to page 1
  const handleFilterChange = (newFilter: SubscriberFilter) => {
    setFilter(newFilter);
    setPage(1);
  };

  // Handle sort change - reset to page 1
  const handleSortChange = (newSort: SubscriberSort) => {
    setSort(newSort);
    setPage(1);
    setShowSortDropdown(false);
  };

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
      showToast("Exported members");
    } catch {
      showToast("Failed to export");
    }
  };

  const handleDeleteAllUnverified = async () => {
    if (isDeletingAll) return;
    
    setIsDeletingAll(true);
    try {
      const result = await removeAllUnverifiedSubscribers();
      showToast(`Deleted ${result.deleted} unverified members`);
      setShowDeleteAllModal(false);
      // Reload the list
      loadSubscribers();
    } catch {
      showToast("Failed to delete unverified members");
    } finally {
      setIsDeletingAll(false);
    }
  };

  const handleImportClick = () => {
    setShowImportChooser(true);
  };

  const handleChooseFile = () => {
    setShowImportChooser(false);
    fileInputRef.current?.click();
  };

  const handleEnterManually = () => {
    setShowImportChooser(false);
    setShowManualEntry(true);
  };

  const handleAddManually = async (email: string) => {
    const result = await addSubscriberManually(email);
    if (!result.success) {
      throw new Error(result.error || "Failed to add subscriber");
    }
    await loadSubscribers();
    if (result.error) {
      // Partial success (added but email failed)
      showToast(result.error);
    } else {
      showToast("Verification email sent!");
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast("File too large. Max 5MB allowed.");
      e.target.value = "";
      return;
    }

    // Validate file type
    const validTypes = ['.csv', '.txt', 'text/csv', 'text/plain', 'application/vnd.ms-excel'];
    const isValidType = validTypes.some(type => 
      file.name.toLowerCase().endsWith(type) || file.type === type
    );
    if (!isValidType) {
      showToast("Invalid file type. Use CSV or TXT files.");
      e.target.value = "";
      return;
    }

    try {
      const text = await file.text();
      
      // Smart email extraction from CSV/TXT files
      const emails = extractEmailsFromText(text);
      
      if (emails.length === 0) {
        showToast("No emails found in file");
        e.target.value = "";
        return;
      }

      // Limit to prevent abuse
      if (emails.length > 10000) {
        showToast("Too many emails. Max 10,000 per import.");
        e.target.value = "";
        return;
      }

      // Get preview with duplicate checking
      const preview = await previewImport(emails);
      
      setImportPreview({
        totalInFile: preview.totalInFile,
        duplicates: preview.duplicates,
        invalid: preview.invalid,
        toImport: preview.toImport,
        emails: preview.emails,
        invalidEmails: preview.invalidEmails,
        duplicateEmails: preview.duplicateEmails,
      });
      setPendingEmails(preview.emails);
      setShowImportModal(true);
      
    } catch (error) {
      console.error("Error reading file:", error);
      showToast("Failed to read file");
    }
    
    e.target.value = "";
  };

  const handleImportWithVerification = async () => {
    if (pendingEmails.length === 0) return;
    
    setIsImporting(true);
    try {
      const result = await importSubscribers(pendingEmails, true);
      await loadSubscribers();
      
      if (result.errors.length > 0) {
        showToast(`Imported ${result.added}. ${result.errors.length} failed to send verification.`);
      } else {
        showToast(`Imported ${result.added} members. Verification emails sent!`);
      }
    } catch (error) {
      console.error("Import failed:", error);
      showToast("Import failed. Please try again.");
    } finally {
      setIsImporting(false);
      setShowImportModal(false);
      setImportPreview(null);
      setPendingEmails([]);
    }
  };

  const handleImportWithoutVerification = async () => {
    if (pendingEmails.length === 0) return;
    
    setIsImporting(true);
    try {
      const result = await importSubscribers(pendingEmails, false);
      await loadSubscribers();
      showToast(`Imported ${result.added} members as verified`);
    } catch (error) {
      console.error("Import failed:", error);
      showToast("Import failed. Please try again.");
    } finally {
      setIsImporting(false);
      setShowImportModal(false);
      setImportPreview(null);
      setPendingEmails([]);
    }
  };

  const handleCloseModal = () => {
    if (isImporting) return;
    setShowImportModal(false);
    setImportPreview(null);
    setPendingEmails([]);
  };

  return (
    <div className="flex flex-col items-center pt-14 px-6 pb-12">
      <div className="w-full max-w-[540px]">
        {/* Header */}
        <div className="mb-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2">
            <h1 className="text-[18px] sm:text-[20px] font-medium text-white/90">
              Your tribe is made of <span className="text-white">{totalVerified}</span> {totalVerified === 1 ? 'person' : 'people'}
            </h1>
            <div className="flex-1" />
            <div className="flex gap-2">
              <button
                onClick={handleImportClick}
                className="px-4 py-2 rounded-[10px] text-[10px] font-medium tracking-[0.12em] uppercase btn-glass"
              >
                <span className="btn-glass-text">IMPORT</span>
              </button>
              <button
                onClick={handleExport}
                className="px-4 py-2 rounded-[10px] text-[10px] font-medium tracking-[0.12em] uppercase btn-glass-secondary"
              >
                <span className="btn-glass-text">EXPORT</span>
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt,text/csv,text/plain"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
          <p className="text-[13px] text-white/40 leading-relaxed">
            A tribe is a group of people who choose to follow your work, support your ideas, and stay connected.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 mb-4 overflow-x-auto">
          <button
            onClick={() => handleFilterChange("verified")}
            className={`px-3 py-1.5 rounded-[6px] text-[12px] transition-colors whitespace-nowrap ${
              filter === "verified"
                ? "bg-white/[0.08] text-white/70"
                : "text-white/40 hover:text-white/60"
            }`}
          >
            Verified ({totalVerified})
          </button>
          <button
            onClick={() => handleFilterChange("all")}
            className={`px-3 py-1.5 rounded-[6px] text-[12px] transition-colors whitespace-nowrap ${
              filter === "all"
                ? "bg-white/[0.08] text-white/70"
                : "text-white/40 hover:text-white/60"
            }`}
          >
            All ({total})
          </button>
          <button
            onClick={() => handleFilterChange("non-verified")}
            className={`px-3 py-1.5 rounded-[6px] text-[12px] transition-colors whitespace-nowrap ${
              filter === "non-verified"
                ? "bg-white/[0.08] text-white/70"
                : "text-white/40 hover:text-white/60"
            }`}
          >
            Non-verified ({totalNonVerified})
          </button>
          
          {/* Delete All Unverified Button - only shows when non-verified filter is active */}
          {filter === "non-verified" && totalNonVerified > 0 && (
            <button
              onClick={() => setShowDeleteAllModal(true)}
              className="ml-auto px-3 py-1.5 rounded-[6px] text-[12px] font-medium text-red-400 hover:bg-red-500/10 transition-colors whitespace-nowrap"
            >
              Delete all unverified
            </button>
          )}
        </div>

        {/* Search and Sort Row */}
        <div className="flex gap-3 mb-5">
          {/* Search */}
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="w-full pl-10 pr-4 py-2.5 rounded-[10px] text-[13px] text-white/70 placeholder:text-white/25 focus:outline-none transition-colors border border-white/[0.06]"
              style={{ background: 'rgba(255, 255, 255, 0.02)' }}
            />
          </div>

          {/* Sort Dropdown */}
          <div className="relative" ref={sortDropdownRef}>
            <button
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-[12px] text-white/50 hover:text-white/70 transition-colors border border-white/[0.06] whitespace-nowrap"
              style={{ background: 'rgba(255, 255, 255, 0.02)' }}
            >
              <SortIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{currentSortLabel}</span>
              <ChevronDownIcon className={`w-3 h-3 transition-transform ${showSortDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showSortDropdown && (
              <div 
                className="absolute right-0 top-full mt-1 w-48 py-1 rounded-[10px] border border-white/[0.08] z-20 shadow-xl"
                style={{ background: 'rgb(32, 32, 32)' }}
              >
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleSortChange(option.value)}
                    className={`w-full px-4 py-2 text-left text-[12px] transition-colors ${
                      sort === option.value 
                        ? 'text-white/80 bg-white/[0.06]' 
                        : 'text-white/50 hover:text-white/70 hover:bg-white/[0.04]'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Subscriber List */}
        <div className="space-y-1.5">
          {isLoading ? (
            <div className="text-center py-10">
              <p className="text-[13px] text-white/35">Loading...</p>
            </div>
          ) : subscribers.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-[13px] text-white/35">
                {search ? "No members found" : "No members yet"}
              </p>
              {!search && (
                <p className="text-[12px] text-white/25 mt-1">
                  Share your join page to grow your tribe
                </p>
              )}
            </div>
          ) : (
            subscribers.map((subscriber) => (
              <div
                key={subscriber.id}
                className="flex items-center gap-2 px-4 py-3 rounded-[10px] hover:bg-white/[0.04] transition-colors group border border-white/[0.06]"
                style={{ background: 'rgba(255, 255, 255, 0.02)' }}
              >
                <span className="flex-1 text-[13px] text-white/60 truncate">
                  {subscriber.email}
                </span>
                <span 
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-[4px] hidden sm:inline-block ${
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6 pb-8">
            <button
              onClick={() => setPage(1)}
              disabled={page === 1}
              className="p-2 rounded-md text-white/40 hover:text-white/70 hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              aria-label="First page"
            >
              <DoubleChevronLeftIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-md text-white/40 hover:text-white/70 hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              aria-label="Previous page"
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </button>
            
            <div className="flex items-center gap-1 px-2">
              <span className="text-[13px] text-white/60">
                Page {page} of {totalPages}
              </span>
            </div>
            
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-md text-white/40 hover:text-white/70 hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              aria-label="Next page"
            >
              <ChevronRightIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
              className="p-2 rounded-md text-white/40 hover:text-white/70 hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              aria-label="Last page"
            >
              <DoubleChevronRightIcon className="w-4 h-4" />
            </button>
          </div>
        )}

        <Toast message={toast.message} isVisible={toast.visible} onClose={hideToast} />
      </div>

      {/* Import Chooser Modal */}
      <ImportChooserModal
        isOpen={showImportChooser}
        onClose={() => setShowImportChooser(false)}
        onChooseFile={handleChooseFile}
        onEnterManually={handleEnterManually}
      />

      {/* Manual Entry Modal */}
      <ManualEntryModal
        isOpen={showManualEntry}
        onClose={() => setShowManualEntry(false)}
        onAdd={handleAddManually}
      />

      {/* Import Modal */}
      <ImportModal
        isOpen={showImportModal}
        preview={importPreview}
        isImporting={isImporting}
        onClose={handleCloseModal}
        onImportWithVerification={handleImportWithVerification}
        onImportWithoutVerification={handleImportWithoutVerification}
      />

      {/* Delete All Unverified Confirmation Modal */}
      {showDeleteAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !isDeletingAll && setShowDeleteAllModal(false)}
          />
          <div
            className="relative w-full max-w-[360px] rounded-[14px] border border-white/[0.08] p-6"
            style={{ background: 'rgba(18, 18, 18, 0.98)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(239, 68, 68, 0.15)' }}
              >
                <WarningIcon className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-[15px] font-medium text-white/90">Delete all unverified</h3>
                <p className="text-[12px] text-white/40">{totalNonVerified} members will be removed</p>
              </div>
            </div>
            
            <p className="text-[13px] text-white/50 mb-5 leading-relaxed">
              This action is <span className="text-red-400 font-medium">irreversible</span>. All unverified members will be permanently deleted from your tribe.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteAllModal(false)}
                disabled={isDeletingAll}
                className="flex-1 px-4 py-2.5 rounded-[10px] text-[12px] font-medium text-white/60 hover:bg-white/[0.05] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAllUnverified}
                disabled={isDeletingAll}
                className="flex-1 px-4 py-2.5 rounded-[10px] text-[12px] font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
              >
                {isDeletingAll ? "Deleting..." : "Delete all"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WarningIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 5v4" />
      <path d="M8 11.5v.5" />
      <path d="M3.5 14h9a1 1 0 00.87-1.5l-4.5-8a1 1 0 00-1.74 0l-4.5 8a1 1 0 00.87 1.5z" />
    </svg>
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

function SortIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 4L6 1L9 4" />
      <path d="M3 8L6 11L9 8" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 4.5L6 7.5L9 4.5" />
    </svg>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 4L6 8L10 12" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4L10 8L6 12" />
    </svg>
  );
}

function DoubleChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 4L4 8L8 12" />
      <path d="M12 4L8 8L12 12" />
    </svg>
  );
}

function DoubleChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4L8 8L4 12" />
      <path d="M8 4L12 8L8 12" />
    </svg>
  );
}
