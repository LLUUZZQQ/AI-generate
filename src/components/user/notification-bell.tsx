"use client";
import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Bell, CheckCircle2, XCircle, Info, Loader2 } from "lucide-react";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => { const r = await fetch("/api/notifications"); return r.json(); },
    refetchInterval: 20000,
  });

  const notifications = data?.data?.notifications ?? [];
  const unread = data?.data?.unread ?? 0;

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const markRead = async () => {
    await fetch("/api/notifications?markRead=1");
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  const toggle = () => {
    if (!open && unread > 0) markRead();
    setOpen(!open);
  };

  const iconForType = (type: string) => {
    if (type === "success") return <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />;
    if (type === "error" || type === "warning") return <XCircle className="w-3.5 h-3.5 text-red-400" />;
    return <Info className="w-3.5 h-3.5 text-blue-400" />;
  };

  return (
    <div ref={ref} className="relative">
      <button onClick={toggle}
        className="relative p-2 rounded-lg hover:bg-white/[0.04] transition-colors text-white/45 hover:text-white/70">
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center text-[9px] font-bold bg-red-500 text-white rounded-full px-1">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 glass rounded-xl shadow-2xl border-white/[0.08] z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            <span className="text-xs font-medium text-white/50">消息通知</span>
            {unread > 0 && <span className="text-[10px] text-purple-400">{unread} 条未读</span>}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-xs text-white/20 text-center py-8">暂无通知</p>
            ) : (
              notifications.map((n: any) => (
                <Link key={n.id} href={n.link || "#"} onClick={() => setOpen(false)}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors ${
                    !n.read ? "bg-purple-500/[0.03]" : ""
                  }`}>
                  <span className="mt-0.5 shrink-0">{iconForType(n.type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/65 leading-relaxed">{n.message}</p>
                    <p className="text-[10px] text-white/20 mt-1">
                      {n.created_at ? new Date(n.created_at).toLocaleString("zh-CN") : ""}
                    </p>
                  </div>
                  {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />}
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
