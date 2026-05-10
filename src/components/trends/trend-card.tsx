"use client";
import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface TrendCardProps {
  id: string;
  title: string;
  category: string;
  heatScore: number;
  status: string;
  fetchedAt?: string;
}

const categoryLabels: Record<string, string> = {
  challenge: "挑战赛", music: "BGM", hashtag: "话题", event: "事件",
};

const statusStyle: Record<string, string> = {
  rising: "text-emerald-400 bg-emerald-400/10",
  peak: "text-amber-400 bg-amber-400/10",
  falling: "text-white/40 bg-white/5",
};

const statusEmoji: Record<string, string> = {
  rising: "📈", peak: "🔥", falling: "📉",
};

const icons: Record<string, string> = {
  challenge: "🏆", music: "🎵", hashtag: "#️⃣", event: "📅",
};

const overlayGradients: Record<string, string> = {
  challenge: "from-orange-500/40 to-red-500/20",
  music: "from-purple-500/40 to-pink-500/20",
  hashtag: "from-blue-500/40 to-cyan-500/20",
  event: "from-emerald-500/40 to-teal-500/20",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  return `${Math.floor(hours / 24)}天前`;
}

export function TrendCard({ id, title, category, heatScore, status, fetchedAt }: TrendCardProps) {
  const overlay = overlayGradients[category] || "from-gray-500/40 to-slate-500/20";
  const imageUrl = `https://picsum.photos/seed/${id}/400/300`;
  const [imgError, setImgError] = useState(false);

  return (
    <Link href={`/trends/${id}`}>
      <div className="glass rounded-xl overflow-hidden transition-all duration-300 group hover:border-white/15">
        {/* Image area */}
        <div className="h-40 relative overflow-hidden">
          {!imgError && (
            <img
              src={imageUrl}
              alt={title}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-smooth"
              onError={() => setImgError(true)}
              loading="lazy"
            />
          )}
          <div className={`absolute inset-0 bg-gradient-to-br ${overlay}`} />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-3xl drop-shadow-lg">
            {icons[category]}
          </span>
          <span className={`absolute top-3 right-3 text-[10px] px-2 py-0.5 rounded-full ${statusStyle[status] || statusStyle.rising}`}>
            {statusEmoji[status]} {status === "peak" ? "爆火" : status === "rising" ? "上升" : "降温"}
          </span>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="text-[10px] border-white/10 text-white/50">
              {categoryLabels[category] || category}
            </Badge>
            {fetchedAt && (
              <span className="text-[10px] text-white/25 ml-auto">{timeAgo(fetchedAt)}</span>
            )}
          </div>
          <h3 className="font-semibold text-sm leading-snug mb-3 group-hover:text-purple-300 transition-colors">
            {title}
          </h3>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-purple-400 tabular-nums">
              {heatScore.toLocaleString()}
            </span>
            <span className="text-[10px] text-white/30">热度指数</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
