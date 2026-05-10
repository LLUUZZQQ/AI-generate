import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface SuggestionData {
  bestTimes?: string[];
  caption?: string;
  hashtags?: string[];
  bgm?: { name: string }[];
}

interface PublishPanelProps {
  suggestion?: SuggestionData | null;
}

export function PublishPanel({ suggestion }: PublishPanelProps) {
  if (!suggestion) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">发布建议</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">发布建议生成中...</p>
        </CardContent>
      </Card>
    );
  }

  const bestTimes = suggestion.bestTimes ?? [];
  const caption = suggestion.caption ?? "";
  const hashtags = suggestion.hashtags ?? [];
  const bgm = suggestion.bgm ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">发布建议</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Best Times */}
        <div>
          <h4 className="text-sm font-medium mb-2">⏰ 最佳发布时间</h4>
          <div className="flex flex-wrap gap-1.5">
            {bestTimes.map((time, i) => (
              <Badge key={i} variant="outline">{time}</Badge>
            ))}
          </div>
        </div>

        <Separator />

        {/* Caption */}
        <div>
          <h4 className="text-sm font-medium mb-2">✍️ 推荐文案</h4>
          <p className="text-sm text-muted-foreground">{caption}</p>
        </div>

        <Separator />

        {/* Hashtags */}
        <div>
          <h4 className="text-sm font-medium mb-2">#️⃣ 推荐标签</h4>
          <div className="flex flex-wrap gap-1.5">
            {hashtags.map((tag, i) => (
              <Badge key={i} variant="secondary">{tag}</Badge>
            ))}
          </div>
        </div>

        <Separator />

        {/* BGM */}
        <div>
          <h4 className="text-sm font-medium mb-2">🎵 推荐BGM</h4>
          <div className="flex flex-wrap gap-1.5">
            {bgm.map((item, i) => (
              <Badge key={i} variant="outline">{item.name}</Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
