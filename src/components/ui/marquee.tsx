"use client";

export function Marquee({ items }: { items: string[] }) {
  return (
    <div className="relative overflow-hidden py-3">
      <div className="flex animate-marquee gap-8 whitespace-nowrap">
        {[...items, ...items].map((item, i) => (
          <span key={i} className="text-sm text-white/25 font-medium tracking-wide hover:text-white/45 transition-colors cursor-default">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
