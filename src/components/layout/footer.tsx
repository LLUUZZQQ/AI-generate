import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-white/[0.05] mt-auto">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-2 md:col-span-1">
            <p className="font-semibold text-sm mb-2">
              <span className="gradient-text">Frame</span><span className="text-foreground/70">Craft</span>
            </p>
            <p className="text-xs text-foreground/25 leading-relaxed">
              产品照片背景替换<br />AI 智能合成 · 电商卖家必备
            </p>
          </div>
          <div>
            <h4 className="text-[11px] font-semibold text-foreground/30 mb-3 uppercase tracking-wider">产品</h4>
            <div className="space-y-2 text-xs">
              <p><Link href="/background-replace" className="text-foreground/25 hover:text-foreground/50 transition-colors">背景替换</Link></p>
              <p><Link href="/background-replace/new" className="text-foreground/25 hover:text-foreground/50 transition-colors">新建任务</Link></p>
            </div>
          </div>
          <div>
            <h4 className="text-[11px] font-semibold text-foreground/30 mb-3 uppercase tracking-wider">账户</h4>
            <div className="space-y-2 text-xs">
              <p><Link href="/dashboard" className="text-foreground/25 hover:text-foreground/50 transition-colors">我的</Link></p>
              <p><Link href="/settings" className="text-foreground/25 hover:text-foreground/50 transition-colors">充值积分</Link></p>
            </div>
          </div>
          <div>
            <h4 className="text-[11px] font-semibold text-foreground/30 mb-3 uppercase tracking-wider">关于</h4>
            <div className="space-y-2 text-xs text-foreground/15">
              <p>© 2026 FrameCraft</p>
            </div>
          </div>
        </div>
        <div className="text-center text-[10px] text-foreground/10 pt-6 border-t border-white/[0.04]">
          AI 生成内容仅供创意参考
        </div>
      </div>
    </footer>
  );
}
