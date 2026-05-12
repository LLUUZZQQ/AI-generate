"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Coins, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { UploadZone } from "@/components/background-replace/upload-zone";
import { BgSelector } from "@/components/background-replace/bg-selector";
import { toast } from "sonner";

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
    <div className="max-w-2xl mx-auto px-4 py-8 md:py-12">
      <div className="flex items-center gap-4 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
              s <= step
                ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                : "bg-white/[0.06] text-white/30"
            }`}>
              {s}
            </div>
            <span className={`text-sm ${s <= step ? "text-white/60" : "text-white/20"}`}>
              {s === 1 ? "上传" : s === 2 ? "背景" : "确认"}
            </span>
            {s < 3 && <div className={`w-8 h-px ${s < step ? "bg-purple-500/50" : "bg-white/[0.06]"}`} />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <Card className="p-6 border-white/[0.08] bg-white/[0.02]">
          <h2 className="text-lg font-semibold text-white mb-1">上传产品照片</h2>
          <p className="text-sm text-white/40 mb-6">选择要替换背景的产品照片，所有照片将使用同一背景</p>
          <UploadZone files={files} onFilesChange={setFiles} />
        </Card>
      )}

      {step === 2 && (
        <Card className="p-6 border-white/[0.08] bg-white/[0.02]">
          <h2 className="text-lg font-semibold text-white mb-1">选择背景</h2>
          <p className="text-sm text-white/40 mb-6">选择一种背景方式，所有照片将使用同一背景</p>
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
        </Card>
      )}

      {step === 3 && (
        <Card className="p-6 border-white/[0.08] bg-white/[0.02]">
          <h2 className="text-lg font-semibold text-white mb-1">确认提交</h2>
          <p className="text-sm text-white/40 mb-6">确认以下信息后提交任务</p>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-white/[0.06]">
              <span className="text-sm text-white/50">照片数量</span>
              <span className="text-sm text-white/80">{files.length} 张</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/[0.06]">
              <span className="text-sm text-white/50">背景方式</span>
              <span className="text-sm text-white/80">
                {mode === "ai" ? "AI 生成" : mode === "preset" ? "预设模板" : "自定义上传"}
              </span>
            </div>
            {mode === "ai" && aiPrompt && (
              <div className="flex justify-between py-2 border-b border-white/[0.06]">
                <span className="text-sm text-white/50">背景描述</span>
                <span className="text-sm text-white/80 truncate max-w-[200px]">{aiPrompt}</span>
              </div>
            )}
            <div className="flex justify-between py-2 border-b border-white/[0.06]">
              <span className="text-sm text-white/50">单价</span>
              <span className="text-sm text-white/80">¥0.10 / 张（1 积分）</span>
            </div>
            <div className="flex justify-between py-3">
              <span className="text-sm font-medium text-white/70">合计消耗</span>
              <span className="text-sm font-bold text-purple-400">
                <Coins className="w-4 h-4 inline mr-1" />
                {files.length} 积分 = ¥{(files.length * 0.1).toFixed(2)}
              </span>
            </div>
          </div>
        </Card>
      )}

      <div className="flex justify-between mt-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => step === 1 ? router.back() : setStep(step - 1)}
          className="text-white/40"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          {step === 1 ? "返回" : "上一步"}
        </Button>

        {step < 3 ? (
          <Button
            size="sm"
            onClick={() => setStep(step + 1)}
            disabled={!canNext()}
            className="bg-white/10 hover:bg-white/20 text-white border-0 disabled:opacity-30"
          >
            下一步
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!canNext() || submitting}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 border-0"
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
