"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { GripVertical, Pause, Play } from "lucide-react";

export function CompareSlider({
  before,
  after,
  beforeLabel = "原图",
  afterLabel = "AI 处理后",
  autoPlay = true,
}: {
  before: string;
  after: string;
  beforeLabel?: string;
  afterLabel?: string;
  autoPlay?: boolean;
}) {
  const [pos, setPos] = useState(50);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [containerWidth, setContainerWidth] = useState(800);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const lastInteraction = useRef(0);
  const animFrameRef = useRef<number>(0);

  // Measure container width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setContainerWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Auto-play sine-wave animation
  useEffect(() => {
    if (!isPlaying) {
      cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const cycleMs = 5000;
    let started: number | null = null;

    const tick = (ts: number) => {
      if (!started) started = ts;
      const t = ((ts - started) % cycleMs) / cycleMs;
      setPos(50 + 38 * Math.sin(t * Math.PI * 2));
      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isPlaying]);

  // Pause auto-play on user interaction, resume after 4s idle
  const onUserInteraction = useCallback(() => {
    lastInteraction.current = Date.now();
    setIsPlaying(false);
    setTimeout(() => {
      if (Date.now() - lastInteraction.current >= 3800) setIsPlaying(true);
    }, 4000);
  }, []);

  // Drag handling
  useEffect(() => {
    const onUp = () => { dragging.current = false; };
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!dragging.current || !containerRef.current) return;
      e.preventDefault();
      onUserInteraction();
      const rect = containerRef.current.getBoundingClientRect();
      const x = "touches" in e ? e.touches[0].clientX : e.clientX;
      setPos(Math.max(2, Math.min(98, ((x - rect.left) / rect.width) * 100)));
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [onUserInteraction]);

  return (
    <div className="relative group/slider">
      {/* Glow behind divider */}
      <div
        className="absolute top-0 bottom-0 w-px pointer-events-none z-20 transition-opacity"
        style={{ left: `${pos}%`, opacity: dragging.current ? 0 : 0.6 }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-400 to-transparent shadow-[0_0_40px_8px_rgba(168,85,247,0.35)]" />
      </div>

      <div
        ref={containerRef}
        className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden border border-white/[0.06] select-none cursor-col-resize bg-black/20"
        onMouseDown={(e) => { e.preventDefault(); dragging.current = true; onUserInteraction(); }}
        onTouchStart={() => { dragging.current = true; onUserInteraction(); }}
      >
        {/* After image (full width) */}
        <img
          src={after}
          alt={afterLabel}
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />

        {/* Before image (clipped) */}
        <div className="absolute inset-0 overflow-hidden z-10" style={{ width: `${pos}%` }}>
          <img
            src={before}
            alt={beforeLabel}
            className="absolute inset-0 h-full object-cover"
            style={{ width: containerWidth, maxWidth: "none" }}
            draggable={false}
          />
        </div>

        {/* Divider line */}
        <div
          className="absolute top-0 bottom-0 w-[2px] bg-white/90 z-20 pointer-events-none transition-none"
          style={{ left: `${pos}%` }}
        />

        {/* Handle knob */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-30 pointer-events-none"
          style={{ left: `${pos}%` }}
        >
          <motion.div
            animate={{ scale: dragging.current ? 1.2 : 1 }}
            className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-2xl border-2 border-white/25 shadow-[0_0_30px_rgba(168,85,247,0.5),0_0_60px_rgba(168,85,247,0.2)] flex items-center justify-center"
          >
            <div className="w-7 h-7 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center">
              <GripVertical className="w-4 h-4 text-white/70" />
            </div>
          </motion.div>
        </div>

        {/* Labels */}
        <motion.span
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="absolute top-4 left-4 z-20 text-[11px] bg-black/55 backdrop-blur-lg text-white/80 px-3 py-1.5 rounded-full border border-white/[0.06] font-medium tracking-wide"
        >
          {beforeLabel}
        </motion.span>
        <motion.span
          initial={{ opacity: 0, x: 6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="absolute top-4 right-4 z-20 text-[11px] bg-purple-500/50 backdrop-blur-lg text-white/90 px-3 py-1.5 rounded-full border border-purple-400/15 font-medium tracking-wide flex items-center gap-1"
        >
          <span className="w-1 h-1 rounded-full bg-emerald-300" />
          {afterLabel}
        </motion.span>

        {/* Play/Pause toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsPlaying((p) => !p);
          }}
          className="absolute bottom-4 right-4 z-30 w-8 h-8 rounded-full bg-black/40 backdrop-blur-lg border border-white/[0.08] flex items-center justify-center opacity-0 group-hover/slider:opacity-100 transition-all duration-300 hover:bg-black/60 hover:border-white/[0.15]"
        >
          {isPlaying ? (
            <Pause className="w-3 h-3 text-white/50" />
          ) : (
            <Play className="w-3 h-3 text-white/50" />
          )}
        </button>
      </div>
    </div>
  );
}
