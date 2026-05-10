"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PublishPanel } from "@/components/library/publish-panel";

export default function LibraryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params.id as string;
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["library", id],
    queryFn: async () => {
      const res = await fetch(`/api/library/${id}`);
      return res.json();
    },
  });

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/library/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.code === 0) {
        toast.success("已删除");
        queryClient.invalidateQueries({ queryKey: ["library"] });
        router.push("/library");
      } else {
        toast.error(json.message ?? "删除失败");
      }
    } catch {
      toast.error("网络错误");
    } finally {
      setDeleting(false);
    }
  };

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

          <div className="flex gap-2">
            {content.fileUrl && (
              <a href={content.fileUrl} download target="_blank" className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
                下载文件
              </a>
            )}
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setShowDelete(true)}>
              删除
            </Button>
          </div>
        </div>

        {/* Publish Panel */}
        <div>
          <PublishPanel suggestion={content.suggestion} />
        </div>
      </div>

      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              删除后无法恢复，确定要删除这条内容吗？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)} disabled={deleting}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "删除中..." : "确认删除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
