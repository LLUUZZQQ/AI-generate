import "dotenv/config";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notify";
import { downloadFromS3, uploadToS3 } from "@/lib/s3";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const hasS3 = !!(process.env.S3_BUCKET && process.env.S3_ENDPOINT);
const POLL_INTERVAL = 3000; // 3 seconds

/* ── Step 1: sharp精确合成 — 去背景+缩放+定位+阴影 ──────────── */
async function preComposite(productBuf: Buffer, bgBuf: Buffer): Promise<Buffer | null> {
  try {
    const sharp = (await import("sharp")).default;
    const { HfInference } = await import("@huggingface/inference");
    const hf = new HfInference(process.env.HF_TOKEN!);

    // Remove background via HuggingFace RMBG-2.0
    console.log("[bg-worker] preComposite: removing background...");
    const blob = new Blob([new Uint8Array(productBuf)], { type: "image/png" });
    const segResult = await hf.imageSegmentation({ model: "briaai/RMBG-2.0", inputs: blob });
    let subjectNoBg: Buffer;
    if (Array.isArray(segResult) && segResult[0]?.mask) {
      const maskBuf = Buffer.from(segResult[0].mask, "base64");
      const orig = sharp(productBuf);
      const { width, height } = await orig.metadata();
      const mask = sharp(maskBuf).resize(width!, height!).greyscale();
      subjectNoBg = await orig.ensureAlpha()
        .composite([{ input: await mask.toBuffer(), blend: "dest-in" }])
        .png().toBuffer();
    } else {
      console.error("[bg-worker] preComposite: RMBG-2.0 unexpected result");
      return null;
    }

    const subMeta = await sharp(subjectNoBg).metadata();
    const bgMeta = await sharp(bgBuf).metadata();
    const subW = subMeta.width!, subH = subMeta.height!;
    const bgW = bgMeta.width!, bgH = bgMeta.height!;

    // Scale product to fit naturally: ~40% width for horizontal, ~50% for vertical
    const isVertical = subH > subW * 1.2;
    const targetFraction = isVertical ? 0.50 : 0.40;
    const scale = Math.min((bgW * targetFraction) / subW, (bgH * 0.7) / subH, 1.0);
    const prodW = Math.round(subW * scale);
    const prodH = Math.round(subH * scale);
    const resizedSubject = await sharp(subjectNoBg).resize(prodW, prodH, { fit: "inside" }).png().toBuffer();

    // Position: centered horizontally, bottom half of frame
    const left = Math.round((bgW - prodW) / 2);
    const top = Math.round(bgH * 0.55 - prodH / 2);

    // SVG shadow system
    const contactW = Math.round(prodW * 0.75);
    const contactH = Math.round(prodH * 0.03);
    const contactX = Math.round(left + (prodW - contactW) / 2);
    const contactY = Math.round(top + prodH - contactH * 0.5);

    const ambientW = Math.round(prodW * 0.85);
    const ambientH = Math.round(prodH * 0.12);
    const ambientX = Math.round(left + (prodW - ambientW) / 2);
    const ambientY = Math.round(top + prodH - ambientH * 0.3);

    const shadowSvg = Buffer.from(
      `<svg width="${bgW}" height="${bgH}">
        <defs>
          <filter id="blurC"><feGaussianBlur stdDeviation="3"/></filter>
          <filter id="blurA"><feGaussianBlur stdDeviation="14"/></filter>
        </defs>
        <ellipse cx="${Math.round(ambientX + ambientW / 2)}" cy="${Math.round(ambientY + ambientH / 2)}"
          rx="${Math.round(ambientW / 2)}" ry="${Math.round(ambientH / 2)}"
          fill="rgba(0,0,0,0.15)" filter="url(#blurA)"/>
        <ellipse cx="${Math.round(contactX + contactW / 2)}" cy="${Math.round(contactY + contactH / 2)}"
          rx="${Math.round(contactW / 2)}" ry="${Math.round(contactH / 2)}"
          fill="rgba(0,0,0,0.30)" filter="url(#blurC)"/>
      </svg>`,
    );
    const shadowBuf = await sharp(shadowSvg).png().toBuffer();

    // Edge soften
    const softenedSubject = await sharp(resizedSubject).ensureAlpha().blur(0.8).toBuffer();

    // Composite: bg → shadow → product
    const composite = await sharp(bgBuf)
      .composite([
        { input: shadowBuf, top: 0, left: 0 },
        { input: softenedSubject, top, left },
      ])
      .jpeg({ quality: 95 })
      .toBuffer();

    console.log(`[bg-worker] preComposite: product ${subW}x${subH} → ${prodW}x${prodH} on ${bgW}x${bgH} bg`);
    return composite;
  } catch (e: any) {
    console.error("[bg-worker] preComposite failed:", e.message?.substring(0, 200));
    return null;
  }
}

