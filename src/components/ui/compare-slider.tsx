"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, animate } from "framer-motion";
import { ArrowLeftRight } from "lucide-react";

export function CompareSlider({
  before,
  after,
  beforeLabel = "原图",
  afterLabel = "结果",
}: {
  before: string;
  after: string;
  beforeLabel?: string;
  afterLabel?: string;
}) {
  const [pos, setPos] = useState(50);
  const [loaded, setLoaded] = useState({ before: false, after: false });
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const animRef = useRef<any>(null);

  const updatePos = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setPos(Math.max(5, Math.min(95, ((clientX - rect.left) / rect.width) * 100)));
  }, []);

  useEffect(() => {
    const onUp = () => {
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      e.preventDefault();
      updatePos(e.clientX);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!dragging.current) return;
      updatePos(e.touches[0].clientX);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [updatePos]);

  // Auto-play entrance animation
  useEffect(() => {
    if (!loaded.before || !loaded.after) return;
    const timer = setTimeout(() => {
      animRef.current = animate(50, 75, {
        duration: 1.2,
        ease: [0.34, 1.56, 0.64, 1],
        onUpdate: (v) => setPos(v),
      });
      setTimeout(() => {
        animRef.current = animate(75, 35, {
          duration: 1.4,
          ease: [0.43, 0.13, 0.23, 0.96],
          onUpdate: (v) => setPos(v),
        });
      }, 900);
      setTimeout(() => {
        animRef.current = animate(35, 50, {
          duration: 1,
          ease: [0.34, 1.56, 0.64, 1],
          onUpdate: (v) => setPos(v),
        });
      }, 2400);
    }, 600);
    return () => {
      clearTimeout(timer);
      animRef.current?.stop();
    };
  }, [loaded]);

  const handleMouseDown = () => {
    animRef.current?.stop();
    dragging.current = true;
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden select-none group"
      onMouseDown={handleMouseDown}
      onTouchStart={() => {
        animRef.current?.stop();
        dragging.current = true;
      }}
    >
      {/* Skeleton loader */}
      {(!loaded.before || !loaded.after) && (
        <div className="absolute inset-0 bg-white/[0.02] animate-pulse rounded-2xl" />
      )}

      {/* After image (full, underneath) */}
      <img
        src={after}
        alt={afterLabel}
        className="absolute inset-0 w-full h-full object-cover"
        onLoad={() => setLoaded((l) => ({ ...l, after: true }))}
        draggable={false}
      />

      {/* Before image (clipped by position) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${pos}%` }}
      >
        <img
          src={before}
          alt={beforeLabel}
          className="absolute inset-0 h-full object-cover"
          style={{ width: containerRef.current?.clientWidth || 800 }}
          onLoad={() => setLoaded((l) => ({ ...l, before: true }))}
          draggable={false}
        />
        {/* Left edge gradient blend */}
        <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-r from-transparent to-black/10 pointer-events-none" />
      </div>

      {/* Right edge gradient on after side */}
      <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-l from-transparent to-black/10 pointer-events-none" style={{ left: `${pos}%` }} />

      {/* Divider line */}
      <div
        className="absolute top-0 bottom-0 w-[2px] pointer-events-none"
        style={{ left: `${pos}%` }}
      >
        {/* Glow */}
        <div className="absolute inset-0 bg-white shadow-[0_0_10px_rgba(168,139,255,0.5),0_0_4px_rgba(255,255,255,0.6)]" />
        {/* Handle thumb */}
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-white/95 shadow-[0_0_20px_rgba(168,139,255,0.3),0_4px_16px_rgba(0,0,0,0.3)] flex items-center justify-center backdrop-blur-sm">
          <ArrowLeftRight className="w-4 h-4 text-gray-600" />
        </div>
      </div>

      {/* Labels */}
      <motion.span
        initial={{ opacity: 0, x: -8 }}
        animate={loaded.before ? { opacity: 1, x: 0 } : {}}
        transition={{ delay: 0.3 }}
        className="absolute top-4 left-4 text-[10px] tracking-wide bg-black/50 backdrop-blur-md text-white/80 px-3 py-1.5 rounded-full border border-white/[0.08]"
      >
        {beforeLabel}
      </motion.span>
      <motion.span
        initial={{ opacity: 0, x: 8 }}
        animate={loaded.after ? { opacity: 1, x: 0 } : {}}
        transition={{ delay: 0.3 }}
        className="absolute top-4 right-4 text-[10px] tracking-wide bg-purple-500/60 backdrop-blur-md text-white px-3 py-1.5 rounded-full border border-purple-400/20"
      >
        {afterLabel}
      </motion.span>

      {/* Drag hint (fades on interaction) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-white/25 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        拖拽中间滑块对比
      </div>
    </div>
  );
}
