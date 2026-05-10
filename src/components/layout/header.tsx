"use client";
import { useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { CreditsDisplay } from "@/components/user/credits-display";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export function Header() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
      <div className="flex h-14 items-center justify-between px-4 md:px-6">
        <Link href={session ? "/trends" : "/"} className="text-lg font-bold shrink-0">
          AI爆款
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-4">
          {session ? (
            <>
              <CreditsDisplay />
              <Link href="/trends"><Button variant="ghost" size="sm">趋势</Button></Link>
              <Link href="/generate"><Button variant="ghost" size="sm">生成</Button></Link>
              <Link href="/library"><Button variant="ghost" size="sm">内容库</Button></Link>
              <Link href="/dashboard"><Button variant="ghost" size="sm">我的</Button></Link>
              <ThemeToggle />
              <Button variant="outline" size="sm" onClick={() => signOut()}>退出</Button>
            </>
          ) : (
            <>
              <Link href="/login"><Button variant="ghost" size="sm">登录</Button></Link>
              <Link href="/register"><Button size="sm">注册</Button></Link>
            </>
          )}
        </nav>

        {/* Mobile hamburger + credits */}
        <div className="flex md:hidden items-center gap-2">
          {session && <CreditsDisplay />}
          <Button variant="ghost" size="sm" onClick={() => setOpen(!open)}>
            {open ? "✕" : "☰"}
          </Button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden border-t bg-background px-4 py-3 space-y-2">
          {session ? (
            <>
              <Link href="/trends" onClick={() => setOpen(false)} className="block py-2 text-sm font-medium">🔥 趋势</Link>
              <Link href="/generate" onClick={() => setOpen(false)} className="block py-2 text-sm font-medium">🎨 生成</Link>
              <Link href="/library" onClick={() => setOpen(false)} className="block py-2 text-sm font-medium">📦 内容库</Link>
              <Link href="/dashboard" onClick={() => setOpen(false)} className="block py-2 text-sm font-medium">👤 我的</Link>
              <div className="py-2"><ThemeToggle /></div>
              <Button variant="outline" size="sm" className="w-full" onClick={() => signOut()}>退出</Button>
            </>
          ) : (
            <div className="flex gap-2">
              <Link href="/login" className="flex-1" onClick={() => setOpen(false)}>
                <Button variant="outline" size="sm" className="w-full">登录</Button>
              </Link>
              <Link href="/register" className="flex-1" onClick={() => setOpen(false)}>
                <Button size="sm" className="w-full">注册</Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
