import { Worker } from "bullmq";
import { redis } from "@/lib/redis";
import { prisma } from "@/lib/db";

interface TrendItem {
  title: string;
  description?: string;
  category: string;
  heatScore: number;
  platformId: string;
}

function analyzeHeatHistory(existing: any[], newScore: number) {
  const now = new Date().toISOString();
  const updated = [...existing, { time: now, score: newScore }].slice(-72);
  const trend = updated.length >= 2
    ? updated[updated.length - 1].score > updated[updated.length - 2].score ? "rising" : "falling"
    : "rising";
  return { history: updated, status: newScore > 8000 ? "peak" : trend };
}

const worker = new Worker("trend:queue", async (job) => {
  const items = job.data as TrendItem[];

  for (const item of items) {
    const existing = await prisma.trendingTopic.findFirst({
      where: { platformId: item.platformId },
    });

    const { history, status } = analyzeHeatHistory(
      (existing?.heatHistory as any[]) || [],
      item.heatScore,
    );

    if (existing) {
      await prisma.trendingTopic.update({
        where: { id: existing.id },
        data: { heatScore: item.heatScore, heatHistory: history, status, fetchedAt: new Date() },
      });
    } else {
      await prisma.trendingTopic.create({
        data: {
          title: item.title,
          description: item.description,
          category: item.category,
          heatScore: item.heatScore,
          heatHistory: history,
          platformId: item.platformId,
          status,
        },
      });
    }
  }
}, { connection: redis, concurrency: 1 });

console.log("Trend worker started");
