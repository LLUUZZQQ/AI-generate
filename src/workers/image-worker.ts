import { Worker } from "bullmq";
import { redis } from "@/lib/redis";
import { prisma } from "@/lib/db";
import { getModelAdapter } from "@/lib/models/registry";
import { suggestQueue } from "@/lib/queue";

const worker = new Worker("image:queue", async (job) => {
  const { contentId, modelId, prompt, params } = job.data;

  await prisma.content.update({ where: { id: contentId }, data: { status: "processing" } });

  try {
    const adapter = await getModelAdapter(modelId);
    const result = await adapter.generateImage({ prompt, ...params });

    await prisma.content.update({
      where: { id: contentId },
      data: { status: "done", fileUrl: result.fileUrl, thumbnailUrl: result.thumbnailUrl, metadata: result.metadata },
    });

    // Trigger suggestion generation
    await suggestQueue.add("suggest", { contentId }, { jobId: `suggest-${contentId}` });
  } catch (e: any) {
    await prisma.content.update({
      where: { id: contentId },
      data: { status: "failed", metadata: { error: e.message } },
    });
  }
}, { connection: redis, concurrency: 3 });

console.log("Image worker started");
