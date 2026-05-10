"use client";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { CreditsDisplay } from "@/components/user/credits-display";

export function Header() {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
      <div className="flex h-14 items-center justify-between px-6">
        <Link href="/trends" className="text-lg font-bold">
          AI爆款
        </Link>
        <nav className="flex items-center gap-4">
          {session ? (
            <>
              <CreditsDisplay />
              <Link href="/trends"><Button variant="ghost" size="sm">趋势</Button></Link>
              <Link href="/generate"><Button variant="ghost" size="sm">生成</Button></Link>
              <Link href="/library"><Button variant="ghost" size="sm">内容库</Button></Link>
              <Link href="/dashboard"><Button variant="ghost" size="sm">我的</Button></Link>
              <Button variant="outline" size="sm" onClick={() => signOut()}>退出</Button>
            </>
          ) : (
            <>
              <Link href="/login"><Button variant="ghost" size="sm">登录</Button></Link>
              <Link href="/register"><Button size="sm">注册</Button></Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
