"use client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { TrendCard } from "@/components/trends/trend-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const categoryTabs = [
  { label: "全部", value: "" },
  { label: "挑战赛", value: "challenge" },
  { label: "BGM", value: "music" },
  { label: "话题", value: "hashtag" },
  { label: "事件", value: "event" },
];

export default function TrendsPage() {
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["trends", category, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page) });
      if (category) params.set("category", category);
      const res = await fetch(`/api/trends?${params}`);
      return res.json();
    },
  });

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center gap-2 mb-6">
        {categoryTabs.map((tab) => (
          <Button
            key={tab.value}
            variant={category === tab.value ? "default" : "outline"}
            size="sm"
            onClick={() => { setCategory(tab.value); setPage(1); }}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data?.data?.list?.map((t: any) => <TrendCard key={t.id} {...t} />)}
          </div>
          {data?.data && (
            <div className="flex items-center justify-center gap-4 mt-8">
              <Button variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</Button>
              <span className="text-sm text-muted-foreground">第 {page} 页 / 共 {Math.ceil(data.data.total / 20)} 页</span>
              <Button variant="outline" disabled={page * 20 >= data.data.total} onClick={() => setPage(p => p + 1)}>下一页</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
