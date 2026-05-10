"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { CheckIcon, Loader2Icon } from "lucide-react";

interface TaskData {
  id: string;
  status: string;
  fileUrl?: string;
  thumbnailUrl?: string;
  metadata?: Record<string, unknown>;
}

interface ProgressTrackerProps {
  taskId: string;
  onComplete: (result: TaskData) => void;
}

const stages = [
  { key: "pending", label: "排队中" },
  { key: "processing", label: "生成中" },
  { key: "done", label: "完成" },
];

function getStageIndex(status: string): number {
  const idx = stages.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : -1;
}

export function ProgressTracker({ taskId, onComplete }: ProgressTrackerProps) {
  const completedRef = useRef(false);

  const { data: taskData, isLoading, error } = useQuery<TaskData>({
    queryKey: ["generate-task", taskId],
    queryFn: async () => {
      const res = await fetch(`/api/generate/${taskId}`);
      const json = await res.json();
      if (json.code !== 0) throw new Error(json.message || "获取任务状态失败");
      return json.data as TaskData;
    },
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status || status === "done" || status === "failed") return false;
      return 2000;
    },
    retry: 3,
  });

  const currentIndex = taskData?.status ? getStageIndex(taskData.status) : -1;

  useEffect(() => {
    if (taskData?.status === "done" && !completedRef.current) {
      completedRef.current = true;
      onComplete(taskData);
    }
  }, [taskData?.status, onComplete, taskData]);

  if (isLoading && !taskData) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-destructive">加载失败: {(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center py-8">
      <h3 className="text-lg font-medium mb-8">生成进度</h3>
      <div className="flex flex-col">
        {stages.map((stage, index) => {
          const isDone = currentIndex > index;
          const isActive = currentIndex === index;
          const isWaiting = currentIndex < index || currentIndex === -1;

          return (
            <div key={stage.key} className="flex flex-col items-start">
              {/* Row: circle + label */}
              <div className="flex items-start">
                <div
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-medium transition-all",
                    isDone &&
                      "border-primary bg-primary text-primary-foreground",
                    isActive && "border-primary text-primary",
                    isWaiting &&
                      "border-muted-foreground/30 text-muted-foreground/50"
                  )}
                >
                  {isDone ? (
                    <CheckIcon className="size-4" />
                  ) : isActive ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>

                <span
                  className={cn(
                    "ml-3 mt-1.5 text-sm",
                    isDone && "text-primary font-medium",
                    isActive && "text-foreground font-medium",
                    isWaiting && "text-muted-foreground/50"
                  )}
                >
                  {stage.label}
                </span>
              </div>

              {/* Vertical connector to next stage */}
              {index < stages.length - 1 && (
                <div className="flex">
                  <div
                    className={cn(
                      "ml-[17.5px] h-6 w-0.5 rounded-full",
                      isDone ? "bg-primary" : "bg-muted-foreground/20"
                    )}
                  />
                  <div className="ml-3 w-0" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {taskData?.status === "done" && taskData.fileUrl && (
        <p className="text-sm text-muted-foreground mt-6">
          生成完成！文件已保存到内容库。
        </p>
      )}
    </div>
  );
}
