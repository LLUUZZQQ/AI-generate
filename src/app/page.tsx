import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div>
      <section className="text-center py-20 px-6 max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          追踪抖音热点，AI 生成爆款内容
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          实时监控抖音热门话题，AI 智能分析趋势，自动生成爆款图片和视频，附赠发布建议。
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/register"><Button size="lg">免费注册，送 20 积分</Button></Link>
          <Link href="/trends"><Button variant="outline" size="lg">浏览趋势</Button></Link>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="text-3xl mb-3">🔥</div>
            <h3 className="font-semibold mb-2">实时趋势追踪</h3>
            <p className="text-sm text-muted-foreground">24h 监控抖音热搜，AI 预测话题爆发趋势，让你抢占流量先机</p>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-3">🎨</div>
            <h3 className="font-semibold mb-2">多模型 AI 生成</h3>
            <p className="text-sm text-muted-foreground">DALL-E、Stable Diffusion、国产模型自由切换，一张图只需几秒</p>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-3">📝</div>
            <h3 className="font-semibold mb-2">智能发布建议</h3>
            <p className="text-sm text-muted-foreground">AI 推荐最佳发布时间、配文、标签和 BGM，提高爆款概率</p>
          </div>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 py-12 text-center">
        <h2 className="text-2xl font-bold mb-6">定价方案</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { name: "基础包", credits: 50, yuan: 15 },
            { name: "进阶包", credits: 120, yuan: 30 },
            { name: "专业包", credits: 300, yuan: 60 },
          ].map((plan) => (
            <div key={plan.name} className="border rounded-lg p-6">
              <h3 className="font-semibold mb-1">{plan.name}</h3>
              <p className="text-3xl font-bold">{plan.credits} <span className="text-sm font-normal text-muted-foreground">积分</span></p>
              <p className="text-muted-foreground text-sm">¥{plan.yuan}</p>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground mt-4">新用户注册即送 20 积分，先体验再付费</p>
      </section>

      <footer className="text-center py-8 text-sm text-muted-foreground border-t">
        <p>AI 爆款内容生成平台 © 2026</p>
      </footer>
    </div>
  );
}
