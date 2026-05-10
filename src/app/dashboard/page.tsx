"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["user-me"],
    queryFn: async () => {
      const res = await fetch("/api/user/me");
      return res.json();
    },
  });

  const user = data?.data?.user;
  const stats: Array<{ type: string; status: string; _count: number }> = data?.data?.stats ?? [];

  const imageCount = stats
    .filter((s) => s.type === "image" && s.status === "done")
    .reduce((sum, s) => sum + s._count, 0);

  const videoCount = stats
    .filter((s) => s.type === "video" && s.status === "done")
    .reduce((sum, s) => sum + s._count, 0);

  const totalGenerated = imageCount + videoCount;
  const isNewUser = totalGenerated === 0;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold mb-6">个人中心</h1>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-4 w-20" /></CardHeader>
              <CardContent><Skeleton className="h-8 w-16" /></CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 mb-8">
            <Card>
              <CardHeader><CardTitle>积分余额</CardTitle></CardHeader>
              <CardContent><p className="text-3xl font-bold">{user?.credits ?? 0}</p></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>图片生成</CardTitle></CardHeader>
              <CardContent><p className="text-3xl font-bold">{imageCount}</p></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>视频生成</CardTitle></CardHeader>
              <CardContent><p className="text-3xl font-bold">{videoCount}</p></CardContent>
            </Card>
          </div>

          {isNewUser ? (
            <Card className="mb-8 border-primary/30 bg-primary/5">
              <CardHeader>
                <CardTitle>🚀 快速开始</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4">
                    <div className="text-2xl mb-2">1️⃣</div>
                    <h3 className="font-semibold text-sm mb-1">浏览趋势</h3>
                    <p className="text-xs text-muted-foreground mb-3">发现当下最火的话题</p>
                    <Link href="/trends"><Button size="sm" variant="outline">去看看</Button></Link>
                  </div>
                  <div className="text-center p-4">
                    <div className="text-2xl mb-2">2️⃣</div>
                    <h3 className="font-semibold text-sm mb-1">选择话题生成</h3>
                    <p className="text-xs text-muted-foreground mb-3">AI 自动生成爆款图片/视频</p>
                    <Link href="/generate"><Button size="sm" variant="outline">开始创作</Button></Link>
                  </div>
                  <div className="text-center p-4">
                    <div className="text-2xl mb-2">3️⃣</div>
                    <h3 className="font-semibold text-sm mb-1">查看发布建议</h3>
                    <p className="text-xs text-muted-foreground mb-3">获取最佳发布时机和文案</p>
                    <Link href="/library"><Button size="sm" variant="outline">内容库</Button></Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="flex gap-3 mb-8">
              <Link href="/trends"><Button variant="default">浏览趋势</Button></Link>
              <Link href="/generate"><Button variant="secondary">立即生成</Button></Link>
              <Link href="/settings"><Button variant="outline">充值积分</Button></Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
