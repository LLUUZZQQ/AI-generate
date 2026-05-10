"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ModelSelector } from "@/components/generate/model-selector";
import { PromptInput } from "@/components/generate/prompt-input";
import { ProgressTracker } from "@/components/generate/progress-tracker";
import { toast } from "sonner";

export default function GeneratePage() {
  const searchParams = useSearchParams();
  const topicId = searchParams.get("topicId") || "";

  const [type, setType] = useState<"image" | "video">("image");
  const [modelId, setModelId] = useState("");
  const [costPerGen, setCostPerGen] = useState(0);
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [taskId, setTaskId] = useState<string | null>(null);
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const { data: userData } = useQuery({
    queryKey: ["user-me"],
    queryFn: async () => { const res = await fetch("/api/user/me"); return res.json(); },
  });
  const credits = userData?.data?.user?.credits ?? 0;

  const { data: topicData } = useQuery({
    queryKey: ["trend", topicId],
    queryFn: async () => {
      const res = await fetch(`/api/trends/${topicId}`);
      return res.json();
    },
    enabled: !!topicId,
  });
  const topicTitle = topicData?.data?.title || "";

  const handleSubmit = async () => {
    if (!modelId) {
      toast.error("请选择一个模型");
      return;
    }
    if (!prompt.trim()) {
      toast.error("请输入提示词");
      return;
    }
    if (!topicId) {
      toast.error("缺少话题 ID");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicId,
          modelId,
          type,
          prompt: prompt.trim(),
          params: {
            ...(negativePrompt.trim() ? { negativePrompt: negativePrompt.trim() } : {}),
          },
        }),
      });

      const json = await res.json();

      if (json.code !== 0) {
        toast.error(json.message || "生成失败");
        return;
      }

      setTaskId(json.data.taskId);
    } catch (err) {
      toast.error("网络错误，请重试");
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = (result: any) => {
    toast.success("内容生成完成！");
    router.push(`/library/${taskId}`);
  };

  // If a task is in progress, show the progress tracker
  if (taskId) {
    return (
      <div className="max-w-lg mx-auto px-6 py-8">
        <ProgressTracker taskId={taskId} onComplete={handleComplete} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold mb-6">AI 内容生成</h1>

      {/* Type Tabs */}
      <div className="mb-6">
        <Tabs value={type} onValueChange={(v) => { setType(v as "image" | "video"); setModelId(""); setCostPerGen(0); }}>
          <TabsList>
            <TabsTrigger value="image">图片</TabsTrigger>
            <TabsTrigger value="video">视频</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Model Selector */}
      <section className="mb-6">
        <h2 className="text-sm font-medium mb-3">选择模型</h2>
        <ModelSelector type={type} selected={modelId} onSelect={(id, cost) => { setModelId(id); setCostPerGen(cost); }} />
      </section>

      {/* Prompt Input */}
      <section className="mb-4">
        <h2 className="text-sm font-medium mb-3">提示词</h2>
        <PromptInput
          prompt={prompt}
          onChange={setPrompt}
          negativePrompt={negativePrompt}
          onNegativeChange={setNegativePrompt}
        />
      </section>

      {/* Prompt Templates */}
      <section className="mb-6">
        <div className="flex gap-2 flex-wrap">
          {[
            "赛博朋克风格，霓虹灯，未来都市",
            "治愈系画面，温暖阳光，柔和色调",
            "国风插画，水墨画风，古韵意境",
            "3D卡通角色，可爱风格，高饱和度",
            "电影质感，光影对比，景深虚化",
            "极简构图，大面积留白，高级感",
          ].map((tpl) => (
            <button
              key={tpl}
              type="button"
              className="text-xs px-2 py-1 rounded-full border hover:border-primary hover:text-primary transition-colors"
              onClick={() => setPrompt((p) => p ? `${p}，${tpl}` : tpl)}
            >
              {tpl}
            </button>
          ))}
        </div>
      </section>

      {/* Topic info */}
      {topicId && (
        <div className="flex items-center gap-2 text-sm mb-4 p-3 bg-primary/5 rounded-lg">
          <span className="text-muted-foreground">关联话题：</span>
          {topicTitle ? (
            <span className="font-medium">{topicTitle}</span>
          ) : (
            <Skeleton className="h-4 w-24" />
          )}
          <Link href={`/trends/${topicId}`} className="text-xs text-primary hover:underline ml-auto">查看详情 →</Link>
        </div>
      )}

      {/* Credits + Cost summary */}
      <div className="flex items-center justify-between text-sm mb-4 p-3 bg-muted/50 rounded-lg">
        <span className="text-muted-foreground">积分余额</span>
        <span className="font-bold">{credits}</span>
      </div>
      {modelId && costPerGen > 0 && (
        <div className={`flex items-center justify-between text-sm mb-4 p-3 rounded-lg ${credits < costPerGen ? "bg-destructive/10 text-destructive" : "bg-muted/50"}`}>
          <span>{credits < costPerGen ? "⚠️ 积分不足" : "本次消耗"}</span>
          <span className="font-bold">{costPerGen} 积分</span>
        </div>
      )}

      {/* Submit */}
      <Button
        size="lg"
        className="w-full"
        disabled={submitting || !modelId || !prompt.trim() || credits < costPerGen}
        onClick={handleSubmit}
      >
        {credits < costPerGen && modelId
          ? "积分不足，请先充值"
          : submitting
          ? "提交中..."
          : `开始生成${costPerGen > 0 ? ` · ${costPerGen} 积分` : ""}`}
      </Button>

    </div>
  );
}
