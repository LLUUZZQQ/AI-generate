import { Worker } from "bullmq";
import { redis } from "@/lib/redis";
import { prisma } from "@/lib/db";

const captionTemplates = [
  (title: string) => `这个${title}也太绝了吧！AI 生成的效果直接封神 🔥`,
  (title: string) => `${title} 这个话题必须跟！看看 AI 是怎么玩的 👀`,
  (title: string) => `被${title}刷屏了！我也用 AI 整了一个，效果炸裂 💥`,
  (title: string) => `不会还有人没看过${title}吧？AI 版本来了 ✨`,
  (title: string) => `${title} x AI，这波操作你给几分？评论区告诉我 👇`,
  (title: string) => `蹭上${title}的热度，AI 直接帮我出片了 🚀`,
];

const timeSlots = [
  ["12:00-13:00", "18:00-19:00", "21:00-22:00"],
  ["07:00-08:00", "12:00-13:00", "20:00-21:00"],
  ["11:30-12:30", "17:00-18:00", "22:00-23:00"],
  ["08:00-09:00", "13:00-14:00", "19:00-20:00"],
];

const bgmPool = [
  [{ name: "热门BGM·轻快节奏" }, { name: "抖音热歌·氛围感" }],
  [{ name: "卡点BGM·高燃节奏" }, { name: "治愈纯音乐" }],
  [{ name: "潮流说唱·态度拉满" }, { name: "国风电子·惊艳感" }],
  [{ name: "影视OST·情感共鸣" }, { name: "复古disco·律动" }],
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const worker = new Worker("suggest-queue", async (job) => {
  const { contentId } = job.data;

  const content = await prisma.content.findUnique({
    where: { id: contentId },
    include: { topic: true },
  });

  if (!content) return;

  const topicTitle = content.topic.title;
  const suggestion = {
    bestTimes: pick(timeSlots),
    caption: pick(captionTemplates)(topicTitle),
    hashtags: [`#${topicTitle}`, `#AI生成`, `#${content.type === "video" ? "短视频" : "创意视觉"}`, `#爆款内容`],
    bgm: pick(bgmPool),
  };

  await prisma.publishSuggestion.upsert({
    where: { contentId },
    update: suggestion,
    create: { contentId, ...suggestion },
  });
}, { connection: redis, concurrency: 1 });

console.log("Suggestion worker started");
