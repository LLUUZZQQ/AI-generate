"use client";
import { motion } from "framer-motion";

const logos = [
  { name: "Vinted", color: "text-teal-400" },
  { name: "Depop", color: "text-red-400" },
  { name: "eBay", color: "text-yellow-400" },
  { name: "Shopify", color: "text-green-400" },
  { name: "StockX", color: "text-emerald-400" },
  { name: "GOAT", color: "text-blue-400" },
  { name: "Instagram", color: "text-pink-400" },
  { name: "Facebook", color: "text-sky-400" },
];

export function PartnerLogos() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <p className="text-[10px] text-foreground/15 tracking-widest uppercase text-center mb-6">
        Trusted by sellers on
      </p>
      <div className="relative overflow-hidden">
        {/* Gradient masks */}
        <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-r from-transparent to-background z-10 pointer-events-none" />

        <motion.div
          className="flex items-center gap-10 whitespace-nowrap"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        >
          {[...logos, ...logos].map((logo, i) => (
            <span
              key={i}
              className={`text-sm font-semibold tracking-wide ${logo.color} opacity-40 hover:opacity-70 transition-opacity`}
            >
              {logo.name}
            </span>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
