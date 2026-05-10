"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface Model {
  id: string;
  name: string;
  type: string;
  provider: string;
  costPerGen: number;
  isActive: boolean;
}

interface ModelSelectorProps {
  type: "image" | "video";
  selected: string;
  onSelect: (id: string) => void;
}

export function ModelSelector({ type, selected, onSelect }: ModelSelectorProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["models", type],
    queryFn: async () => {
      const res = await fetch("/api/models");
      const json = await res.json();
      if (json.code !== 0) throw new Error(json.message || "获取模型列表失败");
      return json.data as Model[];
    },
  });

  const filteredModels = (data ?? []).filter((m) => m.type === type);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-destructive">加载模型失败: {(error as Error).message}</p>
    );
  }

  if (filteredModels.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">暂无可用的{type === "image" ? "图片" : "视频"}生成模型</p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {filteredModels.map((model) => (
        <Card
          key={model.id}
          size="sm"
          className={cn(
            "cursor-pointer transition-all hover:ring-2 hover:ring-primary/50",
            selected === model.id && "ring-2 ring-primary border-primary"
          )}
          onClick={() => onSelect(model.id)}
        >
          <CardContent className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">{model.name}</p>
              <p className="text-xs text-muted-foreground">{model.provider}</p>
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {model.costPerGen} 积分/次
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
