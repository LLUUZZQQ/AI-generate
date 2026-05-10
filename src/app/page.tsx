import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/db";

const categoryLabels: Record<string, string> = {
  challenge: "挑战赛", music: "BGM", hashtag: "话题", event: "事件",
};
const icons: Record<string, string> = {
  challenge: "🏆", music: "🎵", hashtag: "#️⃣", event: "📅",
};

function NodeDecorator({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <rect x="0" y="4" width="6" height="8" rx="2" stroke="currentColor" strokeWidth="1.2" />
      <rect x="10" y="4" width="6" height="8" rx="2" stroke="currentColor" strokeWidth="1.2" />
      <line x1="6" y1="8" x2="10" y2="8" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

export default async function LandingPage() {
  const hotTopics = await prisma.trendingTopic.findMany({
    orderBy: { heatScore: "desc" },
    take: 6,
  });

  return (
    <div>
      {/* ======== HERO ======== */}
      <section className="relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full bg-purple-500/12 blur-[140px]" />
          <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] rounded-full bg-amber-500/6 blur-[100px]" />
          <div className="absolute bottom-0 left-1/3 w-[500px] h-[300px] rounded-full bg-pink-500/5 blur-[120px]" />
        </div>

        <div className="relative max-w-4xl mx-auto px-6 pt-28 pb-20 text-center">
          {/* Status pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/[0.06] bg-white/[0.02] text-[11px] text-white/40 mb-10 animate-fade-in">
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
            实时追踪抖音热点 · AI 驱动内容创作
          </div>

          {/* Main headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight leading-[1.08] mb-6 animate-fade-in-up">
            <span className="text-white/90">AI 创作</span>
            <br />
            <span className="gradient-text">爆款内容引擎</span>
          </h1>

          <p className="text-base sm:text-lg text-white/35 max-w-lg mx-auto mb-10 leading-relaxed animate-fade-in-up delay-1">
            追踪热点 · 智能分析 · 一键出片。让 AI 成为你的创作伙伴，打造刷屏级爆款内容。
          </p>

          {/* Dual CTA */}
          <div className="flex items-center gap-3 justify-center animate-fade-in-up delay-2">
            <Link href="/register">
              <Button size="lg" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 shadow-xl shadow-purple-500/25 h-12 px-8 text-sm font-semibold rounded-full">
                免费注册 · 送 20 积分
              </Button>
            </Link>
            <Link href="/trends">
              <Button variant="outline" size="lg" className="h-12 px-8 text-sm font-medium border-white/[0.08] hover:bg-white/[0.03] rounded-full">
                浏览趋势 ↗
              </Button>
            </Link>
          </div>

          {/* Big numbers */}
          <div className="grid grid-cols-3 gap-8 max-w-md mx-auto mt-16 pt-12 border-t border-white/[0.05] animate-fade-in-up delay-3">
            {[
              { value: "9+", label: "实时热门话题" },
              { value: "24h", label: "全天候追踪更新" },
              { value: "3s", label: "AI 极速出片" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-bold gradient-text tabular-nums">{s.value}</div>
                <div className="text-[10px] text-white/25 mt-1.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-background to-transparent pointer-events-none" />
      </section>

      {/* ======== TRUST STRIP ======== */}
      <section className="max-w-4xl mx-auto px-6 py-10">
        <div className="glass rounded-2xl px-8 py-5 flex items-center justify-center gap-8 flex-wrap">
          {["抖音热搜", "AI生成", "智能分析", "爆款文案", "发布建议"].map((item) => (
            <span key={item} className="text-xs text-white/25 font-medium tracking-wide hover:text-white/45 transition-colors">{item}</span>
          ))}
        </div>
      </section>

      {/* ======== HOT TOPICS ======== */}
      {hotTopics.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 py-16">
          <div className="flex items-center gap-3 mb-2">
            <NodeDecorator className="text-purple-500/60" />
            <p className="text-[11px] text-purple-400 font-semibold tracking-widest uppercase">Trending Now</p>
          </div>
          <div className="flex items-end justify-between mb-8">
            <h2 className="text-3xl font-bold tracking-tight">🔥 实时热门话题</h2>
            <Link href="/trends" className="text-xs text-white/30 hover:text-white/60 transition-colors flex items-center gap-1">
              查看全部 <span>↗</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {hotTopics.map((topic, i) => (
              <Link key={topic.id} href={`/trends/${topic.id}`} className={`animate-fade-in-up delay-${i + 1}`}>
                <div className="glass rounded-xl p-5 transition-all duration-300 group">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{icons[topic.category]}</span>
                      <Badge variant="outline" className="text-[10px] border-white/8 text-white/40">
                        {categoryLabels[topic.category]}
                      </Badge>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      topic.status === "peak" ? "bg-amber-400/10 text-amber-400" :
                      topic.status === "rising" ? "bg-emerald-400/10 text-emerald-400" :
                      "bg-white/5 text-white/30"
                    }`}>
                      {topic.status === "peak" ? "爆火" : topic.status === "rising" ? "上升" : "降温"}
                    </span>
                  </div>
                  <h3 className="font-semibold text-sm mb-3 group-hover:text-purple-300 transition-colors">{topic.title}</h3>
                  <div className="flex items-center justify-between">
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold text-purple-400 tabular-nums">{topic.heatScore.toLocaleString()}</span>
                      <span className="text-[10px] text-white/25">热度</span>
                    </div>
                    <span className="text-[10px] text-white/15">{topic.status === "peak" ? "爆火中" : topic.status === "rising" ? "上升中" : "降温中"}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ======== FEATURES ======== */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-14">
          <div className="flex items-center justify-center gap-3 mb-2">
            <NodeDecorator className="text-purple-500/60" />
            <p className="text-[11px] text-purple-400 font-semibold tracking-widest uppercase">Features</p>
            <NodeDecorator className="text-purple-500/60 rotate-180" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight">了解 ✦ AI爆款 ✦ 运行方式</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { icon: "🔥", title: "实时趋势追踪", desc: "7×24 监控抖音热搜，AI 预测话题爆发趋势。比任何人工追热点都更快、更准。" },
            { icon: "🎨", title: "多模型 AI 生成", desc: "集成 DALL·E 等主流模型，高质量出图。一张图最快 3 秒，视频内容同样轻松驾驭。" },
            { icon: "📝", title: "智能发布建议", desc: "AI 推荐最佳发布时间、爆款配文、热门标签和 BGM。不只是生成，更帮你发布。" },
          ].map((f, i) => (
            <div key={f.title} className={`glass rounded-xl p-6 animate-fade-in-up delay-${i + 1} group`}>
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="font-semibold text-sm mb-2">{f.title}</h3>
              <p className="text-xs text-white/30 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ======== CLOSING BANNER ======== */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <div className="flex items-center justify-center gap-4 mb-6">
          <NodeDecorator className="text-purple-500/40 w-5 h-5" />
          <NodeDecorator className="text-amber-500/40 w-5 h-5" />
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-6">
          构建 ✦ <span className="gradient-text">尚不存在</span> ✦ 的内容
        </h2>
        <p className="text-sm text-white/30 max-w-md mx-auto mb-8 leading-relaxed">
          最强大的 AI 创作引擎。从热点追踪到内容生成，一站式打造刷屏级爆款。
        </p>
        <div className="flex items-center gap-3 justify-center">
          <Link href="/register">
            <Button size="lg" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 border-0 shadow-xl shadow-purple-500/25 h-12 px-8 text-sm font-semibold rounded-full">
              开始创作 ↗
            </Button>
          </Link>
          <Link href="/trends">
            <Button variant="outline" size="lg" className="h-12 px-8 text-sm border-white/[0.08] hover:bg-white/[0.03] rounded-full">
              探索趋势
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
