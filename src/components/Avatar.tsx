"use client";

import Image from "next/image";
import { useState } from "react";

interface AvatarProps {
  src: string | null;
  name: string;
  size?: number;
  className?: string;
}

export function Avatar({ src, name, size = 32, className = "" }: AvatarProps) {
  const [hasError, setHasError] = useState(false);
  
  const initial = name.charAt(0).toUpperCase();
  
  // Show initials if no src or if image failed to load
  if (!src || hasError) {
    return (
      <div 
        className={`rounded-full flex items-center justify-center font-medium text-white/70 ring-2 ring-white/10 ${className}`}
        style={{ 
          width: size, 
          height: size, 
          fontSize: size * 0.35,
          background: 'rgba(255, 255, 255, 0.08)' 
        }}
      >
        {initial}
      </div>
    );
  }

  return (
    <div 
      className={`relative rounded-full overflow-hidden ring-2 ring-white/10 ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={src}
        alt={name}
        fill
        sizes={`${size}px`}
        className="object-cover"
        onError={() => setHasError(true)}
        priority={size >= 48} // Priority load for larger avatars
      />
    </div>
  );
}

// Smaller variant for lists
export function AvatarSmall({ src, name, className = "" }: Omit<AvatarProps, "size">) {
  return <Avatar src={src} name={name} size={24} className={className} />;
}

// Medium variant for sidebar
export function AvatarMedium({ src, name, className = "" }: Omit<AvatarProps, "size">) {
  return <Avatar src={src} name={name} size={32} className={className} />;
}

// Large variant for settings/profile
export function AvatarLarge({ src, name, className = "" }: Omit<AvatarProps, "size">) {
  return <Avatar src={src} name={name} size={48} className={className} />;
}
