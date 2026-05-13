import { Worker } from "bullmq";
import { getRedis } from "@/lib/redis";
import { prisma } from "@/lib/db";
import { getModelAdapter } from "@/lib/models/registry";
import { userFriendlyError } from "@/lib/error-messages";
import { suggestQueue } from "@/lib/queue";

const redis = getRedis();
if (redis) { const worker = new Worker("video-queue", async (job) => {
  const { contentId, modelId, prompt, params } = job.data;

  await prisma.content.update({ where: { id: contentId }, data: { status: "processing" } });

  try {
    const adapter = await getModelAdapter(modelId);
    const result = await adapter.generateVideo({ prompt, ...params });

    await prisma.content.update({
      where: { id: contentId },
      data: { status: "done", fileUrl: result.fileUrl, thumbnailUrl: result.thumbnailUrl, metadata: result.metadata },
    });

    // Trigger suggestion generation
    const sq = suggestQueue.get();
    if (sq) await sq.add("suggest", { contentId }, { jobId: `suggest-${contentId}` });
  } catch (e: any) {
    await prisma.content.update({
      where: { id: contentId },
      data: { status: "failed", metadata: { error: userFriendlyError(e.message), rawError: e.message } },
    });
  }
}, { connection: redis, concurrency: 1 });

console.log("Video worker started");
}
