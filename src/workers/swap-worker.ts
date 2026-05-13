import { Worker } from "bullmq";
import { getRedis } from "@/lib/redis";
import { prisma } from "@/lib/db";
import { getSwapAdapter } from "@/lib/models/registry";
import { userFriendlyError } from "@/lib/error-messages";
import { suggestQueue } from "@/lib/queue";

const redis = getRedis();
if (redis) { const worker = new Worker("swap-queue", async (job) => {
  const { contentId, modelId, prompt, params } = job.data;

  await prisma.content.update({ where: { id: contentId }, data: { status: "processing" } });

  try {
    const adapter = await getSwapAdapter(modelId);
    const result = await adapter.generateSwap({
      prompt,
      characterPhoto: params?.characterPhoto,
      referenceVideo: params?.referenceVideo,
    });

    await prisma.content.update({
      where: { id: contentId },
      data: { status: "done", fileUrl: result.fileUrl, thumbnailUrl: result.thumbnailUrl, metadata: result.metadata },
    });

    const sq = suggestQueue.get();
    if (sq) await sq.add("suggest", { contentId }, { jobId: `suggest-${contentId}` });
  } catch (e: any) {
    await prisma.content.update({
      where: { id: contentId },
      data: { status: "failed", metadata: { error: userFriendlyError(e.message), rawError: e.message } },
    });
  }
}, { connection: redis, concurrency: 1 });

console.log("Swap worker started");
}
