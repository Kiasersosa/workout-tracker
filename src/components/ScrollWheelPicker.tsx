"use client";

import { useRef, useEffect, useCallback, useState } from "react";

interface ScrollWheelPickerProps {
  items: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  itemHeight?: number;
  visibleItems?: number;
  label?: string;
}

export default function ScrollWheelPicker({
  items,
  selectedIndex,
  onSelect,
  itemHeight = 44,
  visibleItems = 5,
  label,
}: ScrollWheelPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>(undefined);
  const paddingItems = Math.floor(visibleItems / 2);
  const containerHeight = itemHeight * visibleItems;

  const scrollToIndex = useCallback(
    (index: number, smooth = true) => {
      const container = containerRef.current;
      if (!container) return;
      container.scrollTo({
        top: index * itemHeight,
        behavior: smooth ? "smooth" : "instant",
      });
    },
    [itemHeight]
  );

  // Initial scroll to selected index
  useEffect(() => {
    scrollToIndex(selectedIndex, false);
  }, [selectedIndex, scrollToIndex]);

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    setIsScrolling(true);
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);

    scrollTimeoutRef.current = setTimeout(() => {
      const scrollTop = container.scrollTop;
      const index = Math.round(scrollTop / itemHeight);
      const clampedIndex = Math.max(0, Math.min(items.length - 1, index));

      scrollToIndex(clampedIndex);
      if (clampedIndex !== selectedIndex) {
        onSelect(clampedIndex);
      }
      setIsScrolling(false);
    }, 80);
  }, [itemHeight, items.length, selectedIndex, onSelect, scrollToIndex]);

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col items-center">
      {label && (
        <span className="mb-1 text-xs font-medium text-slate-400">{label}</span>
      )}
      <div
        className="relative overflow-hidden rounded-xl bg-slate-800/50"
        style={{ height: containerHeight }}
      >
        {/* Selection highlight */}
        <div
          className="pointer-events-none absolute left-0 right-0 z-10 rounded-lg border border-indigo-500/30 bg-indigo-500/10"
          style={{
            top: paddingItems * itemHeight,
            height: itemHeight,
          }}
        />
        {/* Top fade */}
        <div
          className="pointer-events-none absolute left-0 right-0 top-0 z-20 bg-gradient-to-b from-slate-950/80 to-transparent"
          style={{ height: paddingItems * itemHeight }}
        />
        {/* Bottom fade */}
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-slate-950/80 to-transparent"
          style={{ height: paddingItems * itemHeight }}
        />

        <div
          ref={containerRef}
          className="no-scrollbar h-full overflow-y-scroll"
          onScroll={handleScroll}
          style={{ scrollSnapType: isScrolling ? "none" : "y mandatory" }}
        >
          {/* Top padding */}
          <div style={{ height: paddingItems * itemHeight }} />

          {items.map((item, index) => {
            const isSelected = index === selectedIndex;
            return (
              <div
                key={`${item}-${index}`}
                className={`flex items-center justify-center transition-all ${
                  isSelected
                    ? "text-white font-semibold scale-105"
                    : "text-slate-500 scale-95"
                }`}
                style={{
                  height: itemHeight,
                  scrollSnapAlign: "center",
                }}
                onClick={() => {
                  onSelect(index);
                  scrollToIndex(index);
                }}
              >
                <span className="truncate px-4 text-sm">{item}</span>
              </div>
            );
          })}

          {/* Bottom padding */}
          <div style={{ height: paddingItems * itemHeight }} />
        </div>
      </div>
    </div>
  );
}
