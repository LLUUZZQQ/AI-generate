"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ContentCard } from "@/components/library/content-card";

const typeTabs = [
  { label: "全部", value: "" },
  { label: "图片", value: "image" },
  { label: "视频", value: "video" },
];

export default function LibraryPage() {
  const [type, setType] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["library", type],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (type) params.set("type", type);
      const res = await fetch(`/api/library?${params}`);
      return res.json();
    },
  });

  const list = data?.data?.list ?? [];

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold mb-6">内容库</h1>

      <Tabs value={type} onValueChange={setType}>
        <TabsList className="mb-6">
          {typeTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-square w-full rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-4">📭</div>
          <h3 className="text-lg font-semibold mb-2">还没有生成内容</h3>
          <p className="text-sm text-muted-foreground mb-6">选择一个热门话题，用 AI 生成你的第一条爆款内容吧</p>
          <div className="flex gap-3 justify-center">
            <Link href="/trends"><Button variant="default">浏览趋势</Button></Link>
            <Link href="/generate"><Button variant="outline">直接生成</Button></Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {list.map((item: any) => (
            <ContentCard key={item.id} {...item} />
          ))}
        </div>
      )}
    </div>
  );
}
