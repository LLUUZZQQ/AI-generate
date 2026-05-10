import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/db";

const categoryLabels: Record<string, string> = {
  challenge: "挑战赛", music: "BGM", hashtag: "话题", event: "事件",
};
const statusBadge: Record<string, string> = {
  rising: "📈", peak: "🔥", falling: "📉",
};
const icons: Record<string, string> = {
  challenge: "🏆", music: "🎵", hashtag: "#️⃣", event: "📅",
};

export default async function LandingPage() {
  const hotTopics = await prisma.trendingTopic.findMany({
    orderBy: { heatScore: "desc" },
    take: 6,
  });

  return (
    <div>
      {/* Animated Hero */}
      <section className="relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full bg-purple-500/15 blur-[120px]" />
          <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] rounded-full bg-amber-500/8 blur-[100px]" />
        </div>

        <div className="relative max-w-4xl mx-auto px-6 pt-24 pb-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs text-white/60 mb-8 animate-fade-in">
            <span className="size-2 rounded-full bg-green-400 animate-pulse" />
            实时追踪 · AI 驱动
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-tight animate-fade-in-up">
            追踪抖音热点
            <br />
            <span className="gradient-text">AI 生成爆款内容</span>
          </h1>

          <p className="text-base sm:text-lg text-white/50 max-w-xl mx-auto mb-10 animate-fade-in-up delay-1">
            实时监控抖音热门话题，AI 智能分析趋势，一键生成爆款图片与视频，附带智能发布建议。
          </p>

          <div className="flex gap-4 justify-center animate-fade-in-up delay-2">
            <Link href="/register">
              <Button size="lg" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 shadow-lg shadow-purple-500/25 h-12 px-8 text-base">
                免费注册 · 送 20 积分
              </Button>
            </Link>
            <Link href="/trends">
              <Button variant="outline" size="lg" className="h-12 px-8 text-base border-white/15 hover:bg-white/5">
                浏览趋势
              </Button>
            </Link>
          </div>

          {/* Stats row */}
          <div className="flex justify-center gap-12 mt-16 animate-fade-in-up delay-3">
            {[
              { value: "9+", label: "热门话题" },
              { value: "24h", label: "实时更新" },
              { value: "3s", label: "快速生成" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-bold gradient-text">{s.value}</div>
                <div className="text-xs text-white/40 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
      </section>

      {/* Hot Topics */}
      {hotTopics.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 py-16">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-xs text-purple-400 font-medium mb-2 tracking-wider uppercase">Trending Now</p>
              <h2 className="text-2xl font-bold">🔥 实时热门话题</h2>
            </div>
            <Link href="/trends" className="text-sm text-white/50 hover:text-white transition-colors">
              查看全部 →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {hotTopics.map((topic, i) => (
              <Link key={topic.id} href={`/trends/${topic.id}`} className={`animate-fade-in-up delay-${i + 1}`}>
                <div className="glass rounded-xl p-5 transition-all duration-300 group">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{icons[topic.category]}</span>
                      <Badge variant="outline" className="text-[10px] border-white/10 text-white/50">
                        {categoryLabels[topic.category]}
                      </Badge>
                    </div>
                    <span className="text-[10px] text-white/30">{statusBadge[topic.status]}</span>
                  </div>
                  <h3 className="font-semibold text-sm mb-3 group-hover:text-purple-300 transition-colors">{topic.title}</h3>
                  <div className="flex items-center justify-between">
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold text-purple-400">{topic.heatScore.toLocaleString()}</span>
                      <span className="text-[10px] text-white/30">热度</span>
                    </div>
                    <span className="text-[10px] text-white/20">{topic.status === "peak" ? "爆火中" : topic.status === "rising" ? "上升中" : "降温中"}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <p className="text-xs text-purple-400 font-medium mb-2 tracking-wider uppercase">Features</p>
          <h2 className="text-2xl font-bold">为什么选择 AI爆款</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: "🔥", title: "实时趋势追踪", desc: "7×24 监控抖音热搜，AI 预测话题爆发趋势，让你永远快人一步" },
            { icon: "🎨", title: "多模型 AI 生成", desc: "集成 DALL·E 等主流模型，高质量出图，一张图最快 3 秒生成" },
            { icon: "📝", title: "智能发布建议", desc: "AI 推荐最佳发布时间、爆款配文、热门标签和 BGM，提升爆款概率" },
          ].map((f, i) => (
            <div key={f.title} className={`glass rounded-xl p-6 animate-fade-in-up delay-${i + 1}`}>
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-white/40 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-4xl mx-auto px-6 py-16 text-center">
        <p className="text-xs text-purple-400 font-medium mb-2 tracking-wider uppercase">Pricing</p>
        <h2 className="text-2xl font-bold mb-10">简单定价，按需付费</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { name: "基础包", credits: 50, price: 15, rec: false },
            { name: "进阶包", credits: 120, price: 30, rec: true },
            { name: "专业包", credits: 300, price: 60, rec: false },
          ].map((plan, i) => (
            <div key={plan.name} className={`rounded-xl p-6 text-center transition-all ${plan.rec ? "gradient-border bg-white/[0.06]" : "glass"} animate-fade-in-up delay-${i + 1}`}>
              {plan.rec && <Badge className="mb-2 bg-purple-500/20 text-purple-300 border-0 text-[10px]">最受欢迎</Badge>}
              <h3 className="font-semibold mb-3">{plan.name}</h3>
              <div className="text-4xl font-bold mb-1">{plan.credits}<span className="text-sm font-normal text-white/40 ml-1">积分</span></div>
              <p className="text-white/30 text-sm mb-4">¥{plan.price}</p>
              <Link href="/register">
                <Button variant={plan.rec ? "default" : "outline"} size="sm" className={`w-full ${plan.rec ? "bg-gradient-to-r from-purple-500 to-pink-500 border-0" : ""}`}>
                  开始使用
                </Button>
              </Link>
            </div>
          ))}
        </div>
        <p className="text-sm text-white/30 mt-6">新用户注册即送 20 积分，先体验再付费</p>
      </section>
    </div>
  );
}
