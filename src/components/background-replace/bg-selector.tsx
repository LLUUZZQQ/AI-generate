"use client";
import { useState, useEffect } from "react";
import { Wand2, LayoutGrid, Upload, Loader2, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

type BgMode = "ai" | "preset" | "custom";

interface BackgroundTemplate {
  id: string;
  name: string;
  category: string;
  thumbnailUrl: string | null;
}

interface BgSelectorProps {
  mode: BgMode;
  onModeChange: (mode: BgMode) => void;
  selectedBgId: string | null;
  onSelectBg: (id: string | null) => void;
  aiPrompt: string;
  onAiPromptChange: (prompt: string) => void;
  customBgFile: File | null;
  onCustomBgChange: (file: File | null) => void;
  recommendedIds?: string[];
}

export function BgSelector({
  mode, onModeChange, selectedBgId, onSelectBg,
  aiPrompt, onAiPromptChange, customBgFile, onCustomBgChange,
  recommendedIds,
}: BgSelectorProps) {
  const [templates, setTemplates] = useState<BackgroundTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (mode === "preset") {
      setLoading(true);
      fetch("/api/background-templates")
        .then((r) => r.json())
        .then((d) => {
          let list = d.data || [];
          // Sort: recommended first, then by original order
          if (recommendedIds && recommendedIds.length > 0) {
            const recSet = new Set(recommendedIds);
            const rec = list.filter((t: BackgroundTemplate) => recSet.has(t.id));
            const rest = list.filter((t: BackgroundTemplate) => !recSet.has(t.id));
            list = [...rec, ...rest];
          }
          setTemplates(list);
        })
        .finally(() => setLoading(false));
    }
  }, [mode, recommendedIds]);

  const modes: { key: BgMode; label: string; icon: React.ReactNode; desc: string }[] = [
    { key: "preset", label: "预设模板", icon: <LayoutGrid className="w-4 h-4" />, desc: "从图库选择真实环境背景" },
    { key: "ai", label: "AI 生成", icon: <Wand2 className="w-4 h-4" />, desc: "描述你想要的背景场景" },
    { key: "custom", label: "自定义上传", icon: <Upload className="w-4 h-4" />, desc: "上传你自己的背景图" },
  ];

  return (
    <div className="space-y-6">
      {/* Mode tabs */}
      <div className="flex gap-2">
        {modes.map((m) => (
          <button
            key={m.key}
            onClick={() => onModeChange(m.key)}
            className={`flex-1 p-4 rounded-xl border text-left transition-all ${
              mode === m.key
                ? "border-purple-400/50 bg-purple-500/10"
                : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15]"
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className={mode === m.key ? "text-purple-400" : "text-white/40"}>{m.icon}</span>
              <span className={`text-sm font-medium ${mode === m.key ? "text-purple-400" : "text-white/70"}`}>
                {m.label}
              </span>
            </div>
            <p className="text-xs text-white/40">{m.desc}</p>
          </button>
        ))}
      </div>

      {/* Preset templates grid */}
      {mode === "preset" && (
        loading ? (
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        ) : templates.length === 0 ? (
          <p className="text-sm text-white/40 text-center py-8">暂无预设背景模板</p>
        ) : (
          <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => onSelectBg(selectedBgId === t.id ? null : t.id)}
                className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                  selectedBgId === t.id
                    ? "border-purple-400 ring-2 ring-purple-400/30"
                    : "border-white/[0.08] hover:border-white/[0.2]"
                }`}
              >
                {t.thumbnailUrl ? (
                  <img src={t.thumbnailUrl} alt={t.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-white/[0.04] flex items-center justify-center">
                    <LayoutGrid className="w-6 h-6 text-white/20" />
                  </div>
                )}
                {recommendedIds?.includes(t.id) && (
                  <span className="absolute top-1.5 right-1.5 flex items-center gap-0.5 text-[9px] bg-purple-500/80 text-white px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                    <Sparkles className="w-2.5 h-2.5" /> 推荐
                  </span>
                )}
                <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white/80 px-1.5 py-0.5 rounded">
                  {t.name}
                </span>
              </button>
            ))}
          </div>
        )
      )}

      {/* AI prompt */}
      {mode === "ai" && (
        <div className="space-y-3">
          <Input
            placeholder="例如：浅色木地板，自然光线，旁边有绿植，手机拍摄"
            value={aiPrompt}
            onChange={(e) => onAiPromptChange(e.target.value)}
            className="bg-white/[0.04] border-white/[0.12] text-sm h-12"
          />
          <p className="text-xs text-white/40">AI 将根据描述生成真实室内场景作为背景</p>
        </div>
      )}

      {/* Custom upload */}
      {mode === "custom" && (
        <div>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              onCustomBgChange(file);
            }}
            className="hidden"
            id="custom-bg-input"
          />
          <label htmlFor="custom-bg-input">
            <div className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              customBgFile
                ? "border-purple-400/50 bg-purple-500/5"
                : "border-white/[0.12] hover:border-white/[0.25] bg-white/[0.02]"
            }`}>
              {customBgFile ? (
                <div className="space-y-2">
                  <img
                    src={URL.createObjectURL(customBgFile)}
                    alt="Custom background"
                    className="max-h-40 mx-auto rounded-lg"
                  />
                  <p className="text-sm text-purple-400">{customBgFile.name}</p>
                </div>
              ) : (
                <div className="text-sm text-white/40">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-white/20" />
                  点击上传背景图
                </div>
              )}
            </div>
          </label>
        </div>
      )}
    </div>
  );
}
