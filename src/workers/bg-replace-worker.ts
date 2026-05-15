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
    const isGemini = model.includes("gemini");

    // Gemini prompt — direct, visual language
    const geminiPrompt = `Take the product from the first image and place it into the second image's scene. Output a single photorealistic image where the product is naturally integrated into the background.

Key requirements:
- Keep the product's exact colors, textures, materials, and fine details (stitching, logos, labels) — do not alter or degrade them
- The product must fill roughly the same portion of the frame as it does in the original product photo — do not make it smaller
- Match the background's lighting direction, color temperature, and shadow softness
- Add realistic contact shadows where the product meets the surface
- Match perspective and depth of field to the background
- HIGH SHARPNESS AND DETAIL — preserve every texture, no blur, no noise, no soft focus
- No text, watermark, or logo`;

    // GPT prompt — structured, detailed
    const gptPrompt = `You are a professional product photo compositor. Take the product from the FIRST image and seamlessly blend it into the SECOND image's scene. Output a single image indistinguishable from a professionally shot product photograph.

CRITICAL RULES:
1. PRESERVE: Keep the product 100% intact — all colors, textures, materials, stitching, logos, labels, and fine surface details must remain razor-sharp and identical to the original.
2. SIZE: The product must occupy the SAME relative area in the frame as the original product photo. If the product fills 60% of the original frame, it must fill 60% of the output. Do NOT shrink the product.
3. GROUNDING: Place the product on a real surface. Generate precise contact shadows at the product's base.
4. LIGHTING: Match the background's key light direction, color temperature, and intensity on the product.
5. SHADOWS: Generate soft cast shadows consistent with the scene's lighting.
6. PERSPECTIVE: Match the camera angle and perspective exactly.
7. DEPTH OF FIELD: Match focus/blur to the background.
8. CLARITY: Maximum sharpness and detail retention. NO blur, NO noise, NO grain, NO soft focus. Every product detail must be crisp.
9. OUTPUT: A clean product photograph with the product naturally in the scene.
10. NO text, watermark, or logo.`;

    const prompt = customPrompt
      ? `${isGemini ? geminiPrompt : gptPrompt}\n\nADDITIONAL USER INSTRUCTIONS: ${customPrompt}`
      : isGemini ? geminiPrompt : gptPrompt;

    // OpenRouter
    const apiKey = process.env.OPENAI_API_KEY!;
    const apiBaseUrl = "https://openrouter.ai/api/v1/chat/completions";
    const apiModel = model;

    const requestMessages = [
      { role: "user", content: [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: `data:${productMime};base64,${productB64}` } },
        { type: "image_url", image_url: { url: `data:${bgMime};base64,${bgB64}` } },
      ]},
    ];

    const bodyObj: any = {
      model: apiModel,
      messages: requestMessages,
      max_tokens: 4096,
    };
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
          .resize(origMeta.width, origMeta.height, { fit: "cover", position: "center" })
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