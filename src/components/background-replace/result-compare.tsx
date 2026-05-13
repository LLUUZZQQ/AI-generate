"use client";
import { useState } from "react";
import { Download, Eye, EyeOff, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ResultCompareProps {
  originalUrl: string;
  resultUrl: string | null;
  status: "pending" | "processing" | "done" | "failed";
  error?: string | null;
  onRegenerate?: () => void;
}

export function ResultCompare({ originalUrl, resultUrl, status, error, onRegenerate }: ResultCompareProps) {
  const [showOriginal, setShowOriginal] = useState(false);

  if (status === "pending" || status === "processing") {
    return (
      <div className="aspect-square rounded-xl bg-white/[0.04] border border-white/[0.08] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
        <span className="text-xs text-white/40">{status === "pending" ? "排队中" : "处理中"}</span>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="aspect-square rounded-xl bg-red-500/5 border border-red-500/10 flex flex-col items-center justify-center gap-3">
        <span className="text-xs text-red-400">{error || "处理失败"}</span>
        {onRegenerate && (
          <Button variant="outline" size="sm" onClick={onRegenerate} className="border-red-500/20 text-red-400 hover:bg-red-500/10">
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> 重试
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative aspect-square rounded-xl overflow-hidden border border-white/[0.08] group">
        {/* Original (show when toggle) */}
        <div
          className="absolute inset-0 transition-opacity duration-300"
          style={{ opacity: showOriginal ? 1 : 0 }}
        >
          <img src={originalUrl} alt="Original" className="w-full h-full object-cover" />
          <span className="absolute top-2 left-2 text-[10px] bg-black/60 text-white/80 px-2 py-0.5 rounded">
            原图
          </span>
        </div>
        {/* Result */}
        <div
          className="absolute inset-0 transition-opacity duration-300"
          style={{ opacity: showOriginal ? 0 : 1 }}
        >
          {resultUrl && <img src={resultUrl} alt="Result" className="w-full h-full object-cover" />}
          <span className="absolute top-2 right-2 text-[10px] bg-purple-500/80 text-white px-2 py-0.5 rounded">
            结果
          </span>
        </div>

        {/* Hover controls */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowOriginal(!showOriginal)}
            className="border-white/10 bg-black/60 hover:bg-black/80 text-white text-xs h-8"
          >
            {showOriginal ? <Eye className="w-3.5 h-3.5 mr-1" /> : <EyeOff className="w-3.5 h-3.5 mr-1" />}
            {showOriginal ? "看结果" : "看原图"}
          </Button>
          {resultUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const a = document.createElement("a");
                a.href = resultUrl;
                a.download = "result.png";
                a.click();
              }}
              className="border-white/10 bg-black/60 hover:bg-black/80 text-white text-xs h-8"
            >
              <Download className="w-3.5 h-3.5 mr-1" /> 下载
            </Button>
          )}
          {onRegenerate && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRegenerate}
              className="border-white/10 bg-black/60 hover:bg-black/80 text-white text-xs h-8"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> 重新生成
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
