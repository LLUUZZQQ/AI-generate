"use client";
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { GripVertical } from "lucide-react";

export function CompareSlider({ before, after, beforeLabel = "原图", afterLabel = "结果" }: { before: string; after: string; beforeLabel?: string; afterLabel?: string }) {
  const [pos, setPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  useEffect(() => {
    const onUp = () => { dragging.current = false; };
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = "touches" in e ? e.touches[0].clientX : e.clientX;
      const p = Math.max(0, Math.min(100, ((x - rect.left) / rect.width) * 100));
      setPos(p);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden border border-white/[0.06] select-none cursor-col-resize"
      onMouseDown={() => { dragging.current = true; }}
      onTouchStart={() => { dragging.current = true; }}
    >
      {/* After (full) */}
      <img src={after} alt={afterLabel} className="absolute inset-0 w-full h-full object-cover" />
      {/* Before (clipped) */}
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${pos}%` }}>
        <img src={before} alt={beforeLabel} className="absolute inset-0 w-full h-full object-cover" style={{ width: `${containerRef.current?.clientWidth || 800}px` }} />
      </div>
      {/* Divider */}
      <div className="absolute top-0 bottom-0 w-0.5 bg-white/80 shadow-[0_0_12px_rgba(255,255,255,0.3)]" style={{ left: `${pos}%` }}>
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white/90 shadow-lg flex items-center justify-center">
          <GripVertical className="w-4 h-4 text-gray-700" />
        </div>
      </div>
      {/* Labels */}
      <span className="absolute top-3 left-3 text-[10px] bg-black/50 text-white/80 px-2 py-1 rounded-md backdrop-blur-sm">{beforeLabel}</span>
      <span className="absolute top-3 right-3 text-[10px] bg-black/50 text-white/80 px-2 py-1 rounded-md backdrop-blur-sm">{afterLabel}</span>
    </div>
  );
}
