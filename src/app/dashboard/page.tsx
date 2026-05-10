"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { NodeLeft, NodeRight } from "@/components/ui/node-icons";

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["user-me"],
    queryFn: async () => { const res = await fetch("/api/user/me"); return res.json(); },
  });

  const user = data?.data?.user;
  const stats: Array<{ type: string; status: string; _count: number }> = data?.data?.stats ?? [];
  const imageCount = stats.filter((s) => s.type === "image" && s.status === "done").reduce((sum, s) => sum + s._count, 0);
  const videoCount = stats.filter((s) => s.type === "video" && s.status === "done").reduce((sum, s) => sum + s._count, 0);
  const isNewUser = imageCount + videoCount === 0;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <NodeLeft className="text-purple-500/60" />
          <p className="text-[11px] text-purple-400 font-semibold tracking-widest uppercase">Dashboard</p>
          <NodeRight className="text-purple-500/60" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">个人中心</h1>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-3 mb-8">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl bg-white/[0.03]" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { label: "积分余额", value: user?.credits ?? 0, suffix: "", color: "text-purple-400" },
              { label: "图片生成", value: imageCount, suffix: " 张", color: "text-emerald-400" },
              { label: "视频生成", value: videoCount, suffix: " 条", color: "text-amber-400" },
            ].map((stat) => (
              <div key={stat.label} className="glass rounded-xl p-5">
                <p className="text-[11px] text-white/30 mb-1">{stat.label}</p>
                <p className={`text-2xl font-bold ${stat.color} tabular-nums`}>
                  {stat.value}<span className="text-sm font-normal text-white/30">{stat.suffix}</span>
                </p>
              </div>
            ))}
          </div>

          {isNewUser ? (
            <div className="glass rounded-xl p-6 mb-8">
              <h3 className="font-semibold mb-4">🚀 快速开始</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                {[
                  { step: "1", title: "浏览趋势", desc: "发现热门话题", href: "/trends" },
                  { step: "2", title: "AI 生成", desc: "创作爆款内容", href: "/generate" },
                  { step: "3", title: "查看建议", desc: "获取发布指导", href: "/library" },
                ].map((s) => (
                  <Link key={s.step} href={s.href} className="glass rounded-lg p-4 hover:border-white/15 transition-all">
                    <div className="size-8 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center text-sm font-bold mx-auto mb-2">{s.step}</div>
                    <h4 className="text-sm font-semibold mb-0.5">{s.title}</h4>
                    <p className="text-[10px] text-white/30">{s.desc}</p>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex gap-2 mb-8">
              <Link href="/trends"><Button variant="outline" size="sm" className="border-white/10">浏览趋势</Button></Link>
              <Link href="/generate"><Button size="sm" className="bg-gradient-to-r from-purple-500 to-pink-500 border-0">立即生成</Button></Link>
              <Link href="/settings"><Button variant="outline" size="sm" className="border-white/10">充值积分</Button></Link>
            </div>
          )}

          <RecentContent />
        </>
      )}
    </div>
  );
}

function RecentContent() {
  const { data, isLoading } = useQuery({
    queryKey: ["library", "recent"],
    queryFn: async () => { const res = await fetch("/api/library?pageSize=4"); return res.json(); },
  });
  const items = data?.data?.list ?? [];
  if (isLoading) return <Skeleton className="h-20 w-full bg-white/[0.03] rounded-xl" />;
  if (items.length === 0) return null;

  return (
    <div>
      <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">最近生成</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {items.map((item: any) => (
          <Link key={item.id} href={`/library/${item.id}`} className="glass rounded-lg overflow-hidden hover:border-white/15 transition-all group">
            <div className="aspect-square bg-white/[0.02] flex items-center justify-center">
              {item.thumbnailUrl ? (
                <img src={item.thumbnailUrl} alt={item.prompt} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              ) : (
                <span className="text-xl">{item.type === "video" ? "🎬" : "🖼️"}</span>
              )}
            </div>
            <div className="p-3">
              <p className="text-[11px] line-clamp-2 text-white/40">{item.prompt}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
