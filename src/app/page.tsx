import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { InteractiveLogoWrapper } from "@/components/ui/interactive-logo-wrapper";
import { MagneticButton } from "@/components/ui/magnetic-button";
import { BrowserFrame } from "@/components/ui/browser-frame";
import { GenerationFlow } from "@/components/ui/generation-flow";
import { Upload, Wand2, Download, Layers, Zap, Shield } from "lucide-react";
import { CompareSlider } from "@/components/ui/compare-slider";
import { PartnerLogos } from "@/components/ui/partner-logos";

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
                产品摄影<br />
                <span className="gradient-text">场景级合成</span>
              </h1>

              <p className="text-sm md:text-base text-foreground/35 max-w-md mb-10 leading-relaxed animate-fade-in-up delay-1">
                智能主体识别，精细边缘处理，自然融入真实场景。
                专为电商卖家打造的视觉升级工具。
              </p>

              <div className="flex items-center gap-3 animate-fade-in-up delay-2 justify-center md:justify-start">
                <Link href="/background-replace/new">
                  <MagneticButton size="lg" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 shadow-xl shadow-purple-500/25 h-12 px-8 text-sm font-medium rounded-full">
                    立即体验
                  </MagneticButton>
                </Link>
                <Link href="/background-replace">
                  <MagneticButton variant="outline" size="lg" className="h-12 px-8 text-sm font-medium border-border hover:bg-white/[0.03] rounded-full">
                    查看效果 ↗
                  </MagneticButton>
                </Link>
              </div>

              <p className="mt-8 text-xs text-foreground/20 animate-fade-in-up delay-3">
                ¥1 即可体验 · 不满意不收费
              </p>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
      </section>

      {/* ======== PARTNER LOGOS ======== */}
      <PartnerLogos />

      {/* ======== TRUST / SOCIAL PROOF ======== */}
      <ScrollReveal>
      <section className="max-w-4xl mx-auto px-6 py-8">
        <p className="text-[10px] text-foreground/12 text-center mb-7 tracking-widest uppercase">
          为产品摄影师而生
        </p>
        <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto">
          {[
            { value: "秒级", label: "处理速度" },
            { value: "原图", label: "输出分辨率" },
            { value: "精细", label: "边缘处理" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-xl font-bold gradient-text mb-0.5">{s.value}</p>
              <p className="text-[10px] text-foreground/18">{s.label}</p>
            </div>
          ))}
        </div>
      </section>
      </ScrollReveal>

      {/* ======== FEATURES ======== */}
      <ScrollReveal>
      <section className="max-w-4xl mx-auto px-6 py-12 md:py-20">
        <p className="text-[11px] text-purple-400 font-semibold tracking-widest uppercase mb-3 text-center">Capabilities</p>
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-12 text-center">
          不只是去背景，是<span className="gradient-text">完整的场景重塑</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <BrowserFrame className="md:col-span-2" showBlob>
            <div className="p-5">
              <p className="text-[10px] text-foreground/20 mb-3">FrameCraft · 处理引擎</p>
              <div className="bg-white/[0.015] rounded-2xl flex items-center justify-center border border-white/[0.03] px-4">
                <GenerationFlow />
              </div>
            </div>
          </BrowserFrame>
          <div className="glass p-6 flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center mb-4 text-foreground/50"><Zap className="w-5 h-5" /></div>
              <h3 className="font-semibold text-sm mb-2">¥1 即可体验</h3>
              <p className="text-xs text-foreground/30 leading-relaxed">1 张照片 1 块钱，不满意不收费。</p>
            </div>
            <div className="mt-4 pt-4 border-t border-white/[0.05] flex items-center justify-between">
              <span className="text-[10px] text-foreground/20">平均处理耗时</span>
              <span className="text-xs font-medium text-emerald-400">30 秒内</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2 glass p-6">
            <div className="w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center mb-4 text-foreground/50"><Wand2 className="w-5 h-5" /></div>
            <h3 className="font-semibold text-sm mb-2">精细主体分离</h3>
            <p className="text-xs text-foreground/30 leading-relaxed max-w-sm">精准识别产品轮廓，保留所有细节——包装、鞋盒、配件，无一遗漏。</p>
          </div>
          <div className="glass p-6">
            <div className="w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center mb-4 text-foreground/50"><Upload className="w-5 h-5" /></div>
            <h3 className="font-semibold text-sm mb-2">批量处理</h3>
            <p className="text-xs text-foreground/30 leading-relaxed">一次上传多张，多场景同时输出，效率提升数倍。</p>
          </div>
          <div className="glass p-6">
            <div className="w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center mb-4 text-foreground/50"><Layers className="w-5 h-5" /></div>
            <h3 className="font-semibold text-sm mb-2">场景自由搭配</h3>
            <p className="text-xs text-foreground/30 leading-relaxed">地板·桌面·户外·白墙……任选场景，或上传你的专属背景。</p>
          </div>
          <div className="glass p-6">
            <div className="w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center mb-4 text-foreground/50"><Shield className="w-5 h-5" /></div>
            <h3 className="font-semibold text-sm mb-2">视觉差异化</h3>
            <p className="text-xs text-foreground/30 leading-relaxed">同一产品不同场景，每张都是独立的视觉表达。</p>
          </div>
          <div className="md:col-span-2 glass p-6 flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center mb-4 text-foreground/50"><Download className="w-5 h-5" /></div>
              <h3 className="font-semibold text-sm mb-2">原画质输出</h3>
              <p className="text-xs text-foreground/30 leading-relaxed max-w-sm">保持原始分辨率，处理后图片可直接用于各大电商平台，无需二次编辑。</p>
            </div>
            <div className="mt-4 flex gap-2">
              <span className="text-[10px] px-2 py-1 rounded-lg bg-white/[0.03] text-foreground/25 border border-white/[0.04]">原图分辨率</span>
              <span className="text-[10px] px-2 py-1 rounded-lg bg-white/[0.03] text-foreground/25 border border-white/[0.04]">精细边缘</span>
              <span className="text-[10px] px-2 py-1 rounded-lg bg-white/[0.03] text-foreground/25 border border-white/[0.04]">自然光影</span>
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
            { step: "01", title: "上传照片", desc: "拖拽或点击上传产品照片，支持批量选择。系统自动识别产品主体，保留所有细节。" },
            { step: "02", title: "选择场景", desc: "多种实拍场景任选——木地板、瓷砖、户外……也可上传自己的背景图。" },
            { step: "03", title: "下载成品", desc: "引擎自动合成，保持原图分辨率。下载即可直接用于产品上架。" },
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
          为 <span className="gradient-text">专业卖家</span> 设计
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 glass p-6 flex flex-col justify-between min-h-[160px]">
            <div>
              <h3 className="font-semibold text-sm mb-2">多平台卖家</h3>
              <p className="text-xs text-foreground/30 leading-relaxed max-w-md">同一产品在不同平台需要差异化视觉。多种场景一次生成，每个 Listing 都是独立的摄影作品。</p>
            </div>
            <div className="flex gap-2 mt-4">
              <span className="text-[10px] px-2.5 py-1 rounded-lg bg-white/[0.03] text-foreground/25 border border-white/[0.05]">多场景输出</span>
              <span className="text-[10px] px-2.5 py-1 rounded-lg bg-white/[0.03] text-foreground/25 border border-white/[0.05]">批量处理</span>
              <span className="text-[10px] px-2.5 py-1 rounded-lg bg-white/[0.03] text-foreground/25 border border-white/[0.05]">视觉统一</span>
            </div>
          </div>
          <div className="glass p-6">
            <h3 className="font-semibold text-sm mb-2">独立品牌</h3>
            <p className="text-xs text-foreground/30 leading-relaxed">个人品牌需要统一的视觉语言。自定义背景，打造品牌专属风格。</p>
          </div>
          <div className="glass p-6">
            <h3 className="font-semibold text-sm mb-2">球鞋 & 潮流</h3>
            <p className="text-xs text-foreground/30 leading-relaxed">限量单品值得更好的呈现。多场景展示，提升转售价值。</p>
          </div>
          <div className="md:col-span-2 glass p-6">
            <h3 className="font-semibold text-sm mb-2">社交电商</h3>
            <p className="text-xs text-foreground/30 leading-relaxed max-w-md">Instagram Shop、Facebook Marketplace、闲鱼——让你的产品照在信息流中与众不同。</p>
          </div>
        </div>
      </section>
      </ScrollReveal>



      {/* ======== BEFORE / AFTER ======== */}

      <ScrollReveal>
      <section className="max-w-4xl mx-auto px-6 py-12 md:py-20">
        <p className="text-[11px] text-purple-400 font-semibold tracking-widest uppercase mb-3 text-center">Gallery</p>
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-10 text-center">
          <span className="gradient-text">处理前后</span> 对比
        </h2>
        <div className="glass p-3 md:p-4">
          <CompareSlider
            before="https://picsum.photos/seed/product-plain/800/600"
            after="https://picsum.photos/seed/product-styled/800/600"
            beforeLabel="上传原图"
            afterLabel="AI 场景替换"
          />
        </div>
        <p className="text-center text-[11px] text-foreground/18 mt-5">
          拖拽滑块对比 · 自动播放中 · 悬停可暂停
        </p>
      </section>
      </ScrollReveal>



      {/* ======== METRICS + CLOSING — above sticky stack ======== */}
      <div className="relative z-50 bg-background">
      <ScrollReveal>
      <section className="max-w-3xl mx-auto px-6 py-10">
        <div className="glass p-8 grid grid-cols-3 gap-6 text-center">
          {[
            { value: "¥1", label: "试用起步" },
            { value: "<30s", label: "平均处理耗时" },
            { value: "原图", label: "输出分辨率" },
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
          准备好<span className="gradient-text">升级产品视觉</span>了吗？
        </h2>
        <p className="text-sm text-foreground/25 max-w-md mx-auto mb-10 leading-relaxed">
          ¥1 即体验完整流程。不满意，不收费。
        </p>

        <Link href="/background-replace/new">
          <MagneticButton size="lg" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 border-0 shadow-xl shadow-purple-500/25 h-12 px-10 text-sm font-medium rounded-full">
            立即体验
          </MagneticButton>
        </Link>

        <p className="mt-10 text-[10px] text-foreground/15">© 2026 FrameCraft · 产品照片背景替换</p>
      </section>
      </ScrollReveal>
      </div>
    </div>
  );
}
