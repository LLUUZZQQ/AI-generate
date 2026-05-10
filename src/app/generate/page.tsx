"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ModelSelector } from "@/components/generate/model-selector";
import { PromptInput } from "@/components/generate/prompt-input";
import { ProgressTracker } from "@/components/generate/progress-tracker";
import { toast } from "sonner";

export default function GeneratePage() {
  const searchParams = useSearchParams();
  const topicId = searchParams.get("topicId") || "";

  const [type, setType] = useState<"image" | "video">("image");
  const [modelId, setModelId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [taskId, setTaskId] = useState<string | null>(null);
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

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
        <Tabs value={type} onValueChange={(v) => { setType(v as "image" | "video"); setModelId(""); }}>
          <TabsList>
            <TabsTrigger value="image">图片</TabsTrigger>
            <TabsTrigger value="video">视频</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Model Selector */}
      <section className="mb-6">
        <h2 className="text-sm font-medium mb-3">选择模型</h2>
        <ModelSelector type={type} selected={modelId} onSelect={setModelId} />
      </section>

      {/* Prompt Input */}
      <section className="mb-8">
        <h2 className="text-sm font-medium mb-3">提示词</h2>
        <PromptInput
          prompt={prompt}
          onChange={setPrompt}
          negativePrompt={negativePrompt}
          onNegativeChange={setNegativePrompt}
        />
      </section>

      {/* Optional topic badge */}
      {topicId && (
        <p className="text-xs text-muted-foreground mb-4">
          关联话题 ID: <span className="font-mono">{topicId}</span>
        </p>
      )}

      {/* Submit */}
      <Button
        size="lg"
        className="w-full"
        disabled={submitting || !modelId || !prompt.trim()}
        onClick={handleSubmit}
      >
        {submitting ? "提交中..." : "开始生成"}
      </Button>
    </div>
  );
}
