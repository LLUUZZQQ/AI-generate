"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div className="text-5xl mb-4">⚠️</div>
      <h1 className="text-xl font-bold mb-2">页面出错了</h1>
      <p className="text-sm text-muted-foreground mb-6">
        {error.message || "发生了意外错误，请稍后重试"}
      </p>
      <div className="flex gap-3">
        <Button onClick={reset} variant="default">重试</Button>
        <Button onClick={() => window.location.href = "/"} variant="outline">返回首页</Button>
      </div>
    </div>
  );
}
