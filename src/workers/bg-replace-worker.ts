import { Worker } from "bullmq";
import { redis } from "@/lib/redis";
import { prisma } from "@/lib/db";
import { downloadFromS3, uploadToS3 } from "@/lib/s3";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { HfInference } from "@huggingface/inference";

const hasS3 = !!(process.env.S3_BUCKET && process.env.S3_ENDPOINT);

const hf = new HfInference(process.env.HF_TOKEN!);

const worker = new Worker("bg-replace-queue", async (job) => {
  const { taskId } = job.data;

  await prisma.bgReplaceTask.update({
    where: { id: taskId },
    data: { status: "processing" },
  });

  const task = await prisma.bgReplaceTask.findUnique({
    where: { id: taskId },
    include: { results: true },
  });
  if (!task) return;

  // Resolve background image
  let backgroundBuffer: Buffer | null = null;
  if (task.backgroundMode === "preset" && task.backgroundId) {
    const template = await prisma.backgroundTemplate.findUnique({ where: { id: task.backgroundId } });
    if (template) {
      // Extract key from fileUrl (format: /backgrounds/category/name.jpg or full S3 URL)
      const fileUrl = template.fileUrl;
      if (fileUrl.startsWith("http")) {
        const url = new URL(fileUrl);
        const key = url.pathname.substring(1);
        backgroundBuffer = await downloadFromS3(key);
      } else {
        // Local path: read from public dir
        const fs = await import("fs/promises");
        const path = await import("path");
        const filePath = path.join(process.cwd(), "public", fileUrl);
        backgroundBuffer = await fs.readFile(filePath);
      }
    }
  } else if (task.backgroundMode === "custom" && task.customBgKey) {
    backgroundBuffer = await downloadFromS3(task.customBgKey);
  }
  // ai mode: generate background per-image via Replicate (handled in processing loop)

  // Process each image
  for (const result of task.results) {
    try {
      let original: Buffer;
      if (result.originalKey.startsWith("http")) {
        const url = new URL(result.originalKey);
        const key = url.pathname.substring(1);
        original = await downloadFromS3(key);
      } else if (result.originalKey.includes("/")) {
        const key = result.originalKey.startsWith("/") ? result.originalKey.substring(1) : result.originalKey;
        original = await downloadFromS3(key);
      } else {
        const fs = await import("fs/promises");
        const path = await import("path");
        const filePath = path.join(process.cwd(), "public", "uploads", result.originalKey);
        original = await fs.readFile(filePath);
      }

      // Step 1: Remove background (call Replicate)
      const subjectBuffer = await removeBackground(original);

      // Step 2: Prepare background
      let bg = backgroundBuffer;
      if (task.backgroundMode === "ai") {
        bg = await generateBackground(task.aiPrompt || "indoor room, wooden floor, natural lighting, mobile phone photo");
      }
      if (!bg) {
        bg = await createSolidBackground("#f5f5f0");
      }

      // Step 3: Composite subject onto background
      const composited = await compositeImages(subjectBuffer, bg);

      // Step 4: Save result (S3 or local)
      let resultKey: string;
      if (hasS3) {
        resultKey = `results/${taskId}/${result.id}.png`;
        await uploadToS3(resultKey, composited, "image/png");
      } else {
        const resultDir = path.join(process.cwd(), "public", "results", taskId);
        await mkdir(resultDir, { recursive: true });
        const filename = `${result.id}.png`;
        await writeFile(path.join(resultDir, filename), composited);
        resultKey = `/results/${taskId}/${filename}`;
      }

      await prisma.bgReplaceResult.update({
        where: { id: result.id },
        data: { status: "done", resultKey, backgroundKey: task.customBgKey || undefined },
      });
    } catch (e: any) {
      await prisma.bgReplaceResult.update({
        where: { id: result.id },
        data: { status: "failed", error: e.message },
      });
    }
  }

  // Check if all results are done or failed
  const updatedResults = await prisma.bgReplaceResult.findMany({
    where: { taskId: task.id },
  });
  const allDone = updatedResults.every((r) => r.status === "done" || r.status === "failed");
  if (allDone) {
    const allFailed = updatedResults.every((r) => r.status === "failed");
    await prisma.bgReplaceTask.update({
      where: { id: taskId },
      data: { status: allFailed ? "failed" : "done" },
    });

    // Refund credits if all failed
    if (allFailed) {
      await prisma.user.update({
        where: { id: task.userId },
        data: { credits: { increment: task.cost } },
      });
      await prisma.creditTransaction.create({
        data: {
          userId: task.userId,
          amount: task.cost,
          type: "refund",
          description: `Refund for failed bg-replace task ${taskId}`,
          taskId,
        },
      });
    }
  }
}, { connection: redis, concurrency: 2 });

