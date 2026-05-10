import { prisma } from "@/lib/db";
import { fetchTrendingTopics } from "./trend-fetcher";

const REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes

function analyzeHeatHistory(existing: any[], newScore: number) {
  const now = new Date().toISOString();
  const updated = [...existing, { time: now, score: newScore }].slice(-72);
  const trend =
    updated.length >= 2
      ? updated[updated.length - 1].score > updated[updated.length - 2].score
        ? "rising"
        : "falling"
      : "rising";
  return {
    history: updated,
    status: newScore > 8000 ? "peak" : trend,
  };
}

async function runFetch() {
  console.log(`[TrendWorker] Fetching at ${new Date().toISOString()}`);
  try {
    const items = await fetchTrendingTopics();
    console.log(`[TrendWorker] Got ${items.length} topics`);

    for (const item of items) {
      const existing = await prisma.trendingTopic.findFirst({
        where: { platformId: item.platformId },
      });

      const { history, status } = analyzeHeatHistory(
        (existing?.heatHistory as any[]) || [],
        item.heatScore
      );

      if (existing) {
        await prisma.trendingTopic.update({
          where: { id: existing.id },
          data: {
            heatScore: item.heatScore,
            heatHistory: history,
            status,
            title: item.title,
            description: item.description,
            category: item.category,
            fetchedAt: new Date(),
          },
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

    console.log(`[TrendWorker] Done updating ${items.length} topics`);
  } catch (err: any) {
    console.error(`[TrendWorker] Error: ${err.message}`);
  }
}

runFetch();
setInterval(runFetch, REFRESH_INTERVAL);
console.log(`[TrendWorker] Started, refresh every ${REFRESH_INTERVAL / 60000}min`);

process.on("SIGTERM", () => process.exit(0));
