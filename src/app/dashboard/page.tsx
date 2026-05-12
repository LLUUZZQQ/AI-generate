"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Coins, Image as ImageIcon, ArrowRight, CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react";

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["user-me"],
    queryFn: async () => { const res = await fetch("/api/user/me"); return res.json(); },
  });
  const user = data?.data?.user;

  const { data: tasksData } = useQuery({
    queryKey: ["bg-tasks", "recent"],
    queryFn: async () => { const res = await fetch("/api/background-replace?pageSize=6"); return res.json(); },
  });
  const tasks = tasksData?.data?.list ?? [];

  const statusIcon = (status: string) => {
    switch (status) {
      case "done": return <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />;
      case "failed": return <XCircle className="w-3.5 h-3.5 text-red-400" />;
      case "processing": return <Loader2 className="w-3.5 h-3.5 text-yellow-400 animate-spin" />;
      default: return <Clock className="w-3.5 h-3.5 text-white/25" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 md:py-14">
      <h1 className="text-2xl font-semibold tracking-tight mb-8">我的</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-10">
        <Card className="p-5 border-border bg-white/[0.02]">
          <p className="text-xs text-foreground/30 mb-1.5">积分余额</p>
          {isLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <p className="text-2xl font-bold text-purple-400 tabular-nums">{user?.credits ?? 0}</p>
          )}
          <Link href="/settings" className="text-xs text-purple-400 hover:text-purple-300 mt-2 inline-block">
            充值 →
          </Link>
        </Card>

        <Card className="p-5 border-border bg-white/[0.02]">
          <p className="text-xs text-foreground/30 mb-1.5">已处理任务</p>
          <p className="text-2xl font-bold text-emerald-400 tabular-nums">{tasks.length}</p>
          <Link href="/background-replace" className="text-xs text-emerald-400 hover:text-emerald-300 mt-2 inline-block">
            查看全部 →
          </Link>
        </Card>
      </div>

      {/* Quick action */}
      <div className="mb-10">
        <Link href="/background-replace/new">
          <Card className="p-6 border-purple-500/20 bg-purple-500/[0.04] hover:bg-purple-500/[0.08] transition-all cursor-pointer group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/15 flex items-center justify-center shrink-0">
                <ImageIcon className="w-6 h-6 text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm mb-0.5 group-hover:text-purple-300 transition-colors">新建背景替换任务</h3>
                <p className="text-xs text-foreground/30">上传产品照片，一键替换真实背景 · ¥0.10/张</p>
              </div>
              <ArrowRight className="w-5 h-5 text-foreground/15 group-hover:text-purple-400 transition-all group-hover:translate-x-1" />
            </div>
          </Card>
        </Link>
      </div>

      {/* Recent tasks */}
      <div>
        <h3 className="text-sm font-medium text-foreground/50 mb-4">最近任务</h3>
        {tasks.length === 0 ? (
          <Card className="p-8 text-center border-border bg-white/[0.02]">
            <ImageIcon className="w-10 h-10 mx-auto mb-3 text-foreground/10" />
            <p className="text-xs text-foreground/30">还没有处理任务</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {tasks.map((task: any) => (
              <Link key={task.id} href={`/background-replace/${task.id}`}>
                <Card className="p-4 border-border bg-white/[0.02] hover:bg-white/[0.04] transition-all cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      {task.results?.slice(0, 3).map((r: any) => (
                        <div key={r.id} className="w-11 h-11 rounded-lg overflow-hidden bg-white/[0.03] border border-border">
                          {r.resultKey ? (
                            <img src={r.resultKey.startsWith("http") ? r.resultKey : `/api/s3/${r.resultKey}`} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-foreground/8"><ImageIcon className="w-4 h-4" /></div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-foreground/60">{task.imageCount} 张</span>
                        <Badge variant="outline" className="text-[10px] border-border text-foreground/30">
                          {task.backgroundMode === "ai" ? "AI" : task.backgroundMode === "preset" ? "模板" : "自定义"}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-foreground/20 mt-0.5">{new Date(task.createdAt).toLocaleString("zh-CN")}</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-foreground/30">
                      {statusIcon(task.status)}
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
