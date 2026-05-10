"use client";

interface PromptInputProps {
  prompt: string;
  onChange: (value: string) => void;
  negativePrompt: string;
  onNegativeChange: (value: string) => void;
}

export function PromptInput({ prompt, onChange, negativePrompt, onNegativeChange }: PromptInputProps) {
  const inputClass = "w-full rounded-lg border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm transition-all outline-none placeholder:text-white/15 focus:border-purple-500/40 focus:bg-white/[0.04] resize-none";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-medium text-white/40">正面提示词</label>
        <textarea
          rows={4}
          value={prompt}
          onChange={(e) => onChange(e.target.value)}
          placeholder="描述你想要生成的画面，例如：一只可爱的橘猫正在跳抖音热门舞蹈，赛博朋克风格，霓虹背景..."
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-medium text-white/25">负面提示词（可选）</label>
        <textarea
          rows={2}
          value={negativePrompt}
          onChange={(e) => onNegativeChange(e.target.value)}
          placeholder="不想出现的内容：模糊、扭曲、低画质..."
          className={inputClass}
        />
      </div>
    </div>
  );
}
