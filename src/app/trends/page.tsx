"use client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { TrendCard } from "@/components/trends/trend-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["trends", category, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page) });
      if (category) params.set("category", category);
      const res = await fetch(`/api/trends?${params}`);
      return res.json();
    },
  });

  const allItems = data?.data?.list ?? [];
  const filteredItems = search.trim()
    ? allItems.filter((t: any) => t.title.toLowerCase().includes(search.toLowerCase()))
    : allItems;

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Page header */}
      <div className="mb-8">
        <p className="text-[11px] text-purple-400 font-semibold mb-2 tracking-widest uppercase">Discover</p>
        <h1 className="text-3xl font-bold tracking-tight">🔥 趋势发现</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-8">
        <div className="flex items-center gap-1.5 flex-1 p-1 rounded-full bg-white/[0.03] border border-white/[0.06] w-fit">
          {categoryTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => { setCategory(tab.value); setPage(1); }}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-full transition-all ${
                category === tab.value
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 text-xs">🔍</span>
          <Input
            placeholder="搜索话题..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 w-full sm:w-48 h-9 text-sm bg-white/[0.03] border-white/[0.08] rounded-full focus:border-purple-500/50 transition-colors"
          />
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass rounded-xl overflow-hidden animate-pulse">
              <Skeleton className="h-40 w-full bg-white/[0.03]" />
              <div className="p-4 space-y-3">
                <Skeleton className="h-3 w-16 bg-white/[0.05]" />
                <Skeleton className="h-4 w-3/4 bg-white/[0.05]" />
                <Skeleton className="h-4 w-1/3 bg-white/[0.05]" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-4xl mb-4">{search.trim() ? "🔍" : "📭"}</div>
          <p className="text-white/40 text-sm">
            {search.trim() ? "没有匹配的话题，试试其他关键词" : "暂无非话题数据"}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((t: any) => <TrendCard key={t.id} {...t} />)}
          </div>
          {search.trim() && (
            <p className="text-xs text-white/20 mb-4">找到 {filteredItems.length} 个结果</p>
          )}
          {data?.data && !search.trim() && (
            <div className="flex items-center justify-center gap-4 mt-10">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="border-white/10 text-white/50 hover:text-white hover:bg-white/5 rounded-full"
              >
                上一页
              </Button>
              <span className="text-xs text-white/30 tabular-nums">
                {page} / {Math.ceil(data.data.total / 20)}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page * 20 >= data.data.total}
                onClick={() => setPage(p => p + 1)}
                className="border-white/10 text-white/50 hover:text-white hover:bg-white/5 rounded-full"
              >
                下一页
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
