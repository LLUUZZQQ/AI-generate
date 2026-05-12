"use client";
export function BrowserFrame({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl overflow-hidden border border-white/[0.06] bg-white/[0.015] backdrop-blur-sm shadow-[0_0_60px_-20px_rgba(181,123,238,0.12)] ${className}`}>
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 h-10 border-b border-white/[0.05] bg-white/[0.02]">
        <div className="w-3 h-3 rounded-full bg-red-400/60" />
        <div className="w-3 h-3 rounded-full bg-amber-400/60" />
        <div className="w-3 h-3 rounded-full bg-emerald-400/60" />
        <div className="flex-1" />
      </div>
      {children}
    </div>
  );
}
