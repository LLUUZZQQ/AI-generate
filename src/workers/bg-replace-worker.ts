import "dotenv/config";
import { prisma } from "@/lib/db";
import { downloadFromS3, uploadToS3 } from "@/lib/s3";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const hasS3 = !!(process.env.S3_BUCKET && process.env.S3_ENDPOINT);
const POLL_INTERVAL = 3000; // 3 seconds

async function processTask(taskId: string) {

  await prisma.bgReplaceTask.update({
    where: { id: taskId },
    data: { status: "processing" },
  });

  const task = await prisma.bgReplaceTask.findUnique({
    where: { id: taskId },
    include: { results: true },
  });
  if (!task) return;

  let backgroundBuffer: Buffer | null = null;
  try {
    if (task.backgroundMode === "preset" && task.backgroundId) {
      const template = await prisma.backgroundTemplate.findUnique({ where: { id: task.backgroundId } });
      if (template) {
        const fileUrl = template.fileUrl;
        if (fileUrl.startsWith("http")) {
          const url = new URL(fileUrl);
          let key = url.pathname.substring(1);
          const bucket = process.env.S3_BUCKET;
          if (bucket && key.startsWith(bucket + "/")) key = key.substring(bucket.length + 1);
          console.log("[bg-worker] Template key:", key);
          backgroundBuffer = await downloadFromS3(key);
        } else {
          const fs = await import("fs/promises");
          const path = await import("path");
          const filePath = path.join(process.cwd(), "public", fileUrl);
          backgroundBuffer = await fs.readFile(filePath);
        }
      }
    } else if (task.backgroundMode === "custom" && task.customBgKey) {
      backgroundBuffer = await downloadFromS3(task.customBgKey);
    }
  } catch (e: any) {
    console.error("[bg-worker] Template download failed:", e.message, "— using solid color fallback");
  }

  for (const result of task.results) {
    try {
      console.log("[bg-worker] Downloading, originalKey:", result.originalKey, "S3_BUCKET:", process.env.S3_BUCKET);
      let original: Buffer;
      if (result.originalKey.startsWith("http")) {
        // S3 URL — extract path and strip bucket prefix
        const url = new URL(result.originalKey);
        let key = url.pathname.substring(1);
        // Strip bucket name if present
        const bucket = process.env.S3_BUCKET;
        if (bucket && key.startsWith(bucket + "/")) {
          key = key.substring(bucket.length + 1);
        }
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

      const subjectBuffer = await removeBackground(original);

      let bg = backgroundBuffer;
      if (task.backgroundMode === "ai") {
        bg = await generateBackground(task.aiPrompt || "indoor room, wooden floor, natural lighting, mobile phone photo");
      }
      if (!bg) {
        bg = await createSolidBackground("#f5f5f0");
      }

      const composited = await compositeImages(subjectBuffer, bg);

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
}

async function poll() {
  try {
    const task = await prisma.bgReplaceTask.findFirst({
      where: { status: "pending" },
      orderBy: { createdAt: "asc" },
    });
    if (!task) return;

    console.log("[bg-worker] Processing task:", task.id);
    try {
      await processTask(task.id);
    } catch (e: any) {
      console.error("[bg-worker] Task crashed:", task.id, e.message);
      await prisma.bgReplaceTask.update({
        where: { id: task.id },
        data: { status: "failed" },
      }).catch(() => {});
    }
  } catch (e: any) {
    console.error("[bg-worker] Poll error:", e.message);
  }
}

async function removeBackground(imageBuffer: Buffer): Promise<Buffer> {
  // Try Remove.bg first, fall back to HuggingFace
  const REMOVEBG_KEY = process.env.REMOVEBG_API_KEY;

  if (REMOVEBG_KEY) {
    const form = new FormData();
    form.append("image_file", new Blob([new Uint8Array(imageBuffer)], { type: "image/png" }), "image.png");
    form.append("size", "auto");

    const res = await fetch("https://api.remove.bg/v1.0/removebg", {
      method: "POST",
      headers: { "X-Api-Key": REMOVEBG_KEY },
      body: form,
    });

    if (res.ok) {
      console.log("[bg-worker] Remove.bg success");
      return Buffer.from(await res.arrayBuffer());
    }

    const errText = await res.text();
    console.error("[bg-worker] Remove.bg failed:", res.status, errText.slice(0, 200));
    // Fall through to HuggingFace
  }

  // HuggingFace fallback
  const { HfInference } = await import("@huggingface/inference");
  const hf = new HfInference(process.env.HF_TOKEN!);
  const blob = new Blob([new Uint8Array(imageBuffer)], { type: "image/png" });

  const result = await hf.imageSegmentation({ model: "briaai/RMBG-2.0", inputs: blob });

  if (Array.isArray(result)) {
    const mask = result[0]?.mask;
    if (!mask) throw new Error("No mask in segmentation result");

    const maskBuffer = Buffer.from(mask, "base64");
    const sharp = await import("sharp");
    const original = sharp.default(imageBuffer);
    const { width, height } = await original.metadata();
    if (!width || !height) throw new Error("Cannot read image dimensions");

    const maskImage = sharp.default(maskBuffer).resize(width, height).greyscale();

    return original
      .ensureAlpha()
      .composite([{ input: await maskImage.toBuffer(), blend: "dest-in" }])
      .png()
      .toBuffer();
  }

  if (result && typeof result === "object" && "arrayBuffer" in result) {
    return Buffer.from(await (result as Blob).arrayBuffer());
  }

  throw new Error(`Unexpected segmentation result type: ${typeof result}`);
}

async function compositeImages(subjectBuffer: Buffer, bgBuffer: Buffer): Promise<Buffer> {
  const sharp = await import("sharp");
  const sharpModule = sharp.default;
  const bgMetadata = await sharpModule(bgBuffer).metadata();
  const subjectMetadata = await sharpModule(subjectBuffer).metadata();

  if (!bgMetadata.width || !bgMetadata.height) throw new Error("Invalid background");
  if (!subjectMetadata.width || !subjectMetadata.height) throw new Error("Invalid subject");

  const subW = subjectMetadata.width;
  const subH = subjectMetadata.height;
  const bgW = bgMetadata.width;
  const bgH = bgMetadata.height;

  // Output canvas = subject's original size and aspect ratio
  const canvasW = subW;
  const canvasH = subH;

  // Scale background to cover the entire subject canvas
  const bgScale = Math.max(canvasW / bgW, canvasH / bgH);
  const scaledBgW = Math.round(bgW * bgScale);
  const scaledBgH = Math.round(bgH * bgScale);
  const scaledBg = await sharpModule(bgBuffer)
    .resize(scaledBgW, scaledBgH, { fit: "cover" })
    .toBuffer();

  // Crop background to exact canvas size (center crop)
  const bgCropLeft = Math.round((scaledBgW - canvasW) / 2);
  const bgCropTop = Math.round((scaledBgH - canvasH) / 2);
  const bg = await sharpModule(scaledBg)
    .extract({ left: bgCropLeft, top: bgCropTop, width: canvasW, height: canvasH })
    .toBuffer();

  // Subject stays at original size, fills entire canvas
  const subject = subjectBuffer;

  // === Dual shadow system ===
  const groundY = canvasH;

  // Contact shadow — dark, sharp, narrow
  const contactW = Math.round(subW * 0.7);
  const contactH = Math.round(subH * 0.04);
  const contactX = Math.round((canvasW - contactW) / 2);
  const contactY = groundY - Math.round(contactH * 0.3);

  // Ambient shadow — softer, wider, lighter
  const ambientW = Math.round(subW * 0.9);
  const ambientH = Math.round(subH * 0.18);
  const ambientX = Math.round((canvasW - ambientW) / 2);
  const ambientY = groundY - Math.round(ambientH * 0.2);

  const shadowSvg = Buffer.from(`<svg width="${canvasW}" height="${canvasH}">
    <defs>
      <filter id="blur-contact"><feGaussianBlur stdDeviation="3"/></filter>
      <filter id="blur-ambient"><feGaussianBlur stdDeviation="14"/></filter>
    </defs>
    <ellipse cx="${Math.round(ambientX + ambientW/2)}" cy="${Math.round(ambientY + ambientH/2)}"
             rx="${Math.round(ambientW/2)}" ry="${Math.round(ambientH/2)}"
             fill="rgba(0,0,0,0.22)" filter="url(#blur-ambient)"/>
    <ellipse cx="${Math.round(contactX + contactW/2)}" cy="${Math.round(contactY + contactH/2)}"
             rx="${Math.round(contactW/2)}" ry="${Math.round(contactH/2)}"
             fill="rgba(0,0,0,0.4)" filter="url(#blur-contact)"/>
  </svg>`);

  const shadowBuffer = await sharpModule(shadowSvg).png().toBuffer();

  // Composite: background → shadow → subject
  return sharpModule(bg)
    .composite([
      { input: shadowBuffer, top: 0, left: 0 },
      { input: subject, left: 0, top: 0 },
    ])
    .png()
    .toBuffer();
}

async function generateBackground(prompt: string): Promise<Buffer> {
  const { HfInference } = await import("@huggingface/inference");
  const hf = new HfInference(process.env.HF_TOKEN!);
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

import http from "http";

const PORT = parseInt(process.env.PORT || "3000");
const server = http.createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("OK");
});
server.listen(PORT, () => {
  console.log("[bg-worker] Worker listening on port " + PORT + ", polling every " + POLL_INTERVAL + "ms");
  poll(); // immediate first run
});
setInterval(poll, POLL_INTERVAL);