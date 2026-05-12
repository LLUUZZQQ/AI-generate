"use client";
import { motion } from "framer-motion";

export function ZoomMedia({ src, alt = "", className = "", video = false }: { src: string; alt?: string; className?: string; video?: boolean }) {
  return (
    <div className={`overflow-hidden rounded-xl ${className}`}>
      <motion.div whileHover={{ scale: 1.04 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="h-full w-full">
        {video ? (
          <video src={src} autoPlay loop muted playsInline className="w-full h-full object-cover" />
        ) : (
          <img src={src} alt={alt} className="w-full h-full object-cover" />
        )}
      </motion.div>
    </div>
  );
}
