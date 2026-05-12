"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Image as ImageIcon, Wand2, Sparkles } from "lucide-react";

const steps = [
  { icon: <ImageIcon className="w-5 h-5" />, label: "原图", color: "text-foreground/40" },
  { icon: <Wand2 className="w-5 h-5" />, label: "AI 抠图", color: "text-purple-400" },
  { icon: <Sparkles className="w-5 h-5" />, label: "场景合成", color: "text-blue-400" },
  { icon: <ImageIcon className="w-5 h-5" />, label: "结果", color: "text-emerald-400" },
];

export function GenerationFlow() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActive((prev) => (prev + 1) % steps.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2 py-4">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${i}-${active >= i ? "active" : "inactive"}`}
              initial={i === active ? { scale: 0.8, opacity: 0 } : {}}
              animate={i <= active ? { scale: 1, opacity: 1 } : { scale: 1, opacity: 0.3 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className={`flex flex-col items-center gap-1.5 ${i <= active ? step.color : "text-foreground/15"}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-colors duration-700 ${
                i <= active
                  ? "bg-white/[0.06] border-white/[0.1]"
                  : "bg-white/[0.02] border-white/[0.04]"
              }`}>
                {step.icon}
              </div>
              <span className="text-[10px] font-medium">{step.label}</span>
            </motion.div>
          </AnimatePresence>
          {i < steps.length - 1 && (
            <motion.div
              className="w-8 h-px bg-white/[0.08]"
              animate={{ background: i < active ? "rgba(168,139,255,0.4)" : "rgba(255,255,255,0.08)" }}
              transition={{ duration: 0.7 }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
