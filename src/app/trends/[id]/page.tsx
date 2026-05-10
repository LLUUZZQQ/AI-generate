"use client";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { HeatChart } from "@/components/trends/heat-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    queryFn: async () => { const res = await fetch(`/api/trends/${id}`); return res.json(); },
  });

  if (isLoading) return <div className="max-w-4xl mx-auto px-6 py-10"><Skeleton className="h-64 bg-white/[0.03] rounded-xl" /></div>;
  if (!data?.data) return <div className="max-w-4xl mx-auto px-6 py-10 text-center text-white/30">话题不存在</div>;

  const topic = data.data;
  const prediction = topic.aiPrediction as Record<string, string> | null;
  const contents = topic.contents as any[] | undefined;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      {/* Breadcrumb */}
      <Link href="/trends" className="text-xs text-white/30 hover:text-white/50 transition-colors mb-4 inline-block">← 返回趋势</Link>

      {/* Header */}
      <div className="glass rounded-xl p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-[10px] border-white/10 text-white/50">{categoryLabels[topic.category]}</Badge>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                topic.status === "peak" ? "text-amber-400 bg-amber-400/10" :
                topic.status === "rising" ? "text-emerald-400 bg-emerald-400/10" :
                "text-white/40 bg-white/5"
              }`}>
                {topic.status === "peak" ? "🔥 爆火" : topic.status === "rising" ? "📈 上升" : "📉 降温"}
              </span>
            </div>
            <h1 className="text-2xl font-bold mb-1">{topic.title}</h1>
            {topic.description && <p className="text-sm text-white/40">{topic.description}</p>}
          </div>
          <div className="text-right shrink-0">
            <div className="text-3xl font-bold text-purple-400">{topic.heatScore.toLocaleString()}</div>
            <div className="text-[10px] text-white/30">热度指数</div>
          </div>
        </div>
      </div>

      {/* Heat Chart */}
      <div className="glass rounded-xl p-6 mb-6">
        <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">热度变化趋势</h3>
        <HeatChart data={topic.heatHistory as any[]} />
      </div>

      {/* AI Prediction */}
      {prediction && (
        <div className="gradient-border mb-6">
          <div className="rounded-xl p-5 bg-white/[0.02]">
            <h3 className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-3">🤖 AI 趋势分析</h3>
            <p className="text-sm text-white/70 leading-relaxed mb-4">{prediction.summary}</p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {[
                { label: "趋势方向", value: trendLabels[prediction.trend] || prediction.trend },
                { label: "预计峰值", value: prediction.peak_in === "passed" ? "已过峰" : prediction.peak_in === "now" ? "当前即峰" : `约${prediction.peak_in}后` },
                { label: "竞争程度", value: competitionLabels[prediction.competition] || prediction.competition },
              ].map((item) => (
                <div key={item.label} className="glass rounded-lg p-3 text-center">
                  <div className="text-white/30 mb-0.5">{item.label}</div>
                  <div className="font-medium text-white/80">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Action */}
      <Button
        size="lg"
        className="w-full sm:w-auto mb-10 h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 border-0 shadow-lg shadow-purple-500/20"
        onClick={() => router.push(`/generate?topicId=${topic.id}`)}
      >
        以此话题生成内容
      </Button>

      {/* Related Content */}
      <div>
        <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">已生成的内容</h3>
        {contents && contents.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {contents.map((c: any) => (
              <Link key={c.id} href={`/library/${c.id}`} className="glass rounded-lg overflow-hidden hover:border-white/15 transition-all group">
                <div className="aspect-square bg-white/[0.02] flex items-center justify-center">
                  {c.thumbnailUrl ? (
                    <img src={c.thumbnailUrl} alt={c.prompt} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <span className="text-2xl">{c.type === "video" ? "🎬" : "🖼️"}</span>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-[11px] line-clamp-2 text-white/40">{c.prompt}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="glass rounded-xl p-8 text-center border-dashed">
            <div className="text-2xl mb-2">🎨</div>
            <p className="text-sm text-white/30 mb-3">还没有人为这个话题生成内容</p>
            <Button variant="outline" size="sm" className="border-white/10 text-white/50" onClick={() => router.push(`/generate?topicId=${topic.id}`)}>
              我来生成第一条
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
