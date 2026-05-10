"use client";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export function CreditsDisplay() {
  const { data: session } = useSession();

  return (
    <Link href="/settings">
      <Badge variant="secondary" className="cursor-pointer gap-1">
        <span>🪙</span>
        <span>{session?.user?.credits ?? 0}</span>
      </Badge>
    </Link>
  );
}
