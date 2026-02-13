"use client";

import { useState, useEffect, useMemo } from "react";
import { useTheme } from "@/lib/theme";

interface ScheduleModalProps {
  isOpen: boolean;
  isScheduling: boolean;
  onClose: () => void;
  onSchedule: (scheduledAt: Date) => void;
}

// Common timezones with friendly names
const TIMEZONES = [
  { value: "Pacific/Honolulu", label: "Hawaii (HST)", offset: -10 },
  { value: "America/Anchorage", label: "Alaska (AKST)", offset: -9 },
  { value: "America/Los_Angeles", label: "Los Angeles (PST)", offset: -8 },
  { value: "America/Denver", label: "Denver (MST)", offset: -7 },
  { value: "America/Chicago", label: "Chicago (CST)", offset: -6 },
  { value: "America/New_York", label: "New York (EST)", offset: -5 },
  { value: "America/Sao_Paulo", label: "São Paulo (BRT)", offset: -3 },
  { value: "Atlantic/Reykjavik", label: "Reykjavik (GMT)", offset: 0 },
  { value: "Europe/London", label: "London (GMT)", offset: 0 },
  { value: "Europe/Paris", label: "Paris (CET)", offset: 1 },
  { value: "Europe/Berlin", label: "Berlin (CET)", offset: 1 },
  { value: "Europe/Rome", label: "Rome (CET)", offset: 1 },
  { value: "Europe/Madrid", label: "Madrid (CET)", offset: 1 },
  { value: "Europe/Amsterdam", label: "Amsterdam (CET)", offset: 1 },
  { value: "Europe/Brussels", label: "Brussels (CET)", offset: 1 },
  { value: "Europe/Stockholm", label: "Stockholm (CET)", offset: 1 },
  { value: "Europe/Helsinki", label: "Helsinki (EET)", offset: 2 },
  { value: "Europe/Athens", label: "Athens (EET)", offset: 2 },
  { value: "Europe/Moscow", label: "Moscow (MSK)", offset: 3 },
  { value: "Asia/Dubai", label: "Dubai (GST)", offset: 4 },
  { value: "Asia/Kolkata", label: "Mumbai (IST)", offset: 5.5 },
  { value: "Asia/Bangkok", label: "Bangkok (ICT)", offset: 7 },
  { value: "Asia/Singapore", label: "Singapore (SGT)", offset: 8 },
  { value: "Asia/Hong_Kong", label: "Hong Kong (HKT)", offset: 8 },
  { value: "Asia/Shanghai", label: "Shanghai (CST)", offset: 8 },
  { value: "Asia/Tokyo", label: "Tokyo (JST)", offset: 9 },
  { value: "Asia/Seoul", label: "Seoul (KST)", offset: 9 },
  { value: "Australia/Sydney", label: "Sydney (AEDT)", offset: 11 },
  { value: "Pacific/Auckland", label: "Auckland (NZDT)", offset: 13 },
];

// Detect user's timezone
function detectTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // Check if it's in our list
    const found = TIMEZONES.find(t => t.value === tz);
    if (found) return tz;
    // Try to match by offset
    const offset = -new Date().getTimezoneOffset() / 60;
    const byOffset = TIMEZONES.find(t => t.offset === offset);
    if (byOffset) return byOffset.value;
    // Default to New York
    return "America/New_York";
  } catch {
    return "America/New_York";
  }
}

// Get minimum date (today)
function getMinDate(): string {
  const now = new Date();
  return now.toISOString().split("T")[0];
}

// Get minimum time if date is today
function getMinTime(selectedDate: string, timezone: string): string {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  
  if (selectedDate === today) {
    // Return current time + 5 minutes, rounded up to next 5 min
    const minutes = now.getMinutes();
    const roundedMinutes = Math.ceil((minutes + 5) / 5) * 5;
    now.setMinutes(roundedMinutes);
    now.setSeconds(0);
    return now.toTimeString().slice(0, 5);
  }
  
  return "00:00";
}

