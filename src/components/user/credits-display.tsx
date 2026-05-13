"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

export function CreditsDisplay() {
  const { data } = useQuery({
    queryKey: ["user-me"],
    queryFn: async () => {
      const res = await fetch("/api/user/me");
      return res.json();
    },
    staleTime: 10000, // 10s cache, then recheck
    refetchOnWindowFocus: true,
  });
  const credits = data?.data?.user?.credits ?? 0;

  return (
    <Link href="/settings" className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-xs hover:border-white/15 transition-colors">
      <span className="text-purple-400">◆</span>
      <span className="font-semibold tabular-nums">{credits}</span>
    </Link>
  );
}
