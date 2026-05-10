"use client";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { HeatChart } from "@/components/trends/heat-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const categoryLabels: Record<string, string> = {
  challenge: "挑战赛", music: "BGM", hashtag: "话题", event: "事件",
};

const trendLabels: Record<string, string> = {
  strong_up: "🚀 强势上升", up: "📈 持续上升", stable: "📊 保持稳定",
  slow_up: "🐢 缓慢上升", down: "📉 热度下降",
};

const competitionLabels: Record<string, string> = {
  high: "激烈", medium: "适中", low: "较低",
};

export default function TrendDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ["trend", id],
    queryFn: async () => {
      const res = await fetch(`/api/trends/${id}`);
      return res.json();
    },
  });

  if (isLoading) return <div className="max-w-4xl mx-auto px-6 py-8"><Skeleton className="h-64" /></div>;
  if (!data?.data) return <div className="max-w-4xl mx-auto px-6 py-8"><p className="text-center text-muted-foreground py-12">话题不存在</p></div>;

  const topic = data.data;
  const prediction = topic.aiPrediction as Record<string, string> | null;
  const contents = topic.contents as any[] | undefined;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline">{categoryLabels[topic.category] || topic.category}</Badge>
            <Badge variant={topic.status === "peak" ? "default" : "secondary"}>
              {topic.status === "rising" ? "📈 上升" : topic.status === "peak" ? "🔥 爆火" : "📉 降温"}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold mb-1">{topic.title}</h1>
          {topic.description && <p className="text-muted-foreground">{topic.description}</p>}
        </div>
        <div className="text-right shrink-0">
          <div className="text-3xl font-bold text-orange-500">{topic.heatScore.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">热度指数</div>
        </div>
      </div>

      {/* Heat Chart */}
      <div className="bg-card rounded-lg p-6 mb-6">
        <h3 className="text-sm font-medium mb-4">热度变化趋势</h3>
        <HeatChart data={topic.heatHistory as any[]} />
      </div>

      {/* AI Prediction */}
      {prediction && (
        <div className="bg-orange-50 dark:bg-orange-950/50 rounded-lg p-5 mb-6">
          <h3 className="text-sm font-semibold mb-3">🤖 AI 趋势分析</h3>
          <p className="text-sm mb-3">{prediction.summary}</p>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="bg-white/80 dark:bg-black/20 rounded p-2 text-center">
              <div className="text-muted-foreground mb-0.5">趋势方向</div>
              <div className="font-semibold">{trendLabels[prediction.trend] || prediction.trend}</div>
            </div>
            <div className="bg-white/80 dark:bg-black/20 rounded p-2 text-center">
              <div className="text-muted-foreground mb-0.5">预计峰值</div>
              <div className="font-semibold">{prediction.peak_in === "passed" ? "已过峰" : prediction.peak_in === "now" ? "当前即峰" : `约${prediction.peak_in}后`}</div>
            </div>
            <div className="bg-white/80 dark:bg-black/20 rounded p-2 text-center">
              <div className="text-muted-foreground mb-0.5">竞争程度</div>
              <div className="font-semibold">{competitionLabels[prediction.competition] || prediction.competition}</div>
            </div>
          </div>
        </div>
      )}

      {/* Action */}
      <div className="mb-8">
        <Button size="lg" className="w-full sm:w-auto" onClick={() => router.push(`/generate?topicId=${topic.id}`)}>
          以此话题生成内容
        </Button>
      </div>

      {/* Related Content */}
      {contents && contents.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">已生成的内容</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {contents.map((c: any) => (
              <Link key={c.id} href={`/library/${c.id}`}>
                <Card className="hover:shadow-md transition-shadow overflow-hidden">
                  <div className="aspect-square bg-muted">
                    {c.thumbnailUrl ? (
                      <img src={c.thumbnailUrl} alt={c.prompt} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">
                        {c.type === "video" ? "🎬" : "🖼️"}
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <p className="text-xs line-clamp-2 text-muted-foreground">{c.prompt}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
