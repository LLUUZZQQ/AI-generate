"use client";
export function BrowserFrame({ children, className = "", showBlob = false }: { children: React.ReactNode; className?: string; showBlob?: boolean }) {
  return (
    <div className={`relative ${className}`}>
      {/* Blurry gradient blob background */}
      {showBlob && (
        <>
          <div className="absolute -inset-20 bg-gradient-to-br from-purple-500/8 via-transparent to-blue-500/6 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-gradient-to-r from-pink-400/6 to-transparent rounded-full blur-3xl pointer-events-none" />
        </>
      )}
      {/* Window frame */}
      <div className="relative rounded-[1.25rem] overflow-hidden border border-white/[0.08] bg-black/20 backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_0_60px_-20px_rgba(181,123,238,0.12)] transition-all duration-500 hover:border-white/[0.14] hover:-translate-y-0.5">
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 h-10 border-b border-white/[0.05] bg-white/[0.015]">
          <div className="w-3 h-3 rounded-full bg-red-400/60" />
          <div className="w-3 h-3 rounded-full bg-amber-400/60" />
          <div className="w-3 h-3 rounded-full bg-emerald-400/60" />
          <div className="flex-1" />
        </div>
        {children}
      </div>
    </div>
  );
}
