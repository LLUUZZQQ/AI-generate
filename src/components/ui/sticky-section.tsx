"use client";
import { useRef, useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

export function StickySection({
  children,
  index,
  className = "",
}: {
  children: React.ReactNode;
  index: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const update = () => setHeight(window.innerHeight);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0.3]);
  const scale = useTransform(scrollYProgress, [0, 0.6], [1, 0.96]);
  const overlayOpacity = useTransform(scrollYProgress, [0.4, 0.9], [0, 0.6]);

  const z = 10 + index * 10;

  return (
    <div
      ref={ref}
      className={`sticky top-0 ${className}`}
      style={{
        zIndex: z,
        minHeight: height > 0 ? height : "100vh",
      }}
    >
      {/* Dark overlay that appears as section gets covered */}
      <motion.div
        className="absolute inset-0 bg-background pointer-events-none"
        style={{ opacity: overlayOpacity }}
      />

      <motion.div
        style={{ opacity, scale }}
        className="h-full flex items-center"
      >
        <div className="w-full">{children}</div>
      </motion.div>
    </div>
  );
}
