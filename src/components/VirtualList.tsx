"use client";

import { useRef, useState, useEffect, useCallback, ReactNode } from "react";

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => ReactNode;
  overscan?: number; // Number of items to render outside visible area
  className?: string;
}

/**
 * VirtualList - Efficient rendering for large lists
 * Only renders items that are visible in the viewport plus a small buffer.
 * 
 * Usage:
 * <VirtualList
 *   items={emails}
 *   itemHeight={40}
 *   containerHeight={400}
 *   renderItem={(email, index) => <EmailRow email={email} />}
 * />
 */
export function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 3,
  className = "",
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const totalHeight = items.length * itemHeight;
  
  // Calculate visible range
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const endIndex = Math.min(items.length, startIndex + visibleCount + overscan * 2);
  
  // Visible items
  const visibleItems = items.slice(startIndex, endIndex);
  
  // Offset for the visible items container
  const offsetY = startIndex * itemHeight;

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll, { passive: true });
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, [handleScroll]);

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => (
            <div
              key={startIndex + index}
              style={{ height: itemHeight }}
            >
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * SimpleVirtualList - A simpler version with automatic item heights
 * Uses CSS for positioning instead of calculations.
 * Better for items with consistent heights.
 */
export function SimpleVirtualList<T>({
  items,
  itemHeight,
  maxHeight,
  renderItem,
  className = "",
}: {
  items: T[];
  itemHeight: number;
  maxHeight: number;
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
}) {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    
    const { scrollTop, clientHeight } = containerRef.current;
    const start = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(clientHeight / itemHeight);
    const end = Math.min(items.length, start + visibleCount + 10);
    
    setVisibleRange({ start: Math.max(0, start - 5), end });
  }, [itemHeight, items.length]);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll, { passive: true });
      handleScroll(); // Initial calculation
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, [handleScroll]);

  const totalHeight = items.length * itemHeight;
  const paddingTop = visibleRange.start * itemHeight;
  const paddingBottom = (items.length - visibleRange.end) * itemHeight;

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ maxHeight }}
    >
      <div style={{ paddingTop, paddingBottom, minHeight: totalHeight }}>
        {items.slice(visibleRange.start, visibleRange.end).map((item, idx) => (
          <div key={visibleRange.start + idx} style={{ height: itemHeight }}>
            {renderItem(item, visibleRange.start + idx)}
          </div>
        ))}
      </div>
    </div>
  );
}
