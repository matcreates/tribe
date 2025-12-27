"use client";

import { useEffect, useState } from "react";

interface ToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, isVisible, onClose, duration = 2500 }: ToastProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShow(true);
      const timer = setTimeout(() => {
        setShow(false);
        setTimeout(onClose, 150);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible && !show) return null;

  return (
    <div
      className={`
        fixed bottom-5 left-1/2 -translate-x-1/2 z-50
        px-4 py-2.5 rounded-[10px]
        text-[12px] text-white/70
        transition-all duration-150
        ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"}
      `}
      style={{ background: 'rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(8px)' }}
    >
      {message}
    </div>
  );
}

// Hook for using toast
export function useToast() {
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({
    message: "",
    visible: false,
  });

  const showToast = (message: string) => {
    setToast({ message, visible: true });
  };

  const hideToast = () => {
    setToast((prev) => ({ ...prev, visible: false }));
  };

  return { toast, showToast, hideToast };
}
