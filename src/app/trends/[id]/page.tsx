"use client";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { HeatChart } from "@/components/trends/heat-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

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
  if (!data?.data) return <div className="max-w-4xl mx-auto px-6 py-8"><p>话题不存在</p></div>;

  const topic = data.data;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">{topic.title}</h1>
          <p className="text-muted-foreground">{topic.description}</p>
        </div>
        <Badge variant="default" className="text-lg px-4 py-2">{topic.heatScore} 热度</Badge>
      </div>

      <div className="bg-card rounded-lg p-6 mb-8">
        <h3 className="text-sm font-medium mb-4">热度变化趋势</h3>
        <HeatChart data={topic.heatHistory as any[]} />
      </div>

      {topic.aiPrediction && (
        <div className="bg-orange-50 dark:bg-orange-950 rounded-lg p-4 mb-8">
          <h3 className="text-sm font-medium mb-1">🤖 AI 趋势预判</h3>
          <p className="text-sm">{(topic.aiPrediction as any).summary}</p>
        </div>
      )}

      <Button size="lg" onClick={() => router.push(`/generate?topicId=${topic.id}`)}>
        以此话题生成内容
      </Button>
    </div>
  );
}
