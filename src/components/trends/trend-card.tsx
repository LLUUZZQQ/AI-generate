import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TrendCardProps {
  id: string;
  title: string;
  category: string;
  heatScore: number;
  status: string;
}

const categoryLabels: Record<string, string> = {
  challenge: "挑战赛", music: "BGM", hashtag: "话题", event: "事件",
};

const statusBadge: Record<string, string> = {
  rising: "📈 上升", peak: "🔥 爆火", falling: "📉 降温",
};

const gradients: Record<string, string> = {
  challenge: "from-orange-500 to-red-500",
  music: "from-purple-500 to-pink-500",
  hashtag: "from-blue-500 to-cyan-500",
  event: "from-emerald-500 to-teal-500",
};

const icons: Record<string, string> = {
  challenge: "🏆",
  music: "🎵",
  hashtag: "#️⃣",
  event: "📅",
};

export function TrendCard({ id, title, category, heatScore, status }: TrendCardProps) {
  const gradient = gradients[category] || "from-gray-500 to-slate-500";
  const icon = icons[category] || "🔥";

  return (
    <Link href={`/trends/${id}`}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer overflow-hidden">
        <div className={`h-32 bg-gradient-to-br ${gradient} flex items-center justify-center relative`}>
          <span className="text-4xl">{icon}</span>
          <span className="absolute top-2 right-2 text-white/90 text-xs font-medium bg-black/20 rounded-full px-2 py-0.5">
            {statusBadge[status]}
          </span>
        </div>
        <div className="p-4">
          <Badge variant="outline" className="mb-2 text-xs">
            {categoryLabels[category] || category}
          </Badge>
          <h3 className="font-semibold text-sm leading-tight mb-2">{title}</h3>
          <div className="flex items-center gap-1 text-muted-foreground">
            <span className="text-sm font-bold text-orange-500 tabular-nums">{heatScore.toLocaleString()}</span>
            <span className="text-xs">热度</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
