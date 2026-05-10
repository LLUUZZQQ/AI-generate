import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const predictions: Record<string, any> = {
  t1: { summary: "该话题正处于爆发期，预计未来24小时热度将持续攀升至10000以上，建议立即跟进创作", trend: "strong_up", peak_in: "12h", competition: "medium" },
  t2: { summary: "话题热度稳步上升中，周末出行相关内容的搜索量增长明显，预计48小时内达到峰值", trend: "up", peak_in: "48h", competition: "low" },
  t3: { summary: "AI相关话题近年来持续走热，结合娱乐化的表达形式易出爆款，建议搭配创意视觉效果", trend: "strong_up", peak_in: "24h", competition: "high" },
  t4: { summary: "翻唱类话题周期性波动较大，当前处于峰值附近，建议结合个人特色差异化创作", trend: "stable", peak_in: "now", competition: "high" },
  t5: { summary: "节假日相关话题热度正在上升，实用性内容更容易获得收藏和转发，建议突出避坑要点", trend: "up", peak_in: "36h", competition: "medium" },
  t6: { summary: "话题已过峰值期，热度处于下行通道，不建议投入主力内容，可做长尾维护", trend: "down", peak_in: "passed", competition: "low" },
  t7: { summary: "运动类话题受众广泛，参与门槛低，热度持续上升中，适合做挑战类内容", trend: "up", peak_in: "24h", competition: "medium" },
  t8: { summary: "国风文化持续流行，变装类内容的完播率高，建议搭配高质量视觉和BGM", trend: "up", peak_in: "18h", competition: "high" },
  t9: { summary: "音乐分享类话题受众黏性强，但热度增长缓慢，适合作为内容补充而非主力", trend: "slow_up", peak_in: "72h", competition: "low" },
};

async function main() {
  for (const [id, pred] of Object.entries(predictions)) {
    await prisma.trendingTopic.update({ where: { id }, data: { aiPrediction: pred } });
  }
  console.log(`Updated ${Object.keys(predictions).length} topics with AI predictions`);
  await prisma.$disconnect();
}

main();
