"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckIcon, Loader2Icon } from "lucide-react";

interface TaskData {
  id: string; status: string; fileUrl?: string; thumbnailUrl?: string; metadata?: Record<string, unknown>;
}

interface ProgressTrackerProps {
  taskId: string;
  onComplete: (result: TaskData) => void;
}

const stages = [
  { key: "pending", label: "排队中", icon: "1" },
  { key: "processing", label: "AI 生成中", icon: "2" },
  { key: "done", label: "完成", icon: "3" },
];

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
      const s = query.state.data?.status;
      if (!s || s === "done" || s === "failed") return false;
      return 2000;
    },
    retry: 3,
  });

  const currentIndex = taskData?.status ? stages.findIndex((s) => s.key === taskData.status) : -1;

  useEffect(() => {
    if (taskData?.status === "done" && !completedRef.current) {
      completedRef.current = true;
      onComplete(taskData);
    }
  }, [taskData?.status, onComplete, taskData]);

  if (isLoading && !taskData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="size-10 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
        <p className="text-sm text-white/30">准备中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass rounded-xl p-8 text-center">
        <p className="text-sm text-red-400">加载失败: {(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-8">
      <h3 className="text-lg font-semibold mb-8 text-center">生成进度</h3>
      <div className="max-w-xs mx-auto">
        {stages.map((stage, index) => {
          const isDone = currentIndex > index;
          const isActive = currentIndex === index;
          const isWaiting = currentIndex < index || currentIndex === -1;

          return (
            <div key={stage.key}>
              <div className="flex items-center gap-4">
                <div className={`flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-all duration-300 ${
                  isDone ? "bg-purple-500 text-white shadow-lg shadow-purple-500/30" :
                  isActive ? "border-2 border-purple-500 text-purple-400 bg-purple-500/10" :
                  "border-2 border-white/[0.06] text-white/20"
                }`}>
                  {isDone ? <CheckIcon className="size-4" /> :
                   isActive ? <Loader2Icon className="size-4 animate-spin" /> :
                   stage.icon}
                </div>
                <span className={`text-sm font-medium transition-colors ${
                  isDone ? "text-purple-300" : isActive ? "text-white" : "text-white/25"
                }`}>
                  {stage.label}
                </span>
              </div>
              {index < stages.length - 1 && (
                <div className={`ml-[19px] h-8 w-0.5 my-1 rounded-full transition-colors ${
                  isDone ? "bg-purple-500/40" : "bg-white/[0.04]"
                }`} />
              )}
            </div>
          );
        })}
      </div>
      {taskData?.status === "done" && (
        <p className="text-sm text-center text-white/40 mt-8">
          生成完成！正在跳转到内容详情...
        </p>
      )}
    </div>
  );
}
