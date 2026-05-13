"use client";
import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Coins, Image as ImageIcon, ArrowRight, CheckCircle2, XCircle,
  Clock, Loader2, Download, Trash2, FileText, LayoutGrid,
  TrendingUp, CalendarDays, Sparkles, ChevronRight,
} from "lucide-react";

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: userData } = useQuery({
    queryKey: ["user-me"],
    queryFn: async () => { const res = await fetch("/api/user/me"); return res.json(); },
  });
  const user = userData?.data?.user;

  const { data: statsData } = useQuery({
    queryKey: ["user-stats"],
    queryFn: async () => { const res = await fetch("/api/user/stats"); return res.json(); },
  });
  const stats = statsData?.data;

  const [presets, setPresets] = useState<any[]>([]);
  useEffect(() => {
    try { const raw = localStorage.getItem("framecraft_saved_bgs"); if (raw) setPresets(JSON.parse(raw)); }
    catch {}
  }, []);

  const { data: tasksData } = useQuery({
    queryKey: ["bg-tasks", "recent"],
    queryFn: async () => { const res = await fetch("/api/background-replace?pageSize=50"); return res.json(); },
  });
  const tasks = tasksData?.data?.list ?? [];

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await fetch("/api/background-replace", { method: "DELETE", body: JSON.stringify({ ids }) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bg-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["user-stats"] });
      setSelected(new Set());
    },
  });

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (selected.size === tasks.length) { setSelected(new Set()); return; }
    setSelected(new Set(tasks.map((t: any) => t.id)));
  }, [tasks, selected.size]);

  const statusIcon = (status: string) => {
    switch (status) {
      case "done": return <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />;
      case "failed": return <XCircle className="w-3.5 h-3.5 text-red-400" />;
      case "processing": return <Loader2 className="w-3.5 h-3.5 text-yellow-400 animate-spin" />;
      default: return <Clock className="w-3.5 h-3.5 text-white/25" />;
    }
  };

  const exportCSV = () => {
    const header = "日期,图片数,背景模式,消耗积分,状态\n";
    const rows = tasks.map((t: any) =>
      `${new Date(t.createdAt).toLocaleDateString("zh-CN")},${t.imageCount},${t.backgroundMode === "ai" ? "AI" : t.backgroundMode === "preset" ? "模板" : "自定义"},${t.cost},${t.status}`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "FrameCraft-任务记录.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const resultUrl = (key: string | null) => {
    if (!key) return "";
    if (key.startsWith("http")) return `/api/s3/${new URL(key).pathname.substring(1).replace(/^ai-gen-content\//, "")}?v=2`;
    return `/api/s3/${key}?v=2`;
  };

  const StatCard = ({ icon: Icon, label, value, color, sub }: any) => (
    <Card className="p-5 border-border bg-white/[0.02] hover:bg-white/[0.04] transition-all group">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <p className="text-xs text-foreground/30">{label}</p>
      </div>
      <p className="text-2xl font-bold tabular-nums mb-0.5" style={{ color }}>{value ?? <Skeleton className="h-7 w-16 inline-block" />}</p>
      {sub && <p className="text-[10px] text-foreground/18">{sub}</p>}
    </Card>
  );

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 md:py-14">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">工作台</h1>
          <p className="text-sm text-white/50 mt-1">
            你好，<span className="font-semibold text-white/70">{user?.name ?? user?.email ?? "..."}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 px-3 text-xs border-border hover:bg-white/[0.03]" onClick={exportCSV}>
            <FileText className="w-3.5 h-3.5 mr-1.5" /> 导出 CSV
          </Button>
          <Link href="/background-replace/new">
            <Button size="sm" className="h-8 px-4 text-xs bg-purple-500 hover:bg-purple-600 border-0 rounded-lg">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" /> 新建任务
            </Button>
          </Link>
        </div>
      </div>

      {/* ======== STATS GRID ======== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        <StatCard icon={Coins} label="积分余额" value={user?.credits ?? 0} color="#b57bee" sub={<Link href="/settings" className="hover:text-purple-400 transition-colors">充值 →</Link>} />
        <StatCard icon={CalendarDays} label="本月任务" value={stats?.monthTasks ?? 0} color="#60a5fa" />
        <StatCard icon={ImageIcon} label="累计处理" value={`${stats?.totalImages ?? 0} 张`} color="#34d399" sub={`${stats?.completedTasks ?? 0} 个任务已完成`} />
        <StatCard icon={TrendingUp} label="本月消耗" value={`${stats?.monthSpent ?? 0} 积分`} color="#f87171" />
      </div>

      {/* ======== QUICK TEMPLATES ======== */}
      {presets.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-foreground/50 flex items-center gap-2">
              <LayoutGrid className="w-3.5 h-3.5" /> 快捷预设
            </h3>
            <Link href="/background-replace/new" className="text-[10px] text-foreground/20 hover:text-foreground/40 transition-colors flex items-center gap-0.5">
              查看全部 <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {presets.slice(0, 4).map((p: any) => (
              <Link key={p.key} href="/background-replace/new">
                <Card className="p-3 border-border bg-white/[0.02] hover:bg-white/[0.05] transition-all cursor-pointer group h-full">
                  <div className="aspect-[4/3] rounded-lg overflow-hidden bg-white/[0.03] mb-3 border border-white/[0.04]">
                    {p.url ? (
                      <img src={p.url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={p.name} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-foreground/8"><ImageIcon className="w-6 h-6" /></div>
                    )}
                  </div>
                  <p className="text-xs font-medium truncate">{p.name}</p>
                  <p className="text-[10px] text-foreground/25 mt-0.5">我的预设</p>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ======== RESULT GALLERY ======== */}
      {stats?.recentResults?.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-foreground/50 flex items-center gap-2">
              <Download className="w-3.5 h-3.5" /> 处理结果
            </h3>
            <Link href="/background-replace" className="text-[10px] text-foreground/20 hover:text-foreground/40 transition-colors flex items-center gap-0.5">
              全部任务 <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {stats.recentResults.map((r: any) => (
              <Link key={r.id} href={`/background-replace/${r.taskId}`}>
                <div className="aspect-square rounded-xl overflow-hidden bg-white/[0.02] border border-white/[0.04] hover:border-purple-500/20 transition-all cursor-pointer group">
                  <img
                    src={resultUrl(r.resultKey)}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-400"
                    alt=""
                    loading="lazy"
                  />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ======== RECENT TASKS WITH BATCH ======== */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-foreground/50 flex items-center gap-2">
            <FileText className="w-3.5 h-3.5" /> 最近任务
          </h3>
          {tasks.length > 0 && (
            <button onClick={selectAll} className="text-[10px] text-foreground/20 hover:text-foreground/40 transition-colors">
              {selected.size === tasks.length ? "取消全选" : "全选"}
            </button>
          )}
        </div>

        {tasks.length === 0 ? (
          <Card className="p-8 text-center border-border bg-white/[0.02]">
            <ImageIcon className="w-10 h-10 mx-auto mb-3 text-foreground/10" />
            <p className="text-xs text-foreground/30">还没有处理任务</p>
            <Link href="/background-replace/new">
              <Button variant="outline" size="sm" className="mt-4 h-8 rounded-lg text-xs">创建第一个任务</Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-1.5">
            {tasks.slice(0, 20).map((task: any) => (
              <div key={task.id} className="flex items-center gap-3 group">
                {/* Checkbox */}
                <button
                  onClick={() => toggleSelect(task.id)}
                  className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                    selected.has(task.id)
                      ? "bg-purple-500 border-purple-500 text-white"
                      : "border-white/[0.08] hover:border-white/[0.15] opacity-0 group-hover:opacity-100"
                  }`}
                >
                  {selected.has(task.id) && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  )}
                </button>

                <Link href={`/background-replace/${task.id}`} className="flex-1 min-w-0">
                  <Card className="p-3 border-border bg-white/[0.02] hover:bg-white/[0.04] transition-all cursor-pointer">
                    <div className="flex items-center gap-3">
                      {/* Thumbnails */}
                      <div className="flex gap-1 shrink-0">
                        {task.results?.slice(0, 3).map((r: any) => (
                          <div key={r.id} className="w-10 h-10 rounded-lg overflow-hidden bg-white/[0.03] border border-white/[0.05]">
                            {r.resultKey ? (
                              <img src={resultUrl(r.resultKey)} className="w-full h-full object-cover" alt="" loading="lazy" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-foreground/8"><ImageIcon className="w-3.5 h-3.5" /></div>
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
                          <span className="text-[10px] text-foreground/15">{task.cost} 积分</span>
                        </div>
                        <p className="text-[10px] text-foreground/20 mt-0.5">
                          {new Date(task.createdAt).toLocaleString("zh-CN")}
                        </p>
                      </div>
                      <div className="shrink-0">{statusIcon(task.status)}</div>
                    </div>
                  </Card>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ======== BATCH ACTION BAR ======== */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 inset-x-0 flex justify-center z-50 pointer-events-none">
          <div className="glass !rounded-2xl px-5 py-3 flex items-center gap-4 shadow-2xl pointer-events-auto border border-white/[0.08] bg-background/90 backdrop-blur-xl">
            <span className="text-xs text-foreground/40">已选 {selected.size} 项</span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs border-border hover:bg-white/[0.03]"
              onClick={() => {
                setSelected(new Set());
              }}
            >
              取消
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs border-red-500/20 text-red-400 hover:bg-red-500/10"
              onClick={() => {
                if (confirm(`确定删除 ${selected.size} 个任务？`)) {
                  deleteMutation.mutate(Array.from(selected));
                }
              }}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              {deleteMutation.isPending ? "删除中..." : "删除"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
