"use client";
import { useState } from "react";
import { NodeLink } from "@/components/ui/node-icons";

interface AccordionCardProps {
  title: string;
  desc: string;
  details: string;
}

export function AccordionCard({ title, desc, details }: AccordionCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="glass rounded-xl overflow-hidden transition-all duration-300">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left p-6 flex items-start justify-between gap-4"
      >
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <NodeLink className="text-purple-500/40" />
            <h3 className="font-semibold text-sm">{title}</h3>
          </div>
          <p className="text-xs text-white/30 pl-[72px]">{desc}</p>
        </div>
        <span className={`text-white/30 text-lg transition-transform duration-300 shrink-0 ${open ? "rotate-45" : ""}`}>
          +
        </span>
      </button>
      <div className={`transition-all duration-300 overflow-hidden ${open ? "max-h-60 pb-6" : "max-h-0"}`}>
        <p className="text-xs text-white/40 leading-relaxed px-6 pl-[72px]">{details}</p>
      </div>
    </div>
  );
}
