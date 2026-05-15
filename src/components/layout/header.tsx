"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ProfileDropdown } from "@/components/user/profile-dropdown";
import { NotificationBell } from "@/components/user/notification-bell";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Coins } from "lucide-react";

export function Header() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const { data: userData } = useQuery({
    queryKey: ["user-me"],
    queryFn: async () => { const res = await fetch("/api/user/me"); return res.json(); },
    enabled: !!session,
    staleTime: 30000,
  });
  const isAdmin = userData?.data?.user?.role === "admin";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="sticky top-3 z-50 transition-all duration-500 ease-smooth">
      <div className={`flex items-center justify-between px-5 max-w-7xl mx-auto transition-all duration-500 ease-smooth rounded-2xl border ${
        scrolled
          ? "h-11 bg-background/80 border-white/[0.08] backdrop-blur-2xl shadow-[0_8px_32px_-12px_rgba(0,0,0,0.5)]"
          : "h-12 bg-background/50 border-white/[0.04] backdrop-blur-xl shadow-[0_4px_20px_-8px_rgba(0,0,0,0.3)]"
      }`}>
        <Link href="/" className="font-bold shrink-0 tracking-tight text-sm transition-all duration-500">
          <motion.span
            className="inline-block bg-clip-text text-transparent"
            style={{
              backgroundImage: "linear-gradient(135deg, #818cf8 0%, #a78bfa 25%, #60a5fa 50%, #818cf8 75%, #a78bfa 100%)",
              backgroundSize: "300% 300%",
            }}
            animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          >
            Frame
          </motion.span>
          <motion.span
            className="inline-block bg-clip-text text-transparent"
            style={{
              backgroundImage: "linear-gradient(135deg, #c7d2fe 0%, #e0e7ff 35%, #93c5fd 65%, #c7d2fe 100%)",
              backgroundSize: "300% 300%",
            }}
            animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
            transition={{ duration: 7, repeat: Infinity, ease: "linear", delay: 1 }}
          >
            Craft
          </motion.span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {session ? (
            <>
              <Link href="/settings?tab=billing"><Button size="sm" className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/20 text-purple-300 hover:from-purple-500/30 hover:to-pink-500/30 text-xs h-7 rounded-full px-3"><Coins className="w-3 h-3 mr-1" />充值</Button></Link>
              <Link href="/"><Button variant="ghost" size="sm" className="text-white/60 hover:text-white">首页</Button></Link>
              <Link href="/background-replace"><Button variant="ghost" size="sm" className="text-white/60 hover:text-white">背景替换</Button></Link>
              <Link href="/pet-portrait"><Button variant="ghost" size="sm" className="text-white/60 hover:text-white">宠物写真</Button></Link>
              <Link href="/dashboard"><Button variant="ghost" size="sm" className="text-white/60 hover:text-white">我的</Button></Link>
              {isAdmin && <Link href="/admin"><Button variant="ghost" size="sm" className="text-white/25 hover:text-purple-400 text-[11px]">管理</Button></Link>}
              <NotificationBell />
              <ThemeToggle />
              <ProfileDropdown />
            </>
          ) : (
            <>
              <Link href="/login"><Button variant="ghost" size="sm" className="text-white/60 hover:text-white">登录</Button></Link>
              <Link href="/register"><Button size="sm" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 border-0">注册</Button></Link>
            </>
          )}
        </nav>

        {/* Mobile */}
        <div className="flex md:hidden items-center gap-2">
          {session && <ProfileDropdown />}
          <Button variant="ghost" size="sm" onClick={() => setOpen(!open)} className="text-white/60">
            {open ? "✕" : "☰"}
          </Button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-white/[0.06] bg-background/95 backdrop-blur-xl px-4 py-3 space-y-1">
          {session ? (
            <>
              <Link href="/" onClick={() => setOpen(false)} className="block py-2.5 text-sm text-white/70 hover:text-white">🏠 首页</Link>
              <Link href="/background-replace" onClick={() => setOpen(false)} className="block py-2.5 text-sm text-white/70 hover:text-white">📸 背景替换</Link>
              <Link href="/pet-portrait" onClick={() => setOpen(false)} className="block py-2.5 text-sm text-white/70 hover:text-white">🐾 宠物写真</Link>
              <Link href="/dashboard" onClick={() => setOpen(false)} className="block py-2.5 text-sm text-white/70 hover:text-white">👤 我的</Link>
              <Link href="/settings" onClick={() => setOpen(false)} className="block py-2.5 text-sm text-white/70 hover:text-white">⚙️ 设置 · 充值</Link>
              {isAdmin && <Link href="/admin" onClick={() => setOpen(false)} className="block py-2.5 text-xs text-white/40 hover:text-purple-400">🛡 管理</Link>}
              <div className="py-2"><ThemeToggle /></div>
              <Link href="/settings?tab=billing" onClick={() => setOpen(false)} className="block py-2.5 text-sm text-white/70 hover:text-white">💰 充值</Link>
            </>
          ) : (
            <div className="flex gap-2">
              <Link href="/login" className="flex-1" onClick={() => setOpen(false)}>
                <Button variant="outline" size="sm" className="w-full border-white/10">登录</Button>
              </Link>
              <Link href="/register" className="flex-1" onClick={() => setOpen(false)}>
                <Button size="sm" className="w-full bg-gradient-to-r from-purple-500 to-pink-500 border-0">注册</Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
