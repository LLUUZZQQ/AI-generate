"use client";
import { useEffect, useRef, useState } from "react";

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  scale?: boolean;
}

export function ScrollReveal({ children, className = "", delay = 0, scale = false }: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setVisible(true), delay);
          observer.unobserve(el);
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -30px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  const baseTransform = scale
    ? "scale-95 translate-y-4"
    : "translate-y-6";

  const visibleTransform = "scale-100 translate-y-0";

  return (
    <div
      ref={ref}
      className={`transition-all duration-800 ease-smooth ${visible ? `opacity-100 ${visibleTransform}` : `opacity-0 ${baseTransform}`} ${className}`}
    >
      {children}
    </div>
  );
}
