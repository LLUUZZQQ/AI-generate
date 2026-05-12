"use client";
import { useEffect, useRef } from "react";
import Lenis from "lenis";

export function ParallaxGrid() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onScroll = ({ scroll }: { scroll: number }) => {
      el.style.transform = `translateY(${scroll * 0.12}px)`;
    };

    const lenis = (window as any).__lenis as Lenis | undefined;
    if (lenis) {
      lenis.on("scroll", onScroll as any);
      return () => { lenis?.off("scroll", onScroll as any); };
    }

    // Fallback to native scroll
    const nativeScroll = () => {
      el.style.transform = `translateY(${window.scrollY * 0.12}px)`;
    };
    window.addEventListener("scroll", nativeScroll, { passive: true });
    return () => window.removeEventListener("scroll", nativeScroll);
  }, []);

  return (
    <div
      ref={ref}
      className="fixed inset-0 z-[-1] pointer-events-none opacity-25"
      style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)`,
        backgroundSize: "48px 48px",
      }}
    />
  );
}
