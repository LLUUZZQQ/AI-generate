import { Worker } from "bullmq";
import { redis } from "@/lib/redis";
import { prisma } from "@/lib/db";

const worker = new Worker("suggest-queue", async (job) => {
  const { contentId } = job.data;

  const content = await prisma.content.findUnique({
    where: { id: contentId },
    include: { topic: true },
  });

  if (!content) return;

  const suggestion = {
    bestTimes: ["12:00-13:00", "18:00-19:00", "21:00-22:00"],
    caption: `${content.topic.title} 太火了！AI 生成的这个效果绝了 🔥 #${content.topic.title}`,
    hashtags: [`#${content.topic.title}`, `#AI生成`, `#爆款内容`, `#抖音热门`],
    bgm: [{ name: "热门BGM推荐1" }, { name: "热门BGM推荐2" }],
  };

  await prisma.publishSuggestion.upsert({
    where: { contentId },
    update: suggestion,
    create: { contentId, ...suggestion },
  });
}, { connection: redis, concurrency: 1 });

console.log("Suggestion worker started");
