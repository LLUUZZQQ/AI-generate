"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Coins, Loader2, Sparkles, Upload, Palette, CheckCircle2, HelpCircle } from "lucide-react";
import { useOnboarding } from "@/components/user/onboarding-tour";
import { Button } from "@/components/ui/button";
import { UploadZone } from "@/components/background-replace/upload-zone";
import { BgSelector } from "@/components/background-replace/bg-selector";
import { toast } from "sonner";

const steps = [
  { id: 1, icon: Upload, label: "上传照片" },
  { id: 2, icon: Palette, label: "选择背景" },
  { id: 3, icon: CheckCircle2, label: "确认提交" },
] as const;

export default function NewBgReplacePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [files, setFiles] = useState<File[]>([]);
  const [mode, setMode] = useState<"ai" | "preset" | "custom">("preset");
  const [selectedBgIds, setSelectedBgIds] = useState<string[]>([]);

  const toggleBg = (id: string) => {
    setSelectedBgIds((prev) =>
      prev.includes(id) ? prev.filter((bid) => bid !== id) : [...prev, id]
    );
  };
  const [aiPrompt, setAiPrompt] = useState("");
  const [customBgFile, setCustomBgFile] = useState<File | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [aiModel, setAiModel] = useState("google/gemini-3.1-flash-image-preview");
  const [submitting, setSubmitting] = useState(false);
  const [recommendedIds, setRecommendedIds] = useState<string[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const { start, TourModal } = useOnboarding();

  // Analyze product when entering step 2
  useEffect(() => {
    if (step === 2 && files.length > 0 && recommendedIds.length === 0) {
      analyzeFirstImage();
    }
  }, [step]);

  const analyzeFirstImage = async () => {
    if (files.length === 0) return;
    setAnalyzing(true);
    try {
      // Quick upload first file for analysis
      const formData = new FormData();
      formData.append("file", files[0]);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      const uploadData = await uploadRes.json();
      if (uploadData.code !== 0) return;
      const fileKey = uploadData.data.key || uploadData.data.filename;

      const analyzeRes = await fetch("/api/analyze-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileKey }),
      });
      const analyzeData = await analyzeRes.json();
      if (analyzeData.code === 0 && analyzeData.data.recommendedBgIds) {
        setRecommendedIds(analyzeData.data.recommendedBgIds);
      }
    } catch {
      // Silent fail — just show all backgrounds
    } finally {
      setAnalyzing(false);
    }
  };

  const canNext = () => {
    if (step === 1) return files.length > 0;
    if (step === 2) {
      if (mode === "preset") return selectedBgIds.length > 0;
      if (mode === "ai") return aiPrompt.trim().length > 0;
      if (mode === "custom") return !!customBgFile;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);

    try {
      // Upload all product files first
      const fileKeys: string[] = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        if (!uploadRes.ok) { toast.error("上传失败，请重试"); setSubmitting(false); return; }
        const uploadData = await uploadRes.json();
        if (uploadData.code !== 0) {
          toast.error(`上传失败: ${uploadData.message}`);
          setSubmitting(false);
          return;
        }
        fileKeys.push(uploadData.data.key || uploadData.data.filename);
      }

      let customBgKey: string | undefined;
      if (mode === "custom" && customBgFile) {
        const formData = new FormData();
        formData.append("file", customBgFile);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        if (!uploadRes.ok) { toast.error("背景上传失败，请重试"); setSubmitting(false); return; }
        const uploadData = await uploadRes.json();
        if (uploadData.code !== 0) {
          toast.error(`背景上传失败: ${uploadData.message}`);
          setSubmitting(false);
          return;
        }
        customBgKey = uploadData.data.key || uploadData.data.filename;
      }

      // Save custom background as preset
      if (mode === "custom" && customBgKey) {
        try {
          const saved = localStorage.getItem("framecraft_saved_bgs");
          const list: any[] = saved ? JSON.parse(saved) : [];
          const url = customBgFile ? URL.createObjectURL(customBgFile) : `/api/s3/${customBgKey}`;
          list.unshift({ key: customBgKey, name: customBgFile?.name || "背景", url, savedAt: Date.now() });
          localStorage.setItem("framecraft_saved_bgs", JSON.stringify(list.slice(0, 20)));
        } catch {}
      }

      // Determine backgrounds to process
      const bgKeys = mode === "preset"
        ? selectedBgIds  // localStorage keys = S3 keys
        : mode === "custom"
          ? [customBgKey]
          : [undefined]; // AI

      const createdIds: string[] = [];
      for (const bgKey of bgKeys) {
        const taskRes = await fetch("/api/background-replace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileKeys,
            backgroundMode: bgKey ? "custom" : "ai",
            backgroundId: undefined,
            customBgKey: bgKey || undefined,
            aiPrompt: mode === "ai" ? aiPrompt : undefined,
            customPrompt: customPrompt.trim() || undefined,
            aiModel,
          }),
        });
        if (!taskRes.ok) { toast.error("创建任务失败，请重试"); setSubmitting(false); return; }
        const taskData = await taskRes.json();

        if (taskData.code === 40003) {
          toast.error("积分不足，请先充值");
          setSubmitting(false);
          return;
        }
        if (taskData.code !== 0) {
          toast.error(taskData.message || "创建失败");
          setSubmitting(false);
          return;
        }
        createdIds.push(taskData.data.taskId);
      }

      const totalCredits = files.length * createdIds.length;
      toast.success(`已创建 ${createdIds.length} 个任务，消耗 ${totalCredits} 积分`);
      router.push(`/background-replace/${createdIds[0]}`);
    } catch {
      toast.error("网络错误，请重试");
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 md:py-14">
      {/* ====== Steps Indicator ====== */}
      <div className="flex items-center justify-center mb-12 relative">
        <button onClick={start}
          className="absolute -right-2 -top-2 flex items-center gap-1.5 text-xs text-purple-400/60 hover:text-purple-400 transition-colors bg-purple-500/10 border border-purple-400/20 rounded-full px-2.5 py-1"
          title="新手教程">
          <HelpCircle className="w-3.5 h-3.5" /> 教程
        </button>
        <div className="flex items-center gap-1">
          {steps.map((s, i) => {
            const Icon = s.icon;
            const isActive = s.id === step;
            const isDone = s.id < step;
            return (
              <div key={s.id} className="flex items-center">
                {/* Step circle */}
                <div className="flex flex-col items-center gap-2">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                      isDone
                        ? "bg-purple-500/20 border border-purple-400/30 text-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.2)]"
                        : isActive
                          ? "bg-purple-500/15 border-2 border-purple-400/40 text-purple-300 shadow-[0_0_30px_rgba(168,85,247,0.3)] scale-110"
                          : "bg-white/[0.03] border border-white/[0.06] text-foreground/15"
                    }`}
                  >
                    <Icon className="w-5 h-5" strokeWidth={isActive ? 2 : 1.5} />
                  </div>
                  <span
                    className={`text-[11px] font-medium transition-all duration-500 whitespace-nowrap ${
                      isDone ? "text-purple-400/70" : isActive ? "text-purple-300" : "text-foreground/15"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {/* Connector line */}
                {i < steps.length - 1 && (
                  <div className="w-10 md:w-16 h-px mx-1 mb-6">
                    <div className={`h-full rounded-full transition-all duration-700 ${
                      s.id < step ? "bg-purple-400/40" : "bg-white/[0.06]"
                    }`} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ====== Step Content ====== */}
      {step === 1 && (
        <div className="glass p-6 md:p-8">
          <h2 className="text-lg font-semibold mb-1">上传产品照片</h2>
          <p className="text-sm text-foreground/25 mb-6">选择要替换背景的产品照片，所有照片将使用同一背景场景</p>
          <UploadZone files={files} onFilesChange={setFiles} />
        </div>
      )}

      {step === 2 && (
        <div className="glass p-6 md:p-8">
          <h2 className="text-lg font-semibold mb-1">选择背景</h2>
          <p className="text-sm text-foreground/25 mb-6">所有照片将使用同一个背景。支持预设场景、AI 生成或自定义上传</p>
          {analyzing && (
            <div className="flex items-center gap-2 text-xs text-purple-400/60 mb-4">
              <Loader2 className="w-3 h-3 animate-spin" /> AI 正在分析产品，智能推荐背景...
            </div>
          )}
          <BgSelector
            mode={mode}
            onModeChange={setMode}
            selectedBgIds={selectedBgIds}
            onToggleBg={toggleBg}
            aiPrompt={aiPrompt}
            onAiPromptChange={setAiPrompt}
            customBgFile={customBgFile}
            onCustomBgChange={setCustomBgFile}
            recommendedIds={recommendedIds}
          />

          {/* Model & Prompt Settings */}
          <details className="mt-6 pt-6 border-t border-white/[0.1] group">
            <summary className="text-xs font-medium text-white/55 hover:text-white/80 cursor-pointer select-none transition-colors flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-400/70 group-open:bg-purple-400/90 transition-colors" />
              高级设置（AI 融合模型 · 自定义指令）
            </summary>
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-medium text-foreground/40 mb-2 block">AI 融合模型</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "google/gemini-3.1-flash-image-preview", label: "Gemini 3.1 Flash", sub: "更快更便宜 · 默认" },
                    { value: "openai/gpt-5.4-image-2", label: "GPT-5.4 Image 2", sub: "最佳质量" },
                  ].map((m: any) => (
                    <button
                      key={m.value}
                      type="button"
                      disabled={m.disabled}
                      onClick={() => !m.disabled && setAiModel(m.value)}
                      className={`text-left px-3 py-2.5 rounded-lg border text-sm transition-all ${
                        m.disabled
                          ? "border-white/[0.03] bg-white/[0.01] text-white/15 cursor-not-allowed"
                          : aiModel === m.value
                            ? "border-purple-400/40 bg-purple-500/10 text-purple-300"
                            : "border-white/[0.08] bg-white/[0.02] text-white/50 hover:border-white/[0.15]"
                      }`}
                    >
                      <div className="font-medium text-xs">{m.label}</div>
                      <div className="text-[10px] text-foreground/25 mt-0.5">{m.sub}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-foreground/40 mb-2 block">
                  自定义融合指令 <span className="text-foreground/15">（可选）</span>
                </label>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="例如：放在阳台的瓷砖地面上，下午自然光，鞋子要站在地上..."
                  className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white/80 placeholder:text-white/15 focus:outline-none focus:border-purple-400/40 h-20 resize-none"
                />
              </div>
            </div>
          </details>
        </div>
      )}

      {step === 3 && (
        <div className="glass p-6 md:p-8">
          <h2 className="text-lg font-semibold mb-1">确认提交</h2>
          <p className="text-sm text-foreground/25 mb-6">确认信息无误后提交，AI 将立即开始处理</p>
          <div className="space-y-3">
            <div className="flex justify-between py-2.5 border-b border-white/[0.05]">
              <span className="text-sm text-foreground/35">照片数量</span>
              <span className="text-sm font-medium">{files.length} 张</span>
            </div>
            <div className="flex justify-between py-2.5 border-b border-white/[0.05]">
              <span className="text-sm text-foreground/35">背景方式</span>
              <span className="text-sm font-medium">
                {mode === "ai" ? "AI 智能生成" : mode === "preset" ? `我的预设 ×${selectedBgIds.length}` : "自定义上传"}
              </span>
            </div>
            {mode === "preset" && selectedBgIds.length > 1 && (
              <div className="flex justify-between py-2.5 border-b border-white/[0.05]">
                <span className="text-sm text-foreground/35">任务数量</span>
                <span className="text-sm font-medium text-purple-400">{selectedBgIds.length} 个任务</span>
              </div>
            )}
            {mode === "ai" && aiPrompt && (
              <div className="flex justify-between py-2.5 border-b border-white/[0.05]">
                <span className="text-sm text-foreground/35">场景描述</span>
                <span className="text-sm font-medium truncate max-w-[220px]">{aiPrompt}</span>
              </div>
            )}
            <div className="flex justify-between py-2.5 border-b border-white/[0.05]">
              <span className="text-sm text-foreground/35">融合模型</span>
              <span className="text-sm font-medium">
                {aiModel.includes("gemini") ? "Gemini 3.1 Flash" : "GPT-5.4 Image 2"}
              </span>
            </div>
            {customPrompt && (
              <div className="flex justify-between py-2.5 border-b border-white/[0.05]">
                <span className="text-sm text-foreground/35">自定义指令</span>
                <span className="text-sm font-medium truncate max-w-[220px]">{customPrompt}</span>
              </div>
            )}
            <div className="flex justify-between py-2.5 border-b border-white/[0.05]">
              <span className="text-sm text-foreground/35">单价</span>
              <span className="text-sm text-foreground/50">1 积分 / 张</span>
            </div>
            <div className="flex justify-between py-3">
              <span className="text-sm font-medium text-foreground/60">合计消耗</span>
              <span className="text-base font-bold gradient-text">
                <Coins className="w-4 h-4 inline mr-1" />
                {files.length} 积分
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ====== Bottom actions ====== */}
      <div className="flex justify-between mt-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => step === 1 ? router.back() : setStep(step - 1)}
          className="text-foreground/30 hover:text-foreground/50 h-9 rounded-xl"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          {step === 1 ? "返回" : "上一步"}
        </Button>

        {step < 3 ? (
          <Button
            size="sm"
            onClick={() => setStep(step + 1)}
            disabled={!canNext()}
            className="bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/[0.08] disabled:opacity-25 h-9 px-5 rounded-xl text-sm"
          >
            下一步
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!canNext() || submitting}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 border-0 shadow-xl shadow-purple-500/25 h-9 px-6 rounded-xl text-sm"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-1.5" />
            )}
            提交任务（{files.length * (mode === "preset" ? Math.max(1, selectedBgIds.length) : 1)} 积分）
          </Button>
        )}
      </div>
      {TourModal}
    </div>
  );
}
