import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
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

export function TrendCard({ id, title, category, heatScore, status }: TrendCardProps) {
  return (
    <Link href={`/trends/${id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <Badge variant="outline" className="mb-2">{categoryLabels[category] || category}</Badge>
              <h3 className="font-semibold text-sm leading-tight">{title}</h3>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold tabular-nums">{heatScore}</span>
              <p className="text-xs text-muted-foreground">{statusBadge[status] || status}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
