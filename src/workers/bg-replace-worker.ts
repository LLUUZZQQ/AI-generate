import "dotenv/config";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notify";
import { downloadFromS3, uploadToS3 } from "@/lib/s3";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const hasS3 = !!(process.env.S3_BUCKET && process.env.S3_ENDPOINT);
const POLL_INTERVAL = 3000; // 3 seconds

/* ── Main AI blend dispatcher ────────────────────────────────── */
async function aiBlendBackground(
  originalBuffer: Buffer, bgBuffer: Buffer,
  customPrompt?: string, aiModel?: string,
): Promise<Buffer | null> {
  try {
    const sharp = (await import("sharp")).default;

    const origMeta = await sharp(originalBuffer).metadata();
    const bgMeta = await sharp(bgBuffer).metadata();

    const productB64 = originalBuffer.toString("base64");
    const bgB64 = bgBuffer.toString("base64");
    const productMime = origMeta.format === "png" ? "image/png" : "image/jpeg";
    const bgMime = bgMeta.format === "png" ? "image/png" : "image/jpeg";

    console.log("[bg-worker] AI blend: product", origMeta.width + "x" + origMeta.height,
      "bg", bgMeta.width + "x" + bgMeta.height);

    const model = aiModel || "google/gemini-3.1-flash-image-preview";
    const isRecraft = model.includes("recraft");
    // OpenRouter (Gemini/GPT/Recraft)
    const apiKey = process.env.OPENAI_API_KEY!;
    const apiBaseUrl = "https://openrouter.ai/api/v1/chat/completions";
    const apiModel = model;

    const defaultPrompt = `You are a photorealistic image compositor. Take the product from the FIRST image and place it into the SECOND image's scene. The result must be INDISTINGUISHABLE from a real photograph.

CRITICAL RULES:
1. PRESERVE everything in the product image — product, packaging, boxes, bags, accessories. Do NOT discard anything.
2. PROPORTION: Do NOT scale, stretch, or resize the product. Keep its exact original size and proportions. The product must look the same size as in the original photo.
3. GROUNDING: Place the product on a real surface in the scene (floor, table, ground, grass, desk, stairs). The product must physically touch the surface. Generate accurate contact shadows where the product meets the surface.
4. LIGHTING: Analyze the background's light source direction, color temperature, and intensity. Match the product's lighting exactly. If the background has warm afternoon sunlight, the product must have warm afternoon sunlight on it.
5. SHADOWS: Generate realistic, soft shadows that match the background light direction. Shadow softness must match the background's shadow softness. Contact shadows should be sharp, cast shadows softer.
6. PERSPECTIVE: Match the camera angle and perspective of the background exactly. If the background is shot from above, view the product from above. If eye-level, keep eye-level.
7. DEPTH OF FIELD: Match the background's focus. If the background has shallow depth of field (blurry far away), match that blur on the product edges if they would be at the same depth.
8. COLOR & TEXTURE: Keep product colors 100% identical. Do NOT shift hues, saturation, or white balance on the product itself. The product's material texture must remain unchanged.
9. NOISE: Add subtle sensor noise/grain matching the background to unify the image. Real phone photos have noise.
10. QUALITY: Ordinary smartphone photo quality — NOT studio, NOT CGI, NOT HDR, NOT overly sharp. Slight imperfection makes it real.
11. NO text, watermark, or logo.`;

    const recraftPrompt = `Refine this product photo composite. Blend the product naturally into the background scene. Keep product colors and proportions exactly as-is. Make it look like a single real photograph — natural lighting, realistic shadows, amateur phone photo quality. No text or watermark.`;
    const prompt = customPrompt
      ? `${isRecraft ? recraftPrompt : defaultPrompt}\n\nADDITIONAL USER INSTRUCTIONS: ${customPrompt}`
      : isRecraft ? recraftPrompt : defaultPrompt;

    // Recraft needs a single composite image, not two separate images
    let requestMessages;
    if (isRecraft) {
      // Pre-composite: paste product onto background for Recraft to refine
      const productMeta = await sharp(originalBuffer).metadata();
      const bgMeta = await sharp(bgBuffer).metadata();
      const targetW = Math.round(bgMeta.width! * 0.55);
      const scale = targetW / productMeta.width!;
      const targetH = Math.round(productMeta.height! * scale);
      const resizedProduct = await sharp(originalBuffer).resize(targetW, targetH, { fit: "inside" }).png().toBuffer();
      const left = Math.round((bgMeta.width! - targetW) / 2);
      const top = Math.round(bgMeta.height! * 0.5 - targetH / 2);
      const composite = await sharp(bgBuffer).composite([{ input: resizedProduct, left, top }]).jpeg({ quality: 92 }).toBuffer();
      requestMessages = [
        { role: "user", content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${composite.toString("base64")}` } },
        ]},
      ];
    } else {
      requestMessages = [
        { role: "user", content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: `data:${productMime};base64,${productB64}` } },
          { type: "image_url", image_url: { url: `data:${bgMime};base64,${bgB64}` } },
        ]},
      ];
    }

    // Call OpenRouter API
    const bodyObj: any = {
      model: apiModel,
      messages: requestMessages,
    };
    if (isRecraft) {
      bodyObj.modalities = ["image"];
      bodyObj.image_config = { strength: 0.55 };
    } else {
      bodyObj.max_tokens = 4096;
    }
    const body = JSON.stringify(bodyObj);

    console.log(`[bg-worker] calling OpenRouter with model ${apiModel}...`);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);

    const fetchHeaders: Record<string, string> = {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_URL || "http://localhost:3000",
      "X-Title": "FrameCraft",
    };

    let resp: Response;
    try {
      resp = await fetch(apiBaseUrl, {
        method: "POST",
        headers: fetchHeaders,
        body,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("[bg-worker] GPT-5.4: HTTP", resp.status, errText.substring(0, 300));
      return null;
    }

    const data = await resp.json() as any;
    const message = data?.choices?.[0]?.message;
    if (!message) { console.error("[bg-worker] GPT-5.4: no message"); return null; }

    // Parse response for image data
    const content = message.content;
    let resultBuf: Buffer | null = null;

    // Some providers return base64 image as plain string
    if (typeof content === "string") {
      if (content.startsWith("data:image") || content.length > 1000) {
        const b64 = content.includes("base64,") ? content.split("base64,")[1] : content;
        console.log("[bg-worker] GPT-5.4: got base64 from content, len:", b64.length);
        resultBuf = Buffer.from(b64, "base64");
      } else {
        console.error("[bg-worker] GPT-5.4: text-only response:", content.substring(0, 200));
      }
    }

    // Structured content array — look for image parts
    if (!resultBuf && content) {
      for (const part of content as any[]) {
        if (part.type === "image_url" && part.image_url?.url) {
          const imgUrl: string = part.image_url.url;
          console.log("[bg-worker] GPT-5.4: got image_url in content");
          if (imgUrl.startsWith("data:")) {
            const b64 = imgUrl.includes("base64,") ? imgUrl.split("base64,")[1] : imgUrl;
            resultBuf = Buffer.from(b64, "base64");
          } else {
            const imgRes = await fetch(imgUrl);
            if (imgRes.ok) resultBuf = Buffer.from(await imgRes.arrayBuffer());
          }
          break;
        }
      }
    }

    // Some models put image in a special field
    if (!resultBuf) {
      const msgAny = message as any;
      if (msgAny.images?.[0]?.image_url?.url) {
        const imgUrl = msgAny.images[0].image_url.url;
        console.log("[bg-worker] GPT-5.4: got images[0]");
        if (imgUrl.startsWith("data:")) {
          const b64 = imgUrl.includes("base64,") ? imgUrl.split("base64,")[1] : imgUrl;
          resultBuf = Buffer.from(b64, "base64");
        } else {
          const imgRes = await fetch(imgUrl);
          if (imgRes.ok) resultBuf = Buffer.from(await imgRes.arrayBuffer());
        }
      }
    }

    if (!resultBuf) {
      console.error("[bg-worker] GPT-5.4: could not extract image");
      return null;
    }

    // Restore original dimensions — AI output may be scaled
    if (origMeta.width && origMeta.height) {
      const aiMeta = await sharp(resultBuf).metadata();
      if (aiMeta.width !== origMeta.width || aiMeta.height !== origMeta.height) {
        console.log("[bg-worker] GPT-5.4: resizing", aiMeta.width + "x" + aiMeta.height,
          "→", origMeta.width + "x" + origMeta.height);
        resultBuf = await sharp(resultBuf)
          .resize(origMeta.width, origMeta.height, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png()
          .toBuffer();
      }
    }

    console.log("[bg-worker] GPT-5.4: done, size:", resultBuf.length);
    return resultBuf;
  } catch (e: any) {
    console.error("[bg-worker] GPT-5.4 blend failed:", e.message?.substring(0, 300));
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

      // AI blending — no fallback, fail explicitly
      const composited = await aiBlendBackground(original, bg, task.customPrompt ?? undefined, task.aiModel ?? undefined);

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