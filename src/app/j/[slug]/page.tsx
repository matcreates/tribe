"use client";

import { useState, useEffect, use } from "react";
import { Toast, useToast } from "@/components/Toast";
import { Avatar } from "@/components/Avatar";

interface PageProps {
  params: Promise<{ slug: string }>;
}

interface TribeSettings {
  id: string;
  name: string;
  slug: string;
  ownerName: string;
  ownerAvatar: string | null;
  description: string;
}

export default function PublicJoinPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [error, setError] = useState("");
  const [tribeSettings, setTribeSettings] = useState<TribeSettings | null>(null);
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    // Fetch tribe settings
    fetch(`/api/tribe/${resolvedParams.slug}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setTribeSettings(data);
        }
      })
      .catch(err => {
        console.error("Failed to load tribe:", err);
        setError("Failed to load tribe");
      });
  }, [resolvedParams.slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError("");
    
    try {
      const baseUrl = window.location.origin;
      const response = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: resolvedParams.slug,
          email: email.trim(),
          baseUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        if (data.error === "Already subscribed") {
          setError("You're already a member!");
        } else if (data.error === "Tribe not found") {
          setError("This tribe doesn't exist");
        } else {
          setError(data.error || "Something went wrong");
          console.error("Join error:", data);
        }
        return;
      }

      setIsJoined(true);
      showToast("Verification email sent!");
    } catch (err) {
      console.error("Join error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!tribeSettings && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'rgb(18, 18, 18)' }}>
        <p className="text-[13px] text-white/30">Loading...</p>
      </div>
    );
  }

  if (error && !tribeSettings) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'rgb(18, 18, 18)' }}>
        <div 
          className="w-full max-w-[320px] rounded-[16px] border border-white/[0.08] p-7 text-center"
          style={{ background: 'rgba(255, 255, 255, 0.03)' }}
        >
          <p className="text-[13px] text-white/50">{error}</p>
        </div>
      </div>
    );
  }

  const ownerName = tribeSettings?.ownerName || "Anonymous";
  const ownerAvatar = tribeSettings?.ownerAvatar ?? null;

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'rgb(18, 18, 18)' }}>
      <div 
        className="w-full max-w-[320px] rounded-[16px] border border-white/[0.08] p-7"
        style={{ background: 'rgba(255, 255, 255, 0.03)' }}
      >
        <div className="flex flex-col items-center text-center">
          {/* Avatar */}
          <div className="mb-2.5">
            <Avatar src={ownerAvatar} name={ownerName} size={56} />
          </div>
          
          {/* Name */}
          <p className="text-[13px] text-white/50 mb-4">{ownerName}</p>
          
          {/* Heading */}
          <h1 className="text-[18px] font-medium text-white/90 mb-1.5">
            Join my tribe
          </h1>
          
          {/* Description */}
          <p className="text-[12px] text-white/40 leading-[1.6] mb-5 max-w-[260px]">
            {tribeSettings?.description || "A tribe is a group of people who choose to follow your work, support your ideas, and stay connected."}
          </p>

          {isJoined ? (
            <div className="py-3">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center" style={{ background: 'rgba(45, 138, 138, 0.2)' }}>
                <MailIcon className="w-5 h-5 text-[#2d8a8a]" />
              </div>
              <p className="text-[14px] text-white/80 font-medium mb-1">
                Check your email
              </p>
              <p className="text-[12px] text-white/50">
                We sent a confirmation link to verify your email.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="w-full">
              {/* Email Input */}
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your email address"
                className="w-full px-3.5 py-2.5 rounded-[8px] text-[13px] text-white/70 placeholder:text-white/25 mb-4 focus:outline-none transition-colors"
                style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.06)' }}
                required
              />
              
              {error && (
                <p className="text-[12px] text-red-400/80 mb-3">{error}</p>
              )}
              
              {/* Join Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-[10px] text-[10px] font-medium tracking-[0.12em] uppercase btn-glass"
              >
                <span className="btn-glass-text">{isSubmitting ? "..." : "JOIN"}</span>
              </button>
            </form>
          )}
          
          {/* Footer */}
          <a 
            href="https://madewithtribe.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="mt-6 flex items-center gap-1 text-[11px] text-white/30 hover:text-white/50 transition-colors"
          >
            <span>made with</span>
            <TribeLogo className="h-[11px] w-auto relative -top-[1px]" />
          </a>
        </div>
      </div>

      <Toast message={toast.message} isVisible={toast.visible} onClose={hideToast} />
    </div>
  );
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M22 7l-10 6L2 7" />
    </svg>
  );
}

function TribeLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 60 25" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M16.812 1.044L16.596 5.796C16.572 6.204 16.524 6.48 16.452 6.624C16.404 6.744 16.284 6.804 16.092 6.804C15.924 6.804 15.792 6.744 15.696 6.624C15.624 6.504 15.552 6.336 15.48 6.12C15.432 5.904 15.372 5.652 15.3 5.364C15.228 5.076 15.144 4.752 15.048 4.392C14.712 3.624 14.256 3.144 13.68 2.952C13.104 2.736 12.264 2.628 11.16 2.628H10.584C10.44 2.628 10.32 2.7 10.224 2.844C10.152 2.964 10.116 3.084 10.116 3.204V20.844C10.116 21.228 10.116 21.54 10.116 21.78C10.14 22.02 10.176 22.224 10.224 22.392C10.296 22.536 10.392 22.656 10.512 22.752C10.656 22.848 10.848 22.932 11.088 23.004C11.304 23.076 11.508 23.124 11.7 23.148C11.892 23.148 12.06 23.16 12.204 23.184C12.348 23.208 12.456 23.256 12.528 23.328C12.624 23.4 12.672 23.532 12.672 23.724C12.672 24.06 12.42 24.228 11.916 24.228C11.532 24.228 11.052 24.192 10.476 24.12C9.924 24.024 9.264 23.976 8.496 23.976C7.752 23.976 7.092 24.024 6.516 24.12C5.94 24.192 5.46 24.228 5.076 24.228C4.572 24.228 4.32 24.036 4.32 23.652C4.32 23.484 4.368 23.364 4.464 23.292C4.56 23.22 4.68 23.172 4.824 23.148C4.968 23.124 5.136 23.112 5.328 23.112C5.52 23.112 5.712 23.076 5.904 23.004C6.36 22.86 6.636 22.656 6.732 22.392C6.828 22.128 6.876 21.612 6.876 20.844V3.312C6.876 3.168 6.828 3.024 6.732 2.88C6.66 2.712 6.552 2.628 6.408 2.628H5.4C4.656 2.628 4.044 2.772 3.564 3.06C3.084 3.348 2.616 3.78 2.16 4.356C1.728 5.076 1.392 5.64 1.152 6.048C0.936 6.456 0.684 6.66 0.396 6.66H0.324C0.228 6.66 0.144 6.636 0.072 6.588C0.024 6.54 0 6.396 0 6.156C0 6.132 0.012 6.06 0.036 5.94C0.06 5.82 0.096 5.688 0.144 5.544L1.044 1.872C1.164 1.32 1.248 0.875999 1.296 0.539999C1.368 0.204 1.524 0.0359995 1.764 0.0359995C1.86 0.0359995 1.932 0.0959995 1.98 0.215999C2.052 0.335999 2.112 0.48 2.16 0.648C2.232 0.792 2.292 0.936 2.34 1.08C2.388 1.2 2.472 1.26 2.592 1.26C2.808 1.476 3.372 1.584 4.284 1.584C4.62 1.584 5.004 1.584 5.436 1.584C5.868 1.56 6.348 1.548 6.876 1.548H11.304C11.904 1.548 12.432 1.56 12.888 1.584C13.368 1.608 13.776 1.62 14.112 1.62C14.688 1.62 15.072 1.56 15.264 1.44C15.432 1.344 15.564 1.212 15.66 1.044C15.78 0.876 15.876 0.720001 15.948 0.576001C16.02 0.408 16.092 0.276 16.164 0.18C16.236 0.0599999 16.32 0 16.416 0C16.56 0 16.656 0.0840003 16.704 0.252001C16.776 0.396001 16.812 0.528 16.812 0.648V1.044Z" />
      <path d="M18.56 8.388V9.792C18.56 10.008 18.596 10.116 18.668 10.116C18.716 10.116 18.824 10.032 18.992 9.864L19.712 9.072C20.48 8.16 21.296 7.704 22.16 7.704C22.808 7.704 23.36 7.944 23.816 8.424C24.272 8.904 24.5 9.504 24.5 10.224C24.5 10.752 24.332 11.184 23.996 11.52C23.684 11.856 23.3 12.024 22.844 12.024C22.484 12.024 22.172 11.94 21.908 11.772C21.644 11.58 21.404 11.376 21.188 11.16C20.972 10.944 20.768 10.752 20.576 10.584C20.384 10.392 20.192 10.296 20 10.296C19.112 10.296 18.668 11.424 18.668 13.68V21.492C18.668 21.9 18.716 22.212 18.812 22.428C18.908 22.62 19.1 22.776 19.388 22.896C19.676 23.04 19.94 23.136 20.18 23.184C20.42 23.208 20.612 23.244 20.756 23.292C20.924 23.316 21.056 23.364 21.152 23.436C21.248 23.508 21.296 23.64 21.296 23.832C21.296 23.976 21.224 24.108 21.08 24.228C20.96 24.324 20.768 24.372 20.504 24.372C20.024 24.372 19.496 24.324 18.92 24.228C18.368 24.156 17.78 24.12 17.156 24.12C16.58 24.12 16.04 24.156 15.536 24.228C15.056 24.3 14.624 24.336 14.24 24.336C13.808 24.336 13.592 24.144 13.592 23.76C13.592 23.592 13.628 23.484 13.7 23.436C13.772 23.364 13.868 23.316 13.988 23.292C14.108 23.244 14.252 23.208 14.42 23.184C14.588 23.16 14.768 23.1 14.96 23.004C15.296 22.836 15.488 22.668 15.536 22.5C15.608 22.308 15.644 22.044 15.644 21.708V12.492C15.644 12.06 15.56 11.772 15.392 11.628C15.248 11.484 15.08 11.388 14.888 11.34C14.72 11.292 14.552 11.256 14.384 11.232C14.24 11.184 14.168 11.052 14.168 10.836C14.168 10.572 14.324 10.38 14.636 10.26C14.948 10.116 15.356 9.876 15.86 9.54C16.556 9.06 17.06 8.628 17.372 8.244C17.708 7.836 17.984 7.632 18.2 7.632C18.44 7.632 18.56 7.884 18.56 8.388Z" />
      <path d="M29.68 8.388V21.528C29.68 21.96 29.716 22.284 29.788 22.5C29.884 22.716 30.04 22.884 30.256 23.004C30.448 23.1 30.628 23.16 30.796 23.184C30.988 23.208 31.144 23.244 31.264 23.292C31.408 23.316 31.516 23.364 31.588 23.436C31.684 23.508 31.732 23.628 31.732 23.796C31.732 24.18 31.516 24.372 31.084 24.372C30.724 24.372 30.292 24.324 29.788 24.228C29.284 24.156 28.744 24.12 28.168 24.12C27.544 24.12 27.016 24.156 26.584 24.228C26.152 24.324 25.804 24.372 25.54 24.372C25.18 24.372 25 24.168 25 23.76C25 23.592 25.024 23.472 25.072 23.4C25.144 23.328 25.228 23.28 25.324 23.256C25.444 23.232 25.564 23.22 25.684 23.22C25.804 23.196 25.936 23.148 26.08 23.076C26.344 22.932 26.5 22.764 26.548 22.572C26.62 22.356 26.656 22.008 26.656 21.528V13.032C26.656 12.384 26.572 11.952 26.404 11.736C26.26 11.52 26.092 11.388 25.9 11.34C25.732 11.268 25.564 11.232 25.396 11.232C25.252 11.208 25.18 11.076 25.18 10.836C25.18 10.572 25.336 10.356 25.648 10.188C25.984 10.02 26.452 9.768 27.052 9.432C27.412 9.216 27.712 9 27.952 8.784C28.216 8.568 28.432 8.376 28.6 8.208C28.72 8.088 29.232 7.744 29.3523 7.812C29.5072 7.812 29.68 7.884 29.68 8.388Z" />
      <path d="M35.38 4V9.912C35.38 10.056 35.404 10.128 35.452 10.128C35.524 10.128 35.62 10.068 35.74 9.948L36.172 9.516C36.844 8.82 37.468 8.316 38.044 8.004C38.644 7.668 39.34 7.5 40.132 7.5C40.924 7.5 41.68 7.692 42.4 8.076C43.12 8.46 43.744 9.012 44.272 9.732C44.8 10.428 45.22 11.28 45.532 12.288C45.844 13.296 46 14.412 46 15.636C46 16.98 45.82 18.204 45.46 19.308C45.1 20.412 44.584 21.36 43.912 22.152C43.264 22.944 42.484 23.556 41.572 23.988C40.684 24.444 39.7 24.672 38.62 24.672C36.5 24.672 35 24.004 35 24.004C35 24.004 33.868 23.592 33 23.004C32.6332 22.7555 32.5 22.504 32.464 22.004C32.4081 21.2271 32.356 20.904 32.356 19.92V4.648C32.356 4.336 32.3125 4.02425 32 3.868C31 3.368 31.284 2.46 32.392 2.164C33.5 1.868 33.844 1.564 34.228 1.3C34.636 1.012 34.9 0.868002 35.02 0.868002C35.212 0.868002 35.332 0.928002 35.38 1.048C35.428 1.168 35.452 1.336 35.452 1.552C35.452 1.912 35.44 2.296 35.416 2.704C35.392 3.088 35.38 3.52 35.38 4ZM35.38 20.208C35.38 21.36 35.632 22.212 36.136 22.764C36.664 23.316 37.384 23.592 38.296 23.592C38.992 23.592 39.628 23.424 40.204 23.088C40.78 22.752 41.272 22.284 41.68 21.684C42.112 21.06 42.436 20.328 42.652 19.488C42.892 18.624 43.012 17.688 43.012 16.68C43.012 14.52 42.556 12.864 41.644 11.712C40.756 10.536 39.628 9.948 38.26 9.948C37.564 9.948 37.024 10.068 36.64 10.308C36.256 10.548 35.968 10.884 35.776 11.316C35.584 11.748 35.464 12.276 35.416 12.9C35.392 13.5 35.38 14.172 35.38 14.916V20.208Z" />
      <path d="M52.728 12.72C53.904 12.72 54.756 12.588 55.284 12.324C55.836 12.06 56.112 11.532 56.112 10.74C56.112 10.14 55.86 9.588 55.356 9.084C54.876 8.58 54.252 8.328 53.484 8.328C52.644 8.328 51.912 8.652 51.288 9.3C50.664 9.948 50.256 10.764 50.064 11.748L49.956 12.324V12.396C49.956 12.612 50.1 12.72 50.388 12.72H52.728ZM58.056 13.836H50.1C49.908 13.836 49.788 13.872 49.74 13.944C49.692 14.016 49.668 14.172 49.668 14.412V15.276C49.668 17.508 50.136 19.272 51.072 20.568C52.032 21.864 53.268 22.512 54.78 22.512C55.452 22.512 56.028 22.404 56.508 22.188C57.012 21.972 57.42 21.732 57.732 21.468C58.068 21.204 58.32 20.964 58.488 20.748C58.68 20.532 58.812 20.424 58.884 20.424C59.076 20.424 59.172 20.556 59.172 20.82C59.172 21.084 59.028 21.432 58.74 21.864C58.452 22.296 58.032 22.728 57.48 23.16C56.952 23.568 56.316 23.928 55.572 24.24C54.828 24.552 53.988 24.708 53.052 24.708C52.068 24.708 51.168 24.504 50.352 24.096C49.56 23.712 48.876 23.148 48.3 22.404C47.724 21.66 47.28 20.76 46.968 19.704C46.656 18.648 46.5 17.46 46.5 16.14C46.5 14.82 46.668 13.632 47.004 12.576C47.364 11.496 47.856 10.584 48.48 9.84C49.104 9.096 49.836 8.52 50.676 8.112C51.54 7.704 52.476 7.5 53.484 7.5C54.348 7.5 55.14 7.656 55.86 7.968C56.58 8.256 57.192 8.652 57.696 9.156C58.2 9.66 58.584 10.248 58.848 10.92C59.136 11.592 59.28 12.312 59.28 13.08C59.28 13.392 59.184 13.596 58.992 13.692C58.8 13.788 58.488 13.836 58.056 13.836Z" />
      <path d="M30 3.5C30 4.88071 29.1046 6 28 6C26.8954 6 26 4.88071 26 3.5C26 2.11929 26.8954 1 28 1C29.1046 1 30 2.11929 30 3.5Z" />
    </svg>
  );
}
