import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ContentCardProps {
  id: string;
  type: string;
  status: string;
  prompt: string;
  thumbnailUrl?: string | null;
  topic?: { title: string } | null;
  createdAt: string;
}

export function ContentCard({ id, type, status, prompt, thumbnailUrl, topic, createdAt }: ContentCardProps) {
  const isImage = type === "image";

  return (
    <Link href={`/library/${id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer overflow-hidden">
        <div className="aspect-square bg-muted relative flex items-center justify-center">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={prompt}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-muted-foreground text-sm">
              {status === "pending" && "生成中..."}
              {status === "processing" && "处理中..."}
              {status === "failed" && "生成失败"}
              {status === "done" && "无预览"}
            </span>
          )}
          <Badge className="absolute top-2 left-2" variant="secondary">
            {isImage ? "🖼️" : "🎬"}
          </Badge>
        </div>
        <CardContent className="p-3 space-y-1">
          <p className="text-xs text-muted-foreground truncate">
            {topic?.title ?? "未分类"}
          </p>
          <p className="text-sm line-clamp-2 leading-snug">{prompt}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(createdAt).toLocaleDateString("zh-CN")}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