async function removeBackground(imageBuffer: Buffer): Promise<Buffer> {
  const blob = new Blob([new Uint8Array(imageBuffer)], { type: "image/png" });

  try {
    // Try synchronous first (HF may route to fal.ai which uses async queue)
    const result = await hf.imageSegmentation({ model: "briaai/RMBG-2.0", inputs: blob }) as any;

    // Handle async queue response (fal.ai)
    if (result?.status === "IN_QUEUE" && result?.response_url) {
      let pollResult = result;
      let attempts = 0;
      while (pollResult.status !== "COMPLETED" && attempts < 60) {
        await new Promise((r) => setTimeout(r, 2000));
        const pollRes = await fetch(result.response_url);
        const data = await pollRes.json();
        // Fal.ai returns nested response
        if (typeof data === "object" && data !== null && "status" in data) {
          pollResult = data as any;
        } else {
          // Got the actual result
          const imgRes = await fetch(data.image?.url || data.url || Object.values(data)[0] as string);
          return Buffer.from(await imgRes.arrayBuffer());
        }
        attempts++;
      }
      throw new Error("Background removal timed out");
    }

    // Handle synchronous result (Blob from HF direct)
    if (result instanceof Blob) {
      return Buffer.from(await result.arrayBuffer());
    }

    // Handle { image: { url: "..." } } format or similar
    if (result?.image?.url) {
      const imgRes = await fetch(result.image.url);
      return Buffer.from(await imgRes.arrayBuffer());
    }

    throw new Error(`Unexpected result format: ${JSON.stringify(result).slice(0, 200)}`);
  } catch (e: any) {
    if (e.message.includes("Background removal")) throw e;
    throw new Error(`Background removal failed: ${e.message}`);
  }
}

async function compositeImages(subjectBuffer: Buffer, bgBuffer: Buffer): Promise<Buffer> {
  const sharp = await import("sharp");
  const bgMetadata = await sharp.default(bgBuffer).metadata();
  const subjectMetadata = await sharp.default(subjectBuffer).metadata();

  if (!bgMetadata.width || !bgMetadata.height) throw new Error("Invalid background");
  if (!subjectMetadata.width || !subjectMetadata.height) throw new Error("Invalid subject");

  // Resize subject to fit naturally (65% of background width)
  const subjectWidth = Math.round(bgMetadata.width * 0.65);
  const subjectHeight = Math.round(subjectWidth * (subjectMetadata.height / subjectMetadata.width));

  const resizedSubject = await sharp.default(subjectBuffer)
    .resize(subjectWidth, subjectHeight, { fit: "inside" })
    .toBuffer();

  // Center subject on background, lower third vertically
  const left = Math.round((bgMetadata.width - subjectWidth) / 2);
  const top = Math.round(bgMetadata.height * 0.55 - subjectHeight / 2);

  return sharp.default(bgBuffer)
    .composite([{ input: resizedSubject, left, top }])
    .png()
    .toBuffer();
}

async function generateBackground(prompt: string): Promise<Buffer> {
  const fullPrompt = `${prompt}, photorealistic, natural lighting, casual smartphone photo, no text, no watermark, no overlay`;

  const result = await hf.textToImage({
    model: "stabilityai/stable-diffusion-xl-base-1.0",
    inputs: fullPrompt,
    parameters: { negative_prompt: "text, watermark, logo, overlay, product, object, person" },
  });

  if (typeof result === "string") {
    const res = await fetch(result);
    return Buffer.from(await res.arrayBuffer());
  }
  return Buffer.from(await (result as Blob).arrayBuffer());
}

async function createSolidBackground(color: string): Promise<Buffer> {
  const sharp = await import("sharp");
  return sharp.default({ create: { width: 1024, height: 1024, channels: 3, background: color } })
    .png()
    .toBuffer();
}

console.log("Background replace worker started");
