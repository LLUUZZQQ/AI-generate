"use client";
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { User, ChevronDown, Coins, LogOut, Settings, Shield } from "lucide-react";

export function ProfileDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: ["user-me"],
    queryFn: async () => { const res = await fetch("/api/user/me"); return res.json(); },
    staleTime: 10000,
    refetchOnWindowFocus: true,
  });
  const user = data?.data?.user;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  if (!user) return null;

  const firstChar = (user.name || user.email || "?").charAt(0).toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] pl-1.5 pr-2.5 py-1 text-xs hover:border-white/15 transition-colors">
        <span className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-[11px] font-semibold text-purple-300">
          {firstChar}
        </span>
        <span className="text-white/60 max-w-[80px] truncate hidden sm:inline">{user.name || user.email}</span>
        <ChevronDown className={`w-3 h-3 text-white/30 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 glass rounded-xl p-2 z-50 shadow-2xl border-white/[0.08]">
          {/* User info */}
          <div className="px-3 py-2.5">
            <div className="text-sm font-medium text-white/80 truncate">{user.name || "未设置"}</div>
            <div className="text-xs text-white/35 truncate">{user.email}</div>
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${user.role === "admin" ? "bg-purple-500/20 text-purple-300" : "bg-white/[0.04] text-white/25"}`}>
                {user.role === "admin" ? "管理员" : "用户"}
              </span>
              <span className="text-xs text-white/40 flex items-center gap-1">
                <Coins className="w-3 h-3 text-purple-400" /> {user.credits?.toLocaleString() ?? 0}
              </span>
            </div>
          </div>

          <div className="h-px bg-white/[0.06] my-1" />

          {/* Links */}
          <Link href="/settings?tab=account" onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-white/55 hover:text-white/80 hover:bg-white/[0.04] transition-colors">
            <User className="w-3.5 h-3.5" /> 个人中心
          </Link>
          <Link href="/settings?tab=billing" onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-white/55 hover:text-white/80 hover:bg-white/[0.04] transition-colors">
            <Coins className="w-3.5 h-3.5" /> 充值中心
          </Link>
          {user.role === "admin" && (
            <Link href="/admin" onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-white/55 hover:text-purple-400 hover:bg-white/[0.04] transition-colors">
              <Shield className="w-3.5 h-3.5" /> 管理后台
            </Link>
          )}

          <div className="h-px bg-white/[0.06] my-1" />

          <button onClick={() => signOut()}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-white/40 hover:text-red-400 hover:bg-white/[0.04] transition-colors w-full text-left">
            <LogOut className="w-3.5 h-3.5" /> 退出登录
          </button>
        </div>
      )}
    </div>
  );
}
