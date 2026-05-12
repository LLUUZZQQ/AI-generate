"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CreditsDisplay } from "@/components/user/credits-display";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export function Header() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`sticky top-0 z-50 border-b transition-all duration-500 ease-smooth ${
      scrolled
        ? "border-white/[0.08] bg-background/95 backdrop-blur-xl shadow-lg shadow-black/20"
        : "border-white/[0.04] bg-background/70 backdrop-blur-md"
    }`}>
      <div className={`flex items-center justify-between px-4 md:px-6 max-w-7xl mx-auto transition-all duration-500 ease-smooth ${
        scrolled ? "h-12" : "h-14"
      }`}>
        <Link href="/" className={`font-bold shrink-0 tracking-tight transition-all duration-500 ${
          scrolled ? "text-base" : "text-lg"
        }`}>
          <motion.span
            className="inline-block bg-clip-text text-transparent"
            style={{
              backgroundImage: "linear-gradient(135deg, #d4b8f0 0%, #b57bee 30%, #f0a0c0 55%, #f5c090 75%, #d4b8f0 100%)",
              backgroundSize: "200% 200%",
            }}
            animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          >
            Frame
          </motion.span>
          <motion.span
            className="inline-block bg-clip-text text-transparent"
            style={{
              backgroundImage: "linear-gradient(135deg, #e0d0ff 0%, #ffffff 40%, #d0c0f0 70%, #e0d0ff 100%)",
              backgroundSize: "200% 200%",
            }}
            animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          >
            Craft
          </motion.span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {session ? (
            <>
              <CreditsDisplay />
              <Link href="/"><Button variant="ghost" size="sm" className="text-white/60 hover:text-white">首页</Button></Link>
              <Link href="/background-replace"><Button variant="ghost" size="sm" className="text-white/60 hover:text-white">背景替换</Button></Link>
              <Link href="/dashboard"><Button variant="ghost" size="sm" className="text-white/60 hover:text-white">我的</Button></Link>
              <ThemeToggle />
              <Button variant="outline" size="sm" className="border-white/10 hover:bg-white/5 ml-2" onClick={() => signOut()}>退出</Button>
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
          {session && <CreditsDisplay />}
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
              <Link href="/dashboard" onClick={() => setOpen(false)} className="block py-2.5 text-sm text-white/70 hover:text-white">👤 我的</Link>
              <div className="py-2"><ThemeToggle /></div>
              <Button variant="outline" size="sm" className="w-full border-white/10" onClick={() => signOut()}>退出</Button>
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
