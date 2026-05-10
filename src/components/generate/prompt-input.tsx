"use client";

import { cn } from "@/lib/utils";

interface PromptInputProps {
  prompt: string;
  onChange: (value: string) => void;
  negativePrompt: string;
  onNegativeChange: (value: string) => void;
}

export function PromptInput({ prompt, onChange, negativePrompt, onNegativeChange }: PromptInputProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">正面提示词</label>
        <textarea
          rows={4}
          value={prompt}
          onChange={(e) => onChange(e.target.value)}
          placeholder="例如：一只可爱的橘猫正在跳抖音热门舞蹈，赛博朋克风格..."
          className={cn(
            "w-full min-w-0 rounded-lg border border-input bg-transparent px-3 py-2",
            "text-sm transition-colors outline-none",
            "placeholder:text-muted-foreground",
            "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
            "resize-none"
          )}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-muted-foreground">负面提示词（可选）</label>
        <textarea
          rows={2}
          value={negativePrompt}
          onChange={(e) => onNegativeChange(e.target.value)}
          placeholder="模糊、扭曲、低画质..."
          className={cn(
            "w-full min-w-0 rounded-lg border border-input bg-transparent px-3 py-2",
            "text-sm transition-colors outline-none",
            "placeholder:text-muted-foreground",
            "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
            "resize-none"
          )}
        />
      </div>
    </div>
  );
}
