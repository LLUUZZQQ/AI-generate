import Link from "next/link";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Plus, Image as ImageIcon, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BgReplacePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const tasks = await prisma.bgReplaceTask.findMany({
    where: { userId: session.user.id },
    include: { results: { take: 3, orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const statusIcon = (status: string) => {
    switch (status) {
      case "done": return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case "failed": return <XCircle className="w-4 h-4 text-red-400" />;
      case "processing": return <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />;
      default: return <Clock className="w-4 h-4 text-white/30" />;
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "done": return "已完成";
      case "failed": return "失败";
      case "processing": return "处理中";
      default: return "排队中";
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">背景替换</h1>
          <p className="text-sm text-white/40">为产品照片替换真实背景，每张 ¥0.10</p>
        </div>
        <Link href="/background-replace/new">
          <Button size="sm" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 border-0">
            <Plus className="w-4 h-4 mr-1" /> 新建任务
          </Button>
        </Link>
      </div>

      {tasks.length === 0 ? (
        <Card className="p-12 text-center border-white/[0.08] bg-white/[0.02]">
          <ImageIcon className="w-12 h-12 mx-auto mb-4 text-white/15" />
          <p className="text-white/40 mb-4">还没有处理任务</p>
          <Link href="/background-replace/new">
            <Button variant="outline" size="sm" className="border-purple-400/30 text-purple-400">
              <Plus className="w-4 h-4 mr-1" /> 创建第一个任务
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <Link key={task.id} href={`/background-replace/${task.id}`}>
              <Card className="p-4 border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.12] transition-all cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="flex gap-1.5">
                    {task.results.slice(0, 3).map((r) => (
                      <div key={r.id} className="w-14 h-14 rounded-lg overflow-hidden bg-white/[0.04] border border-white/[0.06]">
                        {r.resultKey ? (
                          <img src={r.resultKey.startsWith("http") ? r.resultKey : `/uploads/${r.resultKey}`} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white/10">
                            <ImageIcon className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                    ))}
                    {task.imageCount > 3 && (
                      <div className="w-14 h-14 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                        <span className="text-xs text-white/30">+{task.imageCount - 3}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm text-white/70">{task.imageCount} 张照片</span>
                      <Badge variant="outline" className="text-[10px] border-white/[0.08] text-white/40">
                        {task.backgroundMode === "ai" ? "AI生成" : task.backgroundMode === "preset" ? "预设模板" : "自定义"}
                      </Badge>
                    </div>
                    <p className="text-xs text-white/30">{new Date(task.createdAt).toLocaleString("zh-CN")}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {statusIcon(task.status)}
                    <span className="text-white/40">{statusLabel(task.status)}</span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
