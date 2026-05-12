"use client";

const platforms = [
  { name: "Vinted", style: { fontWeight: 700, letterSpacing: "-0.03em" } },
  { name: "Depop", style: { fontWeight: 700, letterSpacing: "-0.01em" } },
  { name: "eBay", style: { fontWeight: 600, letterSpacing: "-0.02em" } },
  { name: "Shopify", style: { fontWeight: 700, letterSpacing: "-0.01em" } },
  { name: "StockX", style: { fontWeight: 700, letterSpacing: "-0.04em" } },
  { name: "闲鱼", style: { fontWeight: 600, letterSpacing: "0.02em" } },
  { name: "Amazon", style: { fontWeight: 600, letterSpacing: "-0.01em" } },
  { name: "Etsy", style: { fontWeight: 600, letterSpacing: "-0.01em" } },
];

export function PartnerLogos() {
  return (
    <div className="relative overflow-hidden py-6">
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-24 z-10 pointer-events-none bg-gradient-to-r from-background to-transparent" />
      <div className="absolute right-0 top-0 bottom-0 w-24 z-10 pointer-events-none bg-gradient-to-r from-transparent to-background" />

      {/* Marquee track */}
      <div className="flex animate-marquee hover:[animation-play-state:paused]">
        {/* First set */}
        {platforms.map((p) => (
          <span
            key={p.name}
            className="shrink-0 mx-8 text-xl font-bold text-foreground/[0.06] hover:text-foreground/[0.18] transition-colors duration-500 cursor-default select-none"
            style={p.style}
          >
            {p.name}
          </span>
        ))}
        {/* Duplicate for seamless loop */}
        {platforms.map((p) => (
          <span
            key={`dup-${p.name}`}
            className="shrink-0 mx-8 text-xl font-bold text-foreground/[0.06] hover:text-foreground/[0.18] transition-colors duration-500 cursor-default select-none"
            style={p.style}
          >
            {p.name}
          </span>
        ))}
      </div>
    </div>
  );
}
