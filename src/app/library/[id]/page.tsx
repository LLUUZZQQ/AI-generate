"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PublishPanel } from "@/components/library/publish-panel";

export default function LibraryDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const { data, isLoading } = useQuery({
    queryKey: ["library", id],
    queryFn: async () => {
      const res = await fetch(`/api/library/${id}`);
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="aspect-square w-full rounded-lg" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-20 w-full" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-48 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  const content = data?.data;
  if (!content) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <p className="text-muted-foreground text-center py-12">内容不存在</p>
      </div>
    );
  }

  const isImage = content.type === "image";

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Preview */}
        <div className="lg:col-span-2 space-y-4">
          <div className="aspect-square bg-muted rounded-lg flex items-center justify-center overflow-hidden">
            {content.fileUrl ? (
              isImage ? (
                <img
                  src={content.fileUrl}
                  alt={content.prompt}
                  className="w-full h-full object-contain"
                />
              ) : (
                <video
                  src={content.fileUrl}
                  controls
                  className="w-full h-full object-contain"
                />
              )
            ) : (
              <span className="text-muted-foreground">无法预览</span>
            )}
          </div>

          <p className="text-sm text-muted-foreground">{content.prompt}</p>

          {content.fileUrl && (
            <Button asChild variant="outline">
              <a href={content.fileUrl} download target="_blank">
                下载文件
              </a>
            </Button>
          )}
        </div>

        {/* Publish Panel */}
        <div>
          <PublishPanel suggestion={content.suggestion} />
        </div>
      </div>
    </div>
  );
}
