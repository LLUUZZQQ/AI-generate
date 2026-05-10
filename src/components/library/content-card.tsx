"use client";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

interface ContentCardProps {
  id: string; type: string; status: string; prompt: string;
  thumbnailUrl?: string | null; topic?: { title: string } | null; createdAt: string;
}

const statusColors: Record<string, string> = {
  pending: "text-white/30 bg-white/5",
  processing: "text-amber-400 bg-amber-400/10",
  done: "text-emerald-400 bg-emerald-400/10",
  failed: "text-red-400 bg-red-400/10",
};

export function ContentCard({ id, type, status, prompt, thumbnailUrl, topic, createdAt }: ContentCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    toast.success("提示词已复制");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass rounded-lg overflow-hidden hover:border-white/15 transition-all group relative">
      <Link href={`/library/${id}`} className="block">
        <div className="aspect-square bg-white/[0.02] relative flex items-center justify-center">
          {thumbnailUrl ? (
            <img src={thumbnailUrl} alt={prompt} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <span className="text-white/15 text-sm">
              {status === "processing" ? "生成中..." : status === "failed" ? "失败" : status === "done" ? "🖼️" : "等待中"}
            </span>
          )}
          <span className={`absolute top-2 left-2 text-[9px] px-1.5 py-0.5 rounded ${statusColors[status] || statusColors.pending}`}>
            {type === "video" ? "🎬" : "🖼️"} {status === "done" ? "完成" : status === "processing" ? "生成中" : status === "failed" ? "失败" : "等待"}
          </span>
          {/* Copy button */}
          <button
            onClick={handleCopy}
            className="absolute top-2 right-2 size-6 rounded-full bg-black/50 text-white/60 hover:text-white hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-[10px]"
          >
            {copied ? "✓" : "📋"}
          </button>
        </div>
        <div className="p-3">
          <p className="text-[10px] text-white/25 truncate mb-1">{topic?.title || "未分类"}</p>
          <p className="text-xs line-clamp-2 text-white/60 leading-snug">{prompt}</p>
          <p className="text-[10px] text-white/20 mt-1.5">{new Date(createdAt).toLocaleDateString("zh-CN")}</p>
        </div>
      </Link>
    </div>
  );
}
