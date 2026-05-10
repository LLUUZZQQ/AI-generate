"use client";
import { useSession } from "next-auth/react";
import Link from "next/link";

export function CreditsDisplay() {
  const { data: session } = useSession();
  const credits = session?.user?.credits ?? 0;

  return (
    <Link href="/settings" className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-xs hover:border-white/15 transition-colors">
      <span className="text-purple-400">◆</span>
      <span className="font-semibold tabular-nums">{credits}</span>
    </Link>
  );
}
