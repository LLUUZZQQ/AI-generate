import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] mt-auto">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h4 className="font-semibold text-sm mb-3">
              <span className="gradient-text">AI</span><span className="text-white/70">爆款</span>
            </h4>
            <p className="text-xs text-white/30 leading-relaxed">
              追踪抖音热点，AI生成爆款内容，让创作更简单。
            </p>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-white/40 mb-3 uppercase tracking-wider">功能</h4>
            <div className="space-y-2 text-xs">
              <p><Link href="/trends" className="text-white/30 hover:text-white/70 transition-colors">趋势发现</Link></p>
              <p><Link href="/generate" className="text-white/30 hover:text-white/70 transition-colors">AI 生成</Link></p>
              <p><Link href="/library" className="text-white/30 hover:text-white/70 transition-colors">内容库</Link></p>
            </div>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-white/40 mb-3 uppercase tracking-wider">支持</h4>
            <div className="space-y-2 text-xs">
              <p><Link href="/settings" className="text-white/30 hover:text-white/70 transition-colors">充值积分</Link></p>
              <p><Link href="/trends" className="text-white/30 hover:text-white/70 transition-colors">热门话题</Link></p>
            </div>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-white/40 mb-3 uppercase tracking-wider">关于</h4>
            <div className="space-y-2 text-xs text-white/20">
              <p>© 2026 AI爆款</p>
              <p>Powered by AI</p>
            </div>
          </div>
        </div>
        <div className="text-center text-[10px] text-white/15 pt-6 border-t border-white/[0.04]">
          本平台内容由 AI 生成，仅供创意参考
        </div>
      </div>
    </footer>
  );
}
