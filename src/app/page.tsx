import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { InteractiveLogoWrapper } from "@/components/ui/interactive-logo-wrapper";
import { MagneticButton } from "@/components/ui/magnetic-button";
import { BrowserFrame } from "@/components/ui/browser-frame";
import { Upload, Wand2, Download, Layers, Zap, Shield } from "lucide-react";

export default function LandingPage() {
  return (
    <div>
      {/* ======== HERO ======== */}
      <section className="relative overflow-hidden">
        <div className="relative max-w-6xl mx-auto px-6 pt-16 pb-20 md:pt-24 md:pb-28">
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16">
            {/* Left: 3D Logo */}
            <div className="w-full md:w-1/2 flex justify-center md:justify-end">
              <div className="w-[300px] md:w-[380px] lg:w-[440px]">
                <InteractiveLogoWrapper />
              </div>
            </div>

            {/* Right: Text + CTA */}
            <div className="w-full md:w-1/2 text-center md:text-left">
              <h1 className="text-3xl md:text-4xl lg:text-[3.2rem] font-semibold tracking-tight leading-[1.08] mb-6 animate-fade-in-up">
                产品照片<br />
                <span className="gradient-text">一键换背景</span>
              </h1>

              <p className="text-sm md:text-base text-foreground/35 max-w-md mb-10 leading-relaxed animate-fade-in-up delay-1">
                AI 自动识别主体、移除原有背景、
                合成到真实家居场景中。适合 Vinted、Depop 等平台卖家。
              </p>

              <div className="flex items-center gap-3 animate-fade-in-up delay-2 justify-center md:justify-start">
                <Link href="/background-replace/new">
                  <MagneticButton size="lg" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 shadow-xl shadow-purple-500/25 h-12 px-8 text-sm font-medium rounded-full">
                    开始使用
                  </MagneticButton>
                </Link>
                <Link href="/background-replace">
                  <MagneticButton variant="outline" size="lg" className="h-12 px-8 text-sm font-medium border-border hover:bg-white/[0.03] rounded-full">
                    查看示例 ↗
                  </MagneticButton>
                </Link>
              </div>

              <p className="mt-8 text-xs text-foreground/20 animate-fade-in-up delay-3">
                ¥0.10 / 张 · 无需信用卡 · 注册即送 20 积分
              </p>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
      </section>

      {/* ======== FEATURES ======== */}
      <ScrollReveal>
      <section className="max-w-4xl mx-auto px-6 py-12 md:py-20">
        <p className="text-[11px] text-purple-400 font-semibold tracking-widest uppercase mb-3 text-center">Features</p>
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-12 text-center">
          不只是抠图，是<span className="gradient-text">完整的场景替换</span>
        </h2>

        {/* Bento grid — asymmetric layout */}
        <BrowserFrame className="mb-8 max-w-3xl mx-auto">
          <div className="p-5 text-center">
            <p className="text-xs text-foreground/25 mb-2">FrameCraft — 产品照处理界面</p>
            <div className="h-40 bg-white/[0.02] rounded-lg flex items-center justify-center">
              <p className="text-foreground/10 text-sm">你的产品照片处理结果将在此展示</p>
            </div>
          </div>
        </BrowserFrame>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2 glass rounded-xl p-6">
            <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center mb-4 text-foreground/50"><Wand2 className="w-5 h-5" /></div>
            <h3 className="font-medium text-sm mb-1.5">AI 智能抠图</h3>
            <p className="text-xs text-foreground/30 leading-relaxed">自动识别产品主体，精细处理边缘。鞋盒、配件完整保留，不会误删任何细节。</p>
          </div>
          <div className="glass rounded-xl p-6">
            <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center mb-4 text-foreground/50"><Upload className="w-5 h-5" /></div>
            <h3 className="font-medium text-sm mb-1.5">批量上传</h3>
            <p className="text-xs text-foreground/30 leading-relaxed">一次上传多张，共用同一背景场景。</p>
          </div>
          <div className="glass rounded-xl p-6">
            <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center mb-4 text-foreground/50"><Zap className="w-5 h-5" /></div>
            <h3 className="font-medium text-sm mb-1.5">快速出图</h3>
            <p className="text-xs text-foreground/30 leading-relaxed">每张仅需数十秒，批量并行处理。</p>
          </div>
          <div className="glass rounded-xl p-6">
            <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center mb-4 text-foreground/50"><Layers className="w-5 h-5" /></div>
            <h3 className="font-medium text-sm mb-1.5">真实场景</h3>
            <p className="text-xs text-foreground/30 leading-relaxed">12 种实拍家居环境，木地板、瓷砖、毛毯……</p>
          </div>
          <div className="md:col-span-2 glass rounded-xl p-6">
            <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center mb-4 text-foreground/50"><Shield className="w-5 h-5" /></div>
            <h3 className="font-medium text-sm mb-1.5">绕过平台检测</h3>
            <p className="text-xs text-foreground/30 leading-relaxed">同款产品多张不同背景照片，轻松绕过 Vinted/Depop 去重系统。</p>
          </div>
          <div className="glass rounded-xl p-6">
            <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center mb-4 text-foreground/50"><Download className="w-5 h-5" /></div>
            <h3 className="font-medium text-sm mb-1.5">一键下载</h3>
            <p className="text-xs text-foreground/30 leading-relaxed">处理完成直接下载全部结果图。</p>
          </div>
        </div>
      </section>
      </ScrollReveal>

      {/* ======== HOW IT WORKS ======== */}
      <ScrollReveal>
      <section className="max-w-4xl mx-auto px-6 py-12 md:py-20">
        <p className="text-[11px] text-purple-400 font-semibold tracking-widest uppercase mb-3 text-center">How It Works</p>
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-12 text-center">
          三步完成，<span className="gradient-text">几分钟即可上手</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { step: "1", title: "上传照片", desc: "拖拽或点击上传你的产品照片，支持批量选择，一次可传多张。" },
            { step: "2", title: "选择背景", desc: "从预设模板中选一个真实场景，或自己上传一张背景图。" },
            { step: "3", title: "下载结果", desc: "AI 自动处理，几秒后即可下载换好背景的产品图。" },
          ].map((s, i) => (
            <div key={s.step} className="flex gap-5 animate-fade-in-up" style={{ animationDelay: `${0.15 * (i + 1)}s` }}>
              <div className="text-5xl font-bold text-white/[0.03] shrink-0 leading-none">{s.step}</div>
              <div>
                <h3 className="font-medium text-sm mb-2">{s.title}</h3>
                <p className="text-xs text-foreground/30 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      </ScrollReveal>

      {/* ======== CLOSING ======== */}
      <ScrollReveal>
      <section className="max-w-3xl mx-auto px-6 py-16 md:py-24 text-center">
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-4">
          准备好<span className="gradient-text">提升产品照片</span>了吗？
        </h2>
        <p className="text-sm text-foreground/25 max-w-md mx-auto mb-10 leading-relaxed">
          ¥0.10 一张，不用绑卡。每张产品图都能拥有全新的真实背景。
        </p>

        <Link href="/background-replace/new">
          <MagneticButton size="lg" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 border-0 shadow-xl shadow-purple-500/25 h-12 px-10 text-sm font-medium rounded-full">
            免费开始使用 ↗
          </MagneticButton>
        </Link>
      </section>
      </ScrollReveal>
    </div>
  );
}
