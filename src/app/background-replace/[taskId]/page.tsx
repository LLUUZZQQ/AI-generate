"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ResultCompare } from "@/components/background-replace/result-compare";
import { toast } from "sonner";

interface TaskResult {
  id: string;
  originalKey: string;
  resultKey: string | null;
  backgroundKey: string | null;
  status: string;
  error: string | null;
}

interface Task {
  id: string;
  imageCount: number;
  backgroundMode: string;
  status: string;
  cost: number;
  createdAt: string;
  results: TaskResult[];
}

export default function BgReplaceTaskPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTask = useCallback(async () => {
    const res = await fetch(`/api/background-replace/${taskId}`);
    const data = await res.json();
    if (data.code === 0) setTask(data.data);
    setLoading(false);
  }, [taskId]);

  useEffect(() => { fetchTask(); }, [fetchTask]);

  useEffect(() => {
    if (!task || task.status === "done" || task.status === "failed") return;
    const interval = setInterval(fetchTask, 3000);
    return () => clearInterval(interval);
  }, [task, fetchTask]);

  const getOriginalUrl = (key: string) => {
    if (key.startsWith("http")) return key;
    if (key.includes("/")) return `/api/s3/${key}`;
    return `/uploads/${key}`;
  };

  const getResultUrl = (resultId: string) => {
    return `/api/background-replace/${taskId}/result/${resultId}`;
  };

  const downloadAll = () => {
    if (!task) return;
    task.results.forEach((r) => {
      if (r.resultKey) {
        const a = document.createElement("a");
        a.href = getResultUrl(r.id);
        a.download = `result-${r.id}.png`;
        a.click();
      }
    });
    toast.success("开始下载全部结果");
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 flex justify-center">
        <Loader2 className="w-8 h-8 text-white/30 animate-spin" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 text-center">
        <p className="text-white/40">任务不存在</p>
        <Link href="/background-replace" className="text-purple-400 text-sm mt-2 inline-block">返回列表</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
      {/* Processing status banner */}
      {(task.status === "pending" || task.status === "processing") && (
        <div className="glass p-5 mb-6">
          <div className="flex items-center gap-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Loader2 className="w-5 h-5 text-purple-400" />
            </motion.div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground/70 mb-2">
                {task.status === "pending" ? "任务排队中..." : "正在处理中..."}
              </p>
              <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                  animate={{ width: ["0%", "60%", "80%", "90%"] }}
                  transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
              <p className="text-[10px] text-foreground/20 mt-2">
                {task.status === "pending" ? "正在等待 Worker 处理" : "AI 正在移除背景 · 合成场景 · 优化细节"}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/background-replace">
            <Button variant="ghost" size="sm" className="text-white/40">
              <ArrowLeft className="w-4 h-4 mr-1" /> 返回
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-white">
              {task.imageCount} 张照片 · {task.backgroundMode === "ai" ? "AI生成" : task.backgroundMode === "preset" ? "预设模板" : "自定义"}
            </h1>
            <p className="text-xs text-white/30">{new Date(task.createdAt).toLocaleString("zh-CN")}</p>
          </div>
        </div>
        {task.status === "done" && (
          <Button size="sm" onClick={downloadAll} className="bg-white/10 hover:bg-white/20 text-white border-0">
            <Download className="w-4 h-4 mr-1" /> 全部下载
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {task.results.map((result) => (
          <Card key={result.id} className="border-white/[0.08] bg-white/[0.02] overflow-hidden">
            <ResultCompare
              originalUrl={getOriginalUrl(result.originalKey)}
              resultUrl={result.resultKey ? getResultUrl(result.id) : null}
              status={result.status as "pending" | "processing" | "done" | "failed"}
              error={result.error}
              onRegenerate={() => toast.info("重新生成功能即将上线")}
            />
          </Card>
        ))}
      </div>
    </div>
  );
}
