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

        {/* Bento showcase — 2/3 + 1/3 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <BrowserFrame className="md:col-span-2" showBlob>
            <div className="p-5">
              <p className="text-[10px] text-foreground/20 mb-3">FrameCraft · 产品照处理</p>
              <div className="aspect-video bg-white/[0.015] rounded-2xl flex items-center justify-center border border-white/[0.03]">
                <div className="text-center">
                  <Wand2 className="w-8 h-8 text-foreground/8 mx-auto mb-2" />
                  <p className="text-xs text-foreground/15">AI 处理结果将在此展示</p>
                </div>
              </div>
            </div>
          </BrowserFrame>
          <div className="glass p-6 flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center mb-4 text-foreground/50"><Zap className="w-5 h-5" /></div>
              <h3 className="font-semibold text-sm mb-2">每张仅需 ¥0.10</h3>
              <p className="text-xs text-foreground/30 leading-relaxed">1 积分处理 1 张照片。注册送 20 积分，无需绑卡。</p>
            </div>
            <div className="mt-4 pt-4 border-t border-white/[0.05] flex items-center justify-between">
              <span className="text-[10px] text-foreground/20">平均处理时间</span>
              <span className="text-xs font-medium text-emerald-400">~25s</span>
            </div>
          </div>
        </div>

        {/* Bento feature cards — varied sizes */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2 glass p-6">
            <div className="w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center mb-4 text-foreground/50"><Wand2 className="w-5 h-5" /></div>
            <h3 className="font-semibold text-sm mb-2">AI 智能抠图</h3>
            <p className="text-xs text-foreground/30 leading-relaxed max-w-sm">自动识别产品主体，精细处理边缘。鞋盒、配件完整保留。</p>
          </div>
          <div className="glass p-6">
            <div className="w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center mb-4 text-foreground/50"><Upload className="w-5 h-5" /></div>
            <h3 className="font-semibold text-sm mb-2">批量上传</h3>
            <p className="text-xs text-foreground/30 leading-relaxed">一次多张，共用同一场景。</p>
          </div>
          <div className="glass p-6">
            <div className="w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center mb-4 text-foreground/50"><Layers className="w-5 h-5" /></div>
            <h3 className="font-semibold text-sm mb-2">12 种真实场景</h3>
            <p className="text-xs text-foreground/30 leading-relaxed">木地板·瓷砖·毛毯·白墙……</p>
          </div>
          <div className="glass p-6">
            <div className="w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center mb-4 text-foreground/50"><Shield className="w-5 h-5" /></div>
            <h3 className="font-semibold text-sm mb-2">绕过检测</h3>
            <p className="text-xs text-foreground/30 leading-relaxed">Vinted/Depop 去重系统。</p>
          </div>
          <div className="md:col-span-2 glass p-6 flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center mb-4 text-foreground/50"><Download className="w-5 h-5" /></div>
              <h3 className="font-semibold text-sm mb-2">一键批量下载</h3>
              <p className="text-xs text-foreground/30 leading-relaxed max-w-sm">处理完成的图片可单独下载或批量打包，直接用于产品上架。</p>
            </div>
            <div className="mt-4 flex gap-2">
              <span className="text-[10px] px-2 py-1 rounded-lg bg-white/[0.03] text-foreground/25 border border-white/[0.04]">PNG</span>
              <span className="text-[10px] px-2 py-1 rounded-lg bg-white/[0.03] text-foreground/25 border border-white/[0.04]">原图分辨率</span>
              <span className="text-[10px] px-2 py-1 rounded-lg bg-white/[0.03] text-foreground/25 border border-white/[0.04]">批量打包</span>
            </div>
          </div>
        </div>
      </section>
      </ScrollReveal>

      {/* ======== HOW IT WORKS — sticky steps ======== */}
      <ScrollReveal>
      <section className="max-w-5xl mx-auto px-6 py-16 md:py-24">
        <p className="text-[11px] text-purple-400 font-semibold tracking-widest uppercase mb-3 text-center">How It Works</p>
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-16 text-center">
          三步完成，<span className="gradient-text">几分钟即可上手</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { step: "01", title: "上传照片", desc: "拖拽或点击上传你的产品照片，支持批量选择，一次可传多张，每张只需 ¥0.10。" },
            { step: "02", title: "选择背景", desc: "12 种实拍场景任选——木地板、瓷砖、毛毯……也可上传你自己的背景图。" },
            { step: "03", title: "下载结果", desc: "AI 自动处理，秒级返回。下载全部结果图，直接上传到你的卖货平台。" },
          ].map((s, i) => (
            <div key={s.step} className="relative">
              <div className="text-7xl font-bold text-white/[0.02] absolute -top-8 -left-2 select-none">{s.step}</div>
              <div className="relative">
                <h3 className="font-semibold text-sm mb-3">{s.title}</h3>
                <p className="text-xs text-foreground/30 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      </ScrollReveal>

      {/* ======== USE CASES — Bento ======== */}
      <ScrollReveal>
      <section className="max-w-4xl mx-auto px-6 py-12 md:py-20">
        <p className="text-[11px] text-purple-400 font-semibold tracking-widest uppercase mb-3 text-center">Use Cases</p>
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-12 text-center">
          适合 <span className="gradient-text">哪些人</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 glass p-6 flex flex-col justify-between min-h-[160px]">
            <div>
              <h3 className="font-semibold text-sm mb-2">Vinted / Depop 店群卖家</h3>
              <p className="text-xs text-foreground/30 leading-relaxed max-w-md">店群模式需要大量"不同"照片。同一产品换不同背景，轻松绕过平台去重检测，每个 Listing 都是全新的视觉。</p>
            </div>
            <div className="flex gap-2 mt-4">
              <span className="text-[10px] px-2.5 py-1 rounded-lg bg-white/[0.03] text-foreground/25 border border-white/[0.05]">店群模式</span>
              <span className="text-[10px] px-2.5 py-1 rounded-lg bg-white/[0.03] text-foreground/25 border border-white/[0.05]">防重检测</span>
              <span className="text-[10px] px-2.5 py-1 rounded-lg bg-white/[0.03] text-foreground/25 border border-white/[0.05]">批量处理</span>
            </div>
          </div>
          <div className="glass p-6">
            <h3 className="font-semibold text-sm mb-2">eBay / Shopify</h3>
            <p className="text-xs text-foreground/30 leading-relaxed">批量处理 SKU 产品图。统一视觉风格，提升店铺专业度。</p>
          </div>
          <div className="glass p-6">
            <h3 className="font-semibold text-sm mb-2">鞋类转售</h3>
            <p className="text-xs text-foreground/30 leading-relaxed">StockX、GOAT 卖家。换背景后多平台分发。</p>
          </div>
          <div className="md:col-span-2 glass p-6">
            <h3 className="font-semibold text-sm mb-2">社交媒体卖家</h3>
            <p className="text-xs text-foreground/30 leading-relaxed max-w-md">Instagram Shop、Facebook Marketplace。让你的产品照在信息流中脱颖而出。</p>
          </div>
        </div>
      </section>
      </ScrollReveal>

      {/* ======== BEFORE / AFTER ======== */}
      <ScrollReveal>
      <section className="max-w-4xl mx-auto px-6 py-12 md:py-20">
        <p className="text-[11px] text-purple-400 font-semibold tracking-widest uppercase mb-3 text-center">Showcase</p>
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-10 text-center">
          看看 <span className="gradient-text">实际效果</span>
        </h2>
        <div className="glass p-3 md:p-4">
          <div className="rounded-2xl overflow-hidden">
            <div className="relative aspect-[4/3] bg-white/[0.015] flex items-center justify-center">
              <div className="text-center">
                <p className="text-sm text-foreground/20 mb-3">拖拽中间滑块查看对比效果</p>
                <div className="flex gap-4 justify-center">
                  <div className="text-center">
                    <div className="w-32 h-24 rounded-xl bg-white/[0.03] border border-white/[0.04] mb-2 flex items-center justify-center">
                      <span className="text-[10px] text-foreground/15">上传原图</span>
                    </div>
                    <span className="text-[10px] text-foreground/25">原图</span>
                  </div>
                  <div className="text-center">
                    <div className="w-32 h-24 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/15 mb-2 flex items-center justify-center">
                      <span className="text-[10px] text-purple-400/40">处理后</span>
                    </div>
                    <span className="text-[10px] text-purple-400/50">结果</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      </ScrollReveal>

      {/* ======== METRICS BAR ======== */}
      <ScrollReveal>
      <section className="max-w-3xl mx-auto px-6 py-10">
        <div className="glass p-8 grid grid-cols-3 gap-6 text-center">
          {[
            { value: "¥0.10", label: "每张价格" },
            { value: "~25s", label: "平均处理时间" },
            { value: "12 种", label: "真实场景" },
          ].map((m) => (
            <div key={m.label}>
              <p className="text-2xl font-bold gradient-text mb-1">{m.value}</p>
              <p className="text-[11px] text-foreground/25">{m.label}</p>
            </div>
          ))}
        </div>
      </section>
      </ScrollReveal>

      {/* ======== CLOSING ======== */}
      <ScrollReveal>
      <section className="max-w-3xl mx-auto px-6 py-20 md:py-28 text-center">
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

        <p className="mt-10 text-[10px] text-foreground/15">© 2026 FrameCraft · 产品照片背景替换</p>
      </section>
      </ScrollReveal>
    </div>
  );
}
