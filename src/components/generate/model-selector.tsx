"use client";

import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

interface Model {
  id: string; name: string; type: string; provider: string; costPerGen: number; isActive: boolean;
}

interface ModelSelectorProps {
  type: "image" | "video";
  selected: string;
  onSelect: (id: string, cost: number) => void;
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

  const models = (data ?? []).filter((m) => m.type === type);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-2">
        {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg bg-white/[0.03]" />)}
      </div>
    );
  }

  if (error) return <p className="text-sm text-red-400">加载失败: {(error as Error).message}</p>;
  if (models.length === 0) return <p className="text-sm text-white/30">暂无可用的{type === "image" ? "图片" : "视频"}生成模型</p>;

  return (
    <div className="grid grid-cols-1 gap-2">
      {models.map((model) => {
        const isSelected = selected === model.id;
        return (
          <button
            key={model.id}
            onClick={() => onSelect(model.id, model.costPerGen)}
            className={`w-full text-left p-4 rounded-xl transition-all duration-200 ${
              isSelected
                ? "gradient-border bg-white/[0.06]"
                : "glass hover:border-white/12"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-semibold mb-0.5 ${isSelected ? "text-purple-300" : ""}`}>{model.name}</p>
                <p className="text-[11px] text-white/30">{model.provider}</p>
              </div>
              <div className="text-right">
                <span className={`text-sm font-bold ${isSelected ? "text-purple-400" : "text-white/50"}`}>{model.costPerGen}</span>
                <span className="text-[10px] text-white/30 ml-0.5">积分/次</span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
