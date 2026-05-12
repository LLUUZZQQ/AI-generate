"use client";
import dynamic from "next/dynamic";

const InteractiveLogo = dynamic(() => import("./interactive-logo").then(m => ({ default: m.InteractiveLogo })), {
  ssr: false,
  loading: () => <div className="w-full h-[320px] md:h-[420px]" />,
});

export function InteractiveLogoWrapper() {
  return <InteractiveLogo />;
}
