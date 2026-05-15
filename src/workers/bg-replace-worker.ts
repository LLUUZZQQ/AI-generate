import "dotenv/config";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notify";
import { downloadFromS3, uploadToS3 } from "@/lib/s3";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const hasS3 = !!(process.env.S3_BUCKET && process.env.S3_ENDPOINT);
const POLL_INTERVAL = 3000; // 3 seconds

/* ── AI全流程 — 双图输入，AI 负责全部合成 ────────────────── */
async function aiBlendBackground(
  productBuf: Buffer, bgBuf: Buffer,
  customPrompt?: string, aiModel?: string,
): Promise<Buffer | null> {
  try {
    const sharp = (await import("sharp")).default;

    const pMeta = await sharp(productBuf).metadata();
    const bgMeta = await sharp(bgBuf).metadata();

    const productB64 = productBuf.toString("base64");
    const bgB64 = bgBuf.toString("base64");
    const pMime = pMeta.format === "png" ? "image/png" : "image/jpeg";
    const bgMime = bgMeta.format === "png" ? "image/png" : "image/jpeg";

    console.log("[bg-worker] AI blend: product", pMeta.width + "x" + pMeta.height,
      "bg", bgMeta.width + "x" + bgMeta.height);

    const model = aiModel || "google/gemini-3.1-flash-image-preview";
    const isGemini = model.includes("gemini");

    // Gemini: concise, visual, result-oriented
    const geminiPrompt = customPrompt || `Image 1 is a product photo. Image 2 is a background scene. Generate a single photograph where the product from Image 1 has been photographed in the location from Image 2 — as if the photographer brought the product there and shot it in that exact environment.

- The product must appear naturally sized for the scene — neither too large nor too small. If the scene is a room, the product should occupy a realistic portion of the frame for a product shot taken in that room.
- The product rests on a visible surface in the scene with realistic shadows underneath it.
- The product's lighting matches the scene's light direction, color, and intensity.
- The product's colors, textures, materials, logos, and fine details stay exactly as they are — sharp, clear, unaltered.
- No visible seams, edges, or cutout artifacts around the product.
- Output looks like a real photograph. No text or watermark.`;

    // GPT: structured, rule-based, precise
    const gptPrompt = customPrompt || `Generate a single photorealistic image. The product from the first photo must appear naturally photographed in the scene from the second photo.

OBJECT (Image 1): The product to feature in the final image. Preserve it completely — every color, texture, material, logo, label, stitch, and surface detail stays exactly as-is. Do not modify, discard, or add any part of the product.

SCENE (Image 2): The location. The product belongs in this environment. The scene provides the lighting reference, perspective reference, scale reference, and atmosphere reference for the final image.

RULES:
1. SCALE: The product must look naturally sized within the scene. Judge the appropriate size from the scene's depth cues — furniture, architecture, objects in the frame.
2. PLACEMENT: Position the product on the most natural surface in the scene — floor, ground, tabletop, desk, bed. It should look deliberately placed, not floating.
3. LIGHTING: Match the scene's dominant light source. If the scene has window light from the left, the product is lit from the left. Match color temperature exactly.
4. SHADOWS: Contact shadow at the base of the product — sharp and dark where it touches. Cast shadow extending away — soft and matching the scene's ambient light.
5. PERSPECTIVE: The product's angle and vanishing point must align with the scene's geometry. If the scene is shot from above, view the product from above.
6. EDGES: Zero visible outline or halo around the product. The product edge transitions naturally into the background.
7. DETAIL: The product must be sharp. Every texture, logo, and label clearly visible. No artificial blur, grain, or noise.
8. OUTPUT: One image. Looks like a real photograph taken by a product photographer. Clean. No text, watermark, or logo.`;

    const prompt = isGemini ? geminiPrompt : gptPrompt;

    const apiKey = process.env.OPENAI_API_KEY!;
    const baseUrl = "https://openrouter.ai/api/v1/chat/completions";

    const requestMessages = [
      { role: "user", content: [
        { type: "text", text: universalPrompt },
        { type: "image_url", image_url: { url: `data:${pMime};base64,${productB64}` } },
        { type: "image_url", image_url: { url: `data:${bgMime};base64,${bgB64}` } },
      ]},
    ];

    const body = JSON.stringify({ model, messages: requestMessages, max_tokens: 4096 });

    console.log(`[bg-worker] calling OpenRouter with ${model}...`);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);

    let resp: Response;
    try {
      resp = await fetch(baseUrl, {
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
      console.error("[bg-worker] HTTP", resp.status, errText.substring(0, 200));
      return null;
    }

    const data = await resp.json() as any;
    const message = data?.choices?.[0]?.message;
    if (!message) { console.error("[bg-worker] no message"); return null; }

    const content = message.content;
    let resultBuf: Buffer | null = null;

    if (typeof content === "string") {
      if (content.startsWith("data:image") || content.length > 1000) {
        const b64 = content.includes("base64,") ? content.split("base64,")[1] : content;
        resultBuf = Buffer.from(b64, "base64");
      } else {
        console.error("[bg-worker] text-only response:", content.substring(0, 200));
      }
    }

    if (!resultBuf && content) {
      for (const part of content as any[]) {
        if (part.type === "image_url" && part.image_url?.url) {
          const u: string = part.image_url.url;
          if (u.startsWith("data:")) {
            resultBuf = Buffer.from(u.includes("base64,") ? u.split("base64,")[1] : u, "base64");
          } else {
            const r = await fetch(u);
            if (r.ok) resultBuf = Buffer.from(await r.arrayBuffer());
          }
          break;
        }
      }
    }

    if (!resultBuf) {
      const m = message as any;
      if (m.images?.[0]?.image_url?.url) {
        const u = m.images[0].image_url.url;
        if (u.startsWith("data:")) {
          resultBuf = Buffer.from(u.includes("base64,") ? u.split("base64,")[1] : u, "base64");
        } else {
          const r = await fetch(u);
          if (r.ok) resultBuf = Buffer.from(await r.arrayBuffer());
        }
      }
    }

    if (!resultBuf) { console.error("[bg-worker] could not extract image"); return null; }

    // Restore background dimensions
    if (bgMeta.width && bgMeta.height) {
      const aiMeta = await sharp(resultBuf).metadata();
      if (aiMeta.width !== bgMeta.width || aiMeta.height !== bgMeta.height) {
        resultBuf = await sharp(resultBuf)
          .resize(bgMeta.width, bgMeta.height, { fit: "inside", withoutEnlargement: true })
          .png().toBuffer();
      }
    }

    console.log("[bg-worker] done, size:", resultBuf.length);
    return resultBuf;
  } catch (e: any) {
    console.error("[bg-worker] AI blend failed:", e.message?.substring(0, 200));
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

      // AI全流程 — 双图输入，AI负责去背景+合成+光影
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