/* ── Step 2: AI摄影润色 — 单图输入，只做光影/边缘/氛围 ──────── */
async function aiRefinePhoto(
  compositeBuf: Buffer, customPrompt?: string, aiModel?: string,
): Promise<Buffer | null> {
  try {
    const sharp = (await import("sharp")).default;
    const cMeta = await sharp(compositeBuf).metadata();
    const compositeB64 = compositeBuf.toString("base64");

    const model = aiModel || "google/gemini-3.1-flash-image-preview";

    const refinementPrompt = customPrompt || `Refine this product photo into a single authentic photograph — as if the product was originally shot in this location.

EDGE BLENDING: Soften transition between product and background. Zero visible cutout line.
LIGHTING HARMONY: Match the product's lighting to the scene's light direction, color temperature, and intensity.
SHADOW REFINEMENT: Refine shadows under the product — sharp contact shadow, soft cast shadow.
COLOR UNITY: Harmonize color balance between product and scene.
ATMOSPHERE: Add subtle ambient occlusion and depth haze where appropriate.
DETAILS: Keep every product texture, material, color, logo, and label 100% unchanged and sharp.
OUTPUT: Clean product photograph. No added text, watermark, or logo.`;

    const apiKey = process.env.OPENAI_API_KEY!;
    const apiBaseUrl = "https://openrouter.ai/api/v1/chat/completions";
    const apiModel = model;

    const requestMessages = [
      { role: "user", content: [
        { type: "text", text: refinementPrompt },
        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${compositeB64}` } },
      ]},
    ];

    const body = JSON.stringify({ model: apiModel, messages: requestMessages, max_tokens: 4096 });

    console.log(`[bg-worker] AI refine: calling OpenRouter with ${apiModel}...`);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);

    let resp: Response;
    try {
      resp = await fetch(apiBaseUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.NEXT_PUBLIC_URL || "http://localhost:3000",
          "X-Title": "FrameCraft",
        },
        body,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("[bg-worker] AI refine: HTTP", resp.status, errText.substring(0, 200));
      return null;
    }

    const data = await resp.json() as any;
    const message = data?.choices?.[0]?.message;
    if (!message) { console.error("[bg-worker] AI refine: no message"); return null; }

    const content = message.content;
    let resultBuf: Buffer | null = null;

    if (typeof content === "string") {
      if (content.startsWith("data:image") || content.length > 1000) {
        const b64 = content.includes("base64,") ? content.split("base64,")[1] : content;
        resultBuf = Buffer.from(b64, "base64");
      } else {
        console.error("[bg-worker] AI refine: text-only response:", content.substring(0, 200));
      }
    }

    if (!resultBuf && content) {
      for (const part of content as any[]) {
        if (part.type === "image_url" && part.image_url?.url) {
          const imgUrl: string = part.image_url.url;
          if (imgUrl.startsWith("data:")) {
            resultBuf = Buffer.from(imgUrl.includes("base64,") ? imgUrl.split("base64,")[1] : imgUrl, "base64");
          } else {
            const imgRes = await fetch(imgUrl);
            if (imgRes.ok) resultBuf = Buffer.from(await imgRes.arrayBuffer());
          }
          break;
        }
      }
    }

    if (!resultBuf) {
      const msgAny = message as any;
      if (msgAny.images?.[0]?.image_url?.url) {
        const imgUrl = msgAny.images[0].image_url.url;
        if (imgUrl.startsWith("data:")) {
          resultBuf = Buffer.from(imgUrl.includes("base64,") ? imgUrl.split("base64,")[1] : imgUrl, "base64");
        } else {
          const imgRes = await fetch(imgUrl);
          if (imgRes.ok) resultBuf = Buffer.from(await imgRes.arrayBuffer());
        }
      }
    }

    if (!resultBuf) { console.error("[bg-worker] AI refine: could not extract image"); return null; }

    // Restore background dimensions
    if (cMeta.width && cMeta.height) {
      const aiMeta = await sharp(resultBuf).metadata();
      if (aiMeta.width !== cMeta.width || aiMeta.height !== cMeta.height) {
        resultBuf = await sharp(resultBuf)
          .resize(cMeta.width, cMeta.height, { fit: "inside", withoutEnlargement: true })
          .png().toBuffer();
      }
    }

    console.log("[bg-worker] AI refine: done, size:", resultBuf.length);
    return resultBuf;
  } catch (e: any) {
    console.error("[bg-worker] AI refine failed:", e.message?.substring(0, 200));
    return null;
  }
}

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
      // Check if task was cancelled mid-processing
      const current = await prisma.bgReplaceTask.findUnique({ where: { id: taskId }, select: { status: true } });
      if (!current || current.status === "cancelled" || current.status === "paused") {
        console.log("[bg-worker] Task", taskId, "was", current?.status, "— stopping");
        return;
      }

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

      let bg = backgroundBuffer;
      if (task.backgroundMode === "ai") {
        bg = await generateBackground(task.aiPrompt || "indoor room, wooden floor, natural lighting, mobile phone photo");
      }
      if (!bg) {
        bg = await createSolidBackground("#f5f5f0");
      }

      // Step 1: sharp精确合成 (大小/位置/阴影)
      const composite = await preComposite(original, bg);
      if (!composite) {
        console.error(`[bg-worker] preComposite FAILED for result ${result.id}`);
        await prisma.bgReplaceResult.update({
          where: { id: result.id },
          data: { status: "failed", error: "去背景或合成失败" },
        });
        continue;
      }

      // Step 2: AI摄影润色 (光影/边缘/氛围)
      const composited = await aiRefinePhoto(composite, task.customPrompt ?? undefined, task.aiModel ?? undefined);

      if (!composited) {
        console.error(`[bg-worker] AI blend FAILED for result ${result.id}`);
        await prisma.bgReplaceResult.update({
          where: { id: result.id },
          data: { status: "failed", error: `AI 融合失败 (模型: ${task.aiModel || "gemini"})，请尝试换模型` },
        });
        continue;
      }

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
    const doneStatus = allFailed ? "failed" : "done";
    await prisma.bgReplaceTask.update({
      where: { id: taskId },
      data: { status: doneStatus },
    });

    // Send notification
    const doneCount = updatedResults.filter(r => r.status === "done").length;
    try {
      await createNotification({
        userId: task.userId,
        type: allFailed ? "error" : "success",
        message: allFailed ? `背景替换任务处理失败` : `背景替换完成！${doneCount} 张照片已处理`,
        link: `/background-replace/${taskId}`,
      });
    } catch { /* non-critical */ }

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

// ── Background generation helpers ──────────────────────────────────

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
server.on("error", (e: any) => {
  if (e.code === "EADDRINUSE") {
    console.log("[bg-worker] Port " + PORT + " in use (shared worker mode), polling only");
  }
});
server.listen(PORT, () => {
  console.log("[bg-worker] Worker listening on port " + PORT + ", polling every " + POLL_INTERVAL + "ms");
  poll();
});
setInterval(poll, POLL_INTERVAL);