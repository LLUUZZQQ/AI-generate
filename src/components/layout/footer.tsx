import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t mt-auto">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <h4 className="font-semibold text-sm mb-3">AI爆款</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              追踪抖音热点，AI生成爆款内容，让创作更简单。
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-3">功能</h4>
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <p><Link href="/trends" className="hover:text-foreground transition-colors">趋势发现</Link></p>
              <p><Link href="/generate" className="hover:text-foreground transition-colors">AI 生成</Link></p>
              <p><Link href="/library" className="hover:text-foreground transition-colors">内容库</Link></p>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-3">支持</h4>
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <p><Link href="/settings" className="hover:text-foreground transition-colors">充值积分</Link></p>
              <p><Link href="/trends" className="hover:text-foreground transition-colors">热门话题</Link></p>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-3">关于</h4>
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <p>© 2026 AI爆款</p>
              <p>Powered by AI</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
