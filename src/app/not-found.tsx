import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div className="text-6xl mb-4">🔍</div>
      <h1 className="text-2xl font-bold mb-2">页面不存在</h1>
      <p className="text-muted-foreground mb-6">你访问的页面可能已被删除或地址有误</p>
      <div className="flex gap-3">
        <Link href="/"><Button variant="default">返回首页</Button></Link>
        <Link href="/trends"><Button variant="outline">浏览趋势</Button></Link>
      </div>
    </div>
  );
}
