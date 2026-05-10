"use client";
import { useEffect, useRef } from "react";

export function ScrollProgress() {
  useEffect(() => {
    const bar = document.getElementById("scroll-progress");
    if (!bar) return;

    const onScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? scrollTop / docHeight : 0;
      bar.style.transform = `scaleX(${progress})`;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      id="scroll-progress"
      className="fixed top-0 left-0 right-0 h-[2px] z-[100] origin-left bg-gradient-to-r from-purple-500 to-pink-500 scale-x-0 transition-transform duration-100"
    />
  );
}

export function ParallaxGlow() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onScroll = () => {
      const scrollY = window.scrollY;
      el.style.transform = `translateY(${scrollY * 0.03}px)`;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div ref={ref} className="absolute inset-0 pointer-events-none transition-transform duration-700 ease-out">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-purple-500/8 blur-[120px]" />
      <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[300px] rounded-full bg-amber-500/4 blur-[100px]" />
    </div>
  );
}
