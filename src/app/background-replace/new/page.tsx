"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Coins, Loader2, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UploadZone } from "@/components/background-replace/upload-zone";
import { BgSelector } from "@/components/background-replace/bg-selector";
import { toast } from "sonner";

const stepLabels = [
  { num: 1, title: "上传", desc: "产品照片" },
  { num: 2, title: "背景", desc: "选择场景" },
  { num: 3, title: "确认", desc: "提交任务" },
];

export default function NewBgReplacePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [files, setFiles] = useState<File[]>([]);
  const [mode, setMode] = useState<"ai" | "preset" | "custom">("preset");
  const [selectedBgId, setSelectedBgId] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [customBgFile, setCustomBgFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canNext = () => {
    if (step === 1) return files.length > 0;
    if (step === 2) {
      if (mode === "preset") return !!selectedBgId;
      if (mode === "ai") return aiPrompt.trim().length > 0;
      if (mode === "custom") return !!customBgFile;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);

    try {
      const fileKeys: string[] = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        const uploadData = await uploadRes.json();
        if (uploadData.code !== 0) {
          toast.error(`上传失败: ${uploadData.message}`);
          setSubmitting(false);
          return;
        }
        const key = uploadData.data.key || uploadData.data.filename;
        fileKeys.push(key);
      }

      let customBgKey: string | undefined;
      if (mode === "custom" && customBgFile) {
        const formData = new FormData();
        formData.append("file", customBgFile);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        const uploadData = await uploadRes.json();
        if (uploadData.code !== 0) {
          toast.error(`背景上传失败: ${uploadData.message}`);
          setSubmitting(false);
          return;
        }
        customBgKey = uploadData.data.key || uploadData.data.filename;
      }

      const taskRes = await fetch("/api/background-replace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileKeys,
          backgroundMode: mode,
          backgroundId: mode === "preset" ? selectedBgId : undefined,
          customBgKey: mode === "custom" ? customBgKey : undefined,
          aiPrompt: mode === "ai" ? aiPrompt : undefined,
        }),
      });
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

      toast.success(`任务已创建，消耗 ${files.length} 积分`);
      router.push(`/background-replace/${taskData.data.taskId}`);
    } catch {
      toast.error("网络错误，请重试");
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 md:py-16">
      {/* Steps indicator */}
      <div className="flex items-center justify-center gap-0 mb-12">
        {stepLabels.map((s, i) => {
          const isActive = s.num === step;
          const isDone = s.num < step;
          return (
            <div key={s.num} className="flex items-center">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-semibold transition-all duration-500 ${
                    isDone
                      ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                      : isActive
                        ? "bg-purple-500 text-white shadow-lg shadow-purple-500/25 border-0"
                        : "bg-white/[0.04] text-foreground/20 border border-white/[0.06]"
                  }`}
                >
                  {isDone ? <Check className="w-4 h-4" /> : s.num}
                </div>
                <div className="text-center">
                  <p className={`text-[10px] font-semibold tracking-wide ${isActive ? "text-foreground/70" : isDone ? "text-purple-400/60" : "text-foreground/15"}`}>
                    {s.title}
                  </p>
                  <p className={`text-[9px] ${isActive ? "text-foreground/25" : "text-foreground/10"}`}>
                    {s.desc}
                  </p>
                </div>
              </div>
              {i < 2 && (
                <div className={`w-10 md:w-16 h-px mx-2 transition-colors duration-500 ${
                  isDone ? "bg-purple-500/40" : "bg-white/[0.06]"
                }`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      {step === 1 && (
        <div className="glass p-6 md:p-8">
          <h2 className="text-lg font-semibold tracking-tight mb-1">上传产品照片</h2>
          <p className="text-xs text-foreground/25 mb-6">选择要替换背景的产品照片，所有照片将使用同一背景</p>
          <UploadZone files={files} onFilesChange={setFiles} />
        </div>
      )}

      {step === 2 && (
        <div className="glass p-6 md:p-8">
          <h2 className="text-lg font-semibold tracking-tight mb-1">选择背景</h2>
          <p className="text-xs text-foreground/25 mb-6">选择一种背景方式，所有照片将使用同一背景</p>
          <BgSelector
            mode={mode}
            onModeChange={setMode}
            selectedBgId={selectedBgId}
            onSelectBg={setSelectedBgId}
            aiPrompt={aiPrompt}
            onAiPromptChange={setAiPrompt}
            customBgFile={customBgFile}
            onCustomBgChange={setCustomBgFile}
          />
        </div>
      )}

      {step === 3 && (
        <div className="glass p-6 md:p-8">
          <h2 className="text-lg font-semibold tracking-tight mb-1">确认提交</h2>
          <p className="text-xs text-foreground/25 mb-6">确认以下信息后提交任务</p>
          <div className="space-y-0">
            {[
              { label: "照片数量", value: `${files.length} 张` },
              { label: "背景方式", value: mode === "ai" ? "AI 生成" : mode === "preset" ? "预设模板" : "自定义上传" },
              ...(mode === "ai" && aiPrompt ? [{ label: "背景描述", value: aiPrompt }] : []),
              { label: "单价", value: "¥0.10 / 张（1 积分）" },
            ].map((row, i) => (
              <div key={i} className="flex justify-between py-3 border-b border-white/[0.05] last:border-0">
                <span className="text-xs text-foreground/30">{row.label}</span>
                <span className="text-xs text-foreground/60 truncate max-w-[220px]">{row.value}</span>
              </div>
            ))}
            <div className="flex justify-between py-4 mt-2 border-t border-white/[0.08]">
              <span className="text-sm font-semibold text-foreground/60">合计消耗</span>
              <span className="text-sm font-bold text-purple-400">
                <Coins className="w-4 h-4 inline mr-1" />
                {files.length} 积分 = ¥{(files.length * 0.1).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => (step === 1 ? router.back() : setStep(step - 1))}
          className="text-white/40 hover:text-white/70 hover:bg-white/[0.04] rounded-xl"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          {step === 1 ? "返回" : "上一步"}
        </Button>

        {step < 3 ? (
          <Button
            size="sm"
            onClick={() => setStep(step + 1)}
            disabled={!canNext()}
            className="bg-white/10 hover:bg-white/20 text-white border-0 rounded-xl disabled:opacity-30 h-9 px-5 text-xs font-medium"
          >
            下一步
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!canNext() || submitting}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 border-0 rounded-xl h-9 px-5 text-xs font-medium shadow-lg shadow-purple-500/20"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-1" />
            )}
            提交任务（{files.length} 积分）
          </Button>
        )}
      </div>
    </div>
  );
}
