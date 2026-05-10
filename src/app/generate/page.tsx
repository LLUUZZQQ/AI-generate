"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
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
    queryFn: async () => { const res = await fetch(`/api/trends/${topicId}`); return res.json(); },
    enabled: !!topicId,
  });
  const topicTitle = topicData?.data?.title || "";

  const handleSubmit = async () => {
    if (!modelId) { toast.error("请选择一个模型"); return; }
    if (!prompt.trim()) { toast.error("请输入提示词"); return; }
    if (!topicId) { toast.error("缺少话题 ID"); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId, modelId, type, prompt: prompt.trim(), params: { ...(negativePrompt.trim() ? { negativePrompt: negativePrompt.trim() } : {}) } }),
      });
      const json = await res.json();
      if (json.code !== 0) { toast.error(json.message || "生成失败"); return; }
      setTaskId(json.data.taskId);
    } catch { toast.error("网络错误，请重试"); }
    finally { setSubmitting(false); }
  };

  const handleComplete = (_result: any) => {
    toast.success("内容生成完成！");
    router.push(`/library/${taskId}`);
  };

  if (taskId) {
    return (
      <div className="max-w-lg mx-auto px-6 py-12">
        <ProgressTracker taskId={taskId} onComplete={handleComplete} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="mb-8">
        <p className="text-[11px] text-purple-400 font-semibold mb-2 tracking-widest uppercase">Create</p>
        <h1 className="text-3xl font-bold tracking-tight">AI 内容生成</h1>
      </div>

      {/* Type Switch */}
      <div className="flex gap-1 p-1 rounded-full bg-white/[0.03] border border-white/[0.06] w-fit mb-8">
        {(["image", "video"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setType(t); setModelId(""); setCostPerGen(0); }}
            className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all ${type === t ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white/70"}`}
          >
            {t === "image" ? "🖼️ 图片" : "🎬 视频"}
          </button>
        ))}
      </div>

      {/* Model Selector */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">选择模型</h2>
        <ModelSelector type={type} selected={modelId} onSelect={(id, cost) => { setModelId(id); setCostPerGen(cost); }} />
      </section>

      {/* Prompt Input */}
      <section className="mb-4">
        <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">提示词</h2>
        <PromptInput prompt={prompt} onChange={setPrompt} negativePrompt={negativePrompt} onNegativeChange={setNegativePrompt} />
      </section>

      {/* Prompt Templates */}
      <section className="mb-6">
        <div className="flex gap-1.5 flex-wrap">
          {["赛博朋克，霓虹都市", "治愈温暖，电影质感", "国风水墨，古韵意境", "3D卡通，高饱和", "极简构图，高级感", "未来科技，光影对比"].map((tpl) => (
            <button
              key={tpl}
              type="button"
              className="text-[11px] px-3 py-1 rounded-full border border-white/[0.06] text-white/40 hover:border-purple-500/30 hover:text-purple-300 transition-all bg-white/[0.02]"
              onClick={() => setPrompt((p) => p ? `${p}，${tpl}` : tpl)}
            >
              {tpl}
            </button>
          ))}
        </div>
      </section>

      {/* Topic info */}
      {topicId && (
        <div className="flex items-center gap-2 text-sm mb-4 p-3 glass rounded-lg">
          <span className="text-white/30 text-xs">关联话题</span>
          {topicTitle ? <span className="text-sm font-medium">{topicTitle}</span> : <Skeleton className="h-4 w-24 bg-white/[0.05]" />}
          <Link href={`/trends/${topicId}`} className="text-[11px] text-purple-400 hover:text-purple-300 ml-auto">查看 →</Link>
        </div>
      )}

      {/* Credits + Cost */}
      <div className="glass rounded-lg p-4 mb-3 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/40">积分余额</span>
          <span className="font-semibold">{credits.toLocaleString()}</span>
        </div>
        {modelId && costPerGen > 0 && (
          <div className={`flex items-center justify-between text-sm pt-3 border-t ${credits < costPerGen ? "border-red-500/20 text-red-400" : "border-white/[0.06]"}`}>
            <span>{credits < costPerGen ? "⚠️ 积分不足" : "本次消耗"}</span>
            <span className="font-semibold">{costPerGen} 积分</span>
          </div>
        )}
      </div>

      {/* Submit */}
      <Button
        size="lg"
        className="w-full h-12 text-base bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 border-0 shadow-lg shadow-purple-500/20 disabled:opacity-30 disabled:shadow-none"
        disabled={submitting || !modelId || !prompt.trim() || credits < costPerGen}
        onClick={handleSubmit}
      >
        {credits < costPerGen && modelId ? "积分不足，请先充值" : submitting ? "提交中..." : "开始生成"}
      </Button>
    </div>
  );
}