export function ScheduleModal({
  isOpen,
  isScheduling,
  onClose,
  onSchedule,
}: ScheduleModalProps) {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const detectedTimezone = useMemo(() => detectTimezone(), []);
  
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedTimezone, setSelectedTimezone] = useState(detectedTimezone);
  const [error, setError] = useState("");

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      // Default to tomorrow at 9:00 AM
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setSelectedDate(tomorrow.toISOString().split("T")[0]);
      setSelectedTime("09:00");
      setSelectedTimezone(detectedTimezone);
      setError("");
    }
  }, [isOpen, detectedTimezone]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleSchedule = () => {
    if (!selectedDate || !selectedTime) {
      setError("Please select a date and time");
      return;
    }

    // Parse the date and time in the selected timezone
    const dateTimeStr = `${selectedDate}T${selectedTime}:00`;
    
    // Create date object - we'll convert to UTC on the server
    // For now, create a date that represents the local time in the selected timezone
    const localDate = new Date(dateTimeStr);
    
    // Get timezone offset for selected timezone
    const tzDate = new Date(localDate.toLocaleString("en-US", { timeZone: selectedTimezone }));
    const utcDate = new Date(localDate.toLocaleString("en-US", { timeZone: "UTC" }));
    const tzOffset = (tzDate.getTime() - utcDate.getTime());
    
    // Create the actual scheduled time in UTC
    const scheduledAt = new Date(localDate.getTime() - tzOffset);
    
    // Validate it's in the future
    if (scheduledAt <= new Date()) {
      setError("Please select a time in the future");
      return;
    }

    onSchedule(scheduledAt);
  };

  const minTime = useMemo(() => getMinTime(selectedDate, selectedTimezone), [selectedDate, selectedTimezone]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={!isScheduling ? onClose : undefined}
      />
      
      {/* Modal */}
      <div 
        className={`relative w-full max-w-[440px] mx-4 rounded-2xl border p-8 ${
          isLight ? 'border-black/[0.08]' : 'border-white/[0.08]'
        }`}
        style={{ background: isLight ? '#EFEDE7' : 'rgb(24, 24, 24)' }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <ClockIcon className={`w-5 h-5 ${isLight ? 'text-black/50' : 'text-white/50'}`} />
          <h2 className={`text-[16px] font-medium ${isLight ? 'text-black/85' : 'text-white/90'}`}>Schedule email</h2>
        </div>

        {/* Date Picker */}
        <div className="mb-4">
          <label className={`block text-[12px] mb-2 ${isLight ? 'text-black/40' : 'text-white/40'}`}>Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setError("");
            }}
            min={getMinDate()}
            className={`w-full px-4 py-3 rounded-[10px] text-[14px] focus:outline-none border ${
              isLight 
                ? 'text-black/70 border-black/[0.06] [color-scheme:light]' 
                : 'text-white/70 border-white/[0.06] [color-scheme:dark]'
            }`}
            style={{ background: isLight ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.03)' }}
          />
        </div>

        {/* Time Picker */}
        <div className="mb-4">
          <label className={`block text-[12px] mb-2 ${isLight ? 'text-black/40' : 'text-white/40'}`}>Time</label>
          <input
            type="time"
            value={selectedTime}
            onChange={(e) => {
              setSelectedTime(e.target.value);
              setError("");
            }}
            min={selectedDate === getMinDate() ? minTime : undefined}
            className={`w-full px-4 py-3 rounded-[10px] text-[14px] focus:outline-none border ${
              isLight 
                ? 'text-black/70 border-black/[0.06] [color-scheme:light]' 
                : 'text-white/70 border-white/[0.06] [color-scheme:dark]'
            }`}
            style={{ background: isLight ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.03)' }}
          />
        </div>

        {/* Timezone Selector */}
        <div className="mb-6">
          <label className={`block text-[12px] mb-2 ${isLight ? 'text-black/40' : 'text-white/40'}`}>Timezone</label>
          <div className="relative">
            <select
              value={selectedTimezone}
              onChange={(e) => setSelectedTimezone(e.target.value)}
              className={`w-full appearance-none px-4 py-3 pr-10 rounded-[10px] text-[14px] focus:outline-none cursor-pointer border ${
                isLight 
                  ? 'text-black/70 border-black/[0.06]' 
                  : 'text-white/70 border-white/[0.06]'
              }`}
              style={{ background: isLight ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.03)' }}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
            <ChevronDownIcon className={`absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${isLight ? 'text-black/35' : 'text-white/35'}`} />
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="text-[12px] text-red-400/80 mb-4">{error}</p>
        )}

        {/* Preview */}
        {selectedDate && selectedTime && (
          <div 
            className={`mb-6 p-4 rounded-xl border ${isLight ? 'border-black/[0.06]' : 'border-white/[0.06]'}`}
            style={{ background: isLight ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.02)' }}
          >
            <p className={`text-[13px] ${isLight ? 'text-black/50' : 'text-white/50'}`}>
              Your email will be sent on{" "}
              <span className={isLight ? 'text-black/70' : 'text-white/70'}>
                {new Date(`${selectedDate}T${selectedTime}`).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </span>
              {" "}at{" "}
              <span className={isLight ? 'text-black/70' : 'text-white/70'}>
                {new Date(`${selectedDate}T${selectedTime}`).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                })}
              </span>
              {" "}({TIMEZONES.find(t => t.value === selectedTimezone)?.label.split(" ")[0]})
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 mb-4">
          <button
            onClick={onClose}
            disabled={isScheduling}
            className={`flex-1 px-5 py-3 rounded-[10px] text-[10px] font-medium tracking-[0.12em] uppercase transition-colors ${
              isLight 
                ? 'bg-black/[0.06] text-black/70 hover:bg-black/[0.1]' 
                : 'btn-glass-secondary'
            }`}
          >
            <span className={isLight ? '' : 'btn-glass-text'}>CANCEL</span>
          </button>
          <button
            onClick={handleSchedule}
            disabled={isScheduling || !selectedDate || !selectedTime}
            className={`flex-1 px-5 py-3 rounded-[10px] text-[10px] font-medium tracking-[0.12em] uppercase transition-colors disabled:opacity-40 ${
              isLight 
                ? 'bg-black text-white hover:bg-black/90' 
                : 'btn-glass'
            }`}
          >
            <span className={isLight ? '' : 'btn-glass-text'}>{isScheduling ? "SCHEDULING..." : "SCHEDULE"}</span>
          </button>
        </div>

        {/* Scheduling overlay */}
        {isScheduling && (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/50">
            <div className="flex flex-col items-center gap-3">
              <div className={`w-8 h-8 border-2 rounded-full animate-spin ${isLight ? 'border-black/20 border-t-black/70' : 'border-white/20 border-t-white/70'}`} />
              <p className={`text-[13px] ${isLight ? 'text-black/60' : 'text-white/60'}`}>Scheduling...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="8" />
      <path d="M10 5v5l3 3" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6l4 4 4-4" />
    </svg>
  );
}
