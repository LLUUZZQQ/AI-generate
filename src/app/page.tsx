import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Marquee } from "@/components/ui/marquee";
import { AccordionCard } from "@/components/ui/accordion-card";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { CountUp } from "@/components/ui/count-up";
import { NodeLeft, NodeRight, NodeUnion, NodeLink } from "@/components/ui/node-icons";
import { prisma } from "@/lib/db";

export default async function LandingPage() {
  const hotTopics = await prisma.trendingTopic.findMany({
    orderBy: { heatScore: "desc" },
    take: 4,
  });

  return (
    <div>
      {/* ======== HERO ======== */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] rounded-full bg-purple-500/10 blur-[150px]" />
          <div className="absolute top-1/2 right-1/4 w-[400px] h-[400px] rounded-full bg-amber-500/5 blur-[120px]" />
        </div>

        <div className="relative max-w-4xl mx-auto px-6 pt-32 pb-24 text-center">
          {/* Node decorator above headline */}
          <div className="flex items-center justify-center gap-4 mb-8 animate-fade-in">
            <NodeLeft className="text-purple-500/60 w-8 h-8" />
            <div className="size-1.5 rounded-full bg-purple-500/60" />
            <NodeRight className="text-purple-500/60 w-8 h-8" />
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight leading-[1.05] mb-6 animate-fade-in-up">
            <span className="text-white/85">视觉 AI 的</span>
            <br />
            <span className="gradient-text">最强可控性</span>
          </h1>

          <p className="text-base sm:text-lg text-white/30 max-w-lg mx-auto mb-12 leading-relaxed animate-fade-in-up delay-1">
            从热点追踪到内容生成，一站式 AI 创作引擎。
            <br />
            数千条工作流，一个比任何平台都更快的速度。
          </p>

          {/* Dual CTA — Comfy style */}
          <div className="flex items-center gap-3 justify-center animate-fade-in-up delay-2">
            <Link href="/register">
              <Button size="lg" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 shadow-xl shadow-purple-500/25 h-12 px-8 text-sm font-semibold rounded-full">
                免费注册
              </Button>
            </Link>
            <Link href="/trends">
              <Button variant="outline" size="lg" className="h-12 px-8 text-sm font-medium border-white/10 hover:bg-white/[0.03] rounded-full">
                探索趋势 ↗
              </Button>
            </Link>
          </div>

          {/* Data statement */}
          <div className="mt-16 text-center animate-fade-in-up delay-3">
            <p className="text-3xl font-bold gradient-text tabular-nums mb-2">
              <CountUp end={9216} suffix="+" duration={2000} />
            </p>
            <p className="text-xs text-white/25">个话题正在追踪，AI 驱动的内容创作社区正在成长</p>
          </div>
        </div>

        <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-background to-transparent pointer-events-none" />
      </section>

      {/* ======== TRUST MARQUEE ======== */}
      <ScrollReveal>
      <section className="py-8">
        <div className="glass rounded-2xl max-w-3xl mx-6 sm:mx-auto overflow-hidden">
          <Marquee items={[
            "抖音热搜实时追踪", "AI 智能趋势分析", "DALL·E 图片生成", "爆款文案推荐",
            "最佳发布时间建议", "热门 BGM 匹配", "一键生成爆款内容", "全方位发布指导"
          ]} />
        </div>
      </section>
      </ScrollReveal>

      {/* ======== ACCORDION FEATURES ======== */}
      <ScrollReveal>
      <section className="max-w-3xl mx-auto px-6 py-16">
        <div className="flex items-center gap-3 mb-2">
          <NodeLeft className="text-purple-500/60" />
          <p className="text-[11px] text-purple-400 font-semibold tracking-widest uppercase">Features</p>
          <NodeRight className="text-purple-500/60" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight mb-10">
          了解 <span className="gradient-text">✦ AI爆款 ✦</span> 运行方式
        </h2>

        <div className="space-y-3">
          <AccordionCard
            title="节点带来的可控性"
            desc="不只是生成图片——精准控制每一个创作环节"
            details="从话题选择、模型匹配、提示词优化到参数调节，每一个步骤都给你精细控制权。你可以反复迭代，直到得到满意的结果。这不是黑盒生成器，这是你的创作引擎。"
          />
          <AccordionCard
            title="趋势发现模式"
            desc="实时追踪 + AI 预测，永远快人一步"
            details="系统 7x24 小时监控抖音热搜，AI 自动分析话题走势，预测下一个爆发点。你可以在热度上升期就介入创作，抢占流量红利窗口。支持按分类筛选、关键词搜索、热度排序。"
          />
          <AccordionCard
            title="社区工作流"
            desc="探索数千条创作模板，从社区中获取灵感"
            details="每个热门话题都是一个创作入口。浏览社区中其他创作者的作品，了解他们用了什么提示词和参数设置。一键复用成功的工作流，或者在此基础上改造创新。"
          />
        </div>
      </section>
      </ScrollReveal>

      {/* ======== HOT TOPICS ======== */}
      {hotTopics.length > 0 && (
        <ScrollReveal>
        <section className="max-w-5xl mx-auto px-6 py-16">
          <div className="flex items-center gap-3 mb-2">
            <NodeLeft className="text-amber-500/60" />
            <p className="text-[11px] text-amber-400 font-semibold tracking-widest uppercase">Trending</p>
            <NodeRight className="text-amber-500/60" />
          </div>
          <div className="flex items-end justify-between mb-8">
            <h2 className="text-3xl font-bold tracking-tight">使用 AI爆款 创作的热门话题</h2>
            <Link href="/trends" className="text-xs text-white/30 hover:text-white/60 transition-colors">
              查看全部 ↗
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {hotTopics.map((topic, i) => (
              <Link key={topic.id} href={`/trends/${topic.id}`} className={`animate-fade-in-up delay-${i + 1}`}>
                <div className="glass rounded-xl p-5 transition-all duration-300 group flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/[0.04] text-white/40 border border-white/[0.06]">
                        {topic.category === "challenge" ? "挑战赛" : topic.category === "music" ? "BGM" : topic.category === "hashtag" ? "话题" : "事件"}
                      </span>
                      <span className={`text-[10px] ${topic.status === "peak" ? "text-amber-400" : topic.status === "rising" ? "text-emerald-400" : "text-white/30"}`}>
                        {topic.status === "peak" ? "爆火" : topic.status === "rising" ? "上升中" : "降温中"}
                      </span>
                    </div>
                    <h3 className="font-semibold text-sm truncate group-hover:text-purple-300 transition-colors">{topic.title}</h3>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <div className="text-lg font-bold text-purple-400 tabular-nums">{topic.heatScore.toLocaleString()}</div>
                    <div className="text-[10px] text-white/20">热度</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
        </ScrollReveal>
      )}

      {/* ======== HOW IT WORKS ======== */}
      <ScrollReveal>
      <section className="max-w-3xl mx-auto px-6 py-16">
        <div className="flex items-center gap-3 mb-2">
          <NodeLeft className="text-purple-500/60" />
          <p className="text-[11px] text-purple-400 font-semibold tracking-widest uppercase">How It Works</p>
          <NodeRight className="text-purple-500/60" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight mb-10">几分钟即可上手</h2>

        <div className="space-y-6">
          {[
            { step: "01", title: "发现或搜索话题", desc: "浏览实时热门趋势，或直接搜索你感兴趣的领域。每个话题附带 AI 趋势分析，帮你判断是否值得投入。" },
            { step: "02", title: "AI 生成内容", desc: "选择 AI 模型，输入创意提示词。点击生成，数秒内获得高质量图片或视频。不满意？调整参数再来一次。" },
            { step: "03", title: "获取发布建议", desc: "生成完成后，AI 自动分析最佳发布时机，推荐爆款配文、热门标签和 BGM，助你精准发布，获取最大流量。" },
          ].map((s, i) => (
            <div key={s.step} className="flex gap-5 animate-fade-in-up" style={{ animationDelay: `${0.1 * (i + 1)}s` }}>
              <div className="text-3xl font-bold text-white/[0.04] shrink-0 w-12">{s.step}</div>
              <div>
                <h3 className="font-semibold mb-1.5">{s.title}</h3>
                <p className="text-xs text-white/30 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      </ScrollReveal>

      {/* ======== CLOSING ======== */}
      <ScrollReveal>
      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <div className="flex items-center justify-center gap-6 mb-8">
          <NodeLeft className="text-purple-500/50 w-8 h-8" />
          <NodeUnion className="text-amber-500/50 w-6 h-6" />
          <NodeRight className="text-purple-500/50 w-8 h-8" />
        </div>

        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
          构建 <span className="gradient-text">✦ 尚不存在 ✦</span> 的内容
        </h2>
        <p className="text-sm text-white/25 max-w-md mx-auto mb-10 leading-relaxed">
          最强大的视觉 AI 工作流引擎。从热点追踪到内容生成，一站式创造刷屏级爆款。
        </p>

        <Link href="/register">
          <Button size="lg" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 border-0 shadow-xl shadow-purple-500/25 h-12 px-10 text-sm font-semibold rounded-full">
            开始创作 ↗
          </Button>
        </Link>

        <div className="flex items-center justify-center gap-2 mt-16 text-[10px] text-white/10">
          <NodeLink className="opacity-30" />
        </div>
      </section>
      </ScrollReveal>
    </div>
  );
}
