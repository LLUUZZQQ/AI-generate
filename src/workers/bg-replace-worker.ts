import "dotenv/config";
import { prisma } from "@/lib/db";
import { downloadFromS3, uploadToS3 } from "@/lib/s3";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const hasS3 = !!(process.env.S3_BUCKET && process.env.S3_ENDPOINT);
const POLL_INTERVAL = 3000; // 3 seconds

async function aiBlendBackground(originalBuffer: Buffer, bgBuffer: Buffer, customPrompt?: string, aiModel?: string): Promise<Buffer | null> {
  try {
    const sharp = (await import("sharp")).default;

    const origMeta = await sharp(originalBuffer).metadata();
    const bgMeta = await sharp(bgBuffer).metadata();

    const productB64 = originalBuffer.toString("base64");
    const bgB64 = bgBuffer.toString("base64");
    const productMime = origMeta.format === "png" ? "image/png" : "image/jpeg";
    const bgMime = bgMeta.format === "png" ? "image/png" : "image/jpeg";

    console.log("[bg-worker] GPT-5.4 Image 2 blend: product", origMeta.width + "x" + origMeta.height,
      "bg", bgMeta.width + "x" + bgMeta.height);

    const apiKey = process.env.OPENAI_API_KEY!;

    const model = aiModel || "openai/gpt-5.4-image-2";
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
    const prompt = customPrompt
      ? `${defaultPrompt}\n\nADDITIONAL USER INSTRUCTIONS: ${customPrompt}`
      : defaultPrompt;

    // Call OpenRouter with OpenRouter key
    const body = JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: `data:${productMime};base64,${productB64}` } },
            { type: "image_url", image_url: { url: `data:${bgMime};base64,${bgB64}` } },
          ],
        },
      ],
      max_tokens: 4096,
    });

    console.log("[bg-worker] GPT-5.4: calling OpenRouter...");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);

    let resp: Response;
    try {
      resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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

      // Try Replicate-based blending first, fall back to traditional pipeline
      let composited: Buffer | null = null;
      composited = await aiBlendBackground(original, bg, task.customPrompt ?? undefined, task.aiModel ?? undefined);

      if (!composited) {
        console.log("[bg-worker] GPT-5.4 blend unavailable — using traditional pipeline");
        const subjectBuffer = await removeBackground(original);
        const result = await compositeImages(subjectBuffer, bg);
        composited = result.composited;
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

async function compositeImages(subjectBuffer: Buffer, bgBuffer: Buffer): Promise<{ composited: Buffer; subjectAlpha: Buffer }> {
  const sharp = await import("sharp");
  const sharpModule = sharp.default;
  const bgMeta = await sharpModule(bgBuffer).metadata();
  const subMeta = await sharpModule(subjectBuffer).metadata();

  if (!bgMeta.width || !bgMeta.height) throw new Error("Invalid background");
  if (!subMeta.width || !subMeta.height) throw new Error("Invalid subject");

  const subW = subMeta.width;
  const subH = subMeta.height;
  const bgW = bgMeta.width;
  const bgH = bgMeta.height;

  const canvasW = subW;
  const canvasH = subH;

  // Scale background to cover subject canvas
  const bgScale = Math.max(canvasW / bgW, canvasH / bgH);
  const scaledBgW = Math.round(bgW * bgScale);
  const scaledBgH = Math.round(bgH * bgScale);
  const scaledBg = await sharpModule(bgBuffer)
    .resize(scaledBgW, scaledBgH, { fit: "cover" })
    .toBuffer();

  const bgCropLeft = Math.round((scaledBgW - canvasW) / 2);
  const bgCropTop = Math.round((scaledBgH - canvasH) / 2);
  const bg = await sharpModule(scaledBg)
    .extract({ left: bgCropLeft, top: bgCropTop, width: canvasW, height: canvasH })
    .toBuffer();

  // === Improved ellipse shadow system ===
  // Sizes proportional to product dimensions
  const groundY = canvasH;

  // Contact shadow — dark, sharp, narrow — product contact with ground
  const contactW = Math.round(subW * 0.75);
  const contactH = Math.round(subH * 0.03);
  const contactX = Math.round((canvasW - contactW) / 2);
  const contactY = groundY - Math.round(contactH * 0.3);

  // Ambient shadow — softer, wider, lighter
  const ambientW = Math.round(subW * 0.85);
  const ambientH = Math.round(subH * 0.14);
  const ambientX = Math.round((canvasW - ambientW) / 2);
  const ambientY = groundY - Math.round(ambientH * 0.2);

  const shadowSvg = Buffer.from(`<svg width="${canvasW}" height="${canvasH}">
    <defs>
      <filter id="blur-contact"><feGaussianBlur stdDeviation="3"/></filter>
      <filter id="blur-ambient"><feGaussianBlur stdDeviation="16"/></filter>
    </defs>
    <ellipse cx="${Math.round(ambientX + ambientW/2)}" cy="${Math.round(ambientY + ambientH/2)}"
             rx="${Math.round(ambientW/2)}" ry="${Math.round(ambientH/2)}"
             fill="rgba(0,0,0,0.18)" filter="url(#blur-ambient)"/>
    <ellipse cx="${Math.round(contactX + contactW/2)}" cy="${Math.round(contactY + contactH/2)}"
             rx="${Math.round(contactW/2)}" ry="${Math.round(contactH/2)}"
             fill="rgba(0,0,0,0.35)" filter="url(#blur-contact)"/>
  </svg>`);

  const shadowBuffer = await sharpModule(shadowSvg).png().toBuffer();

  // === Color/brightness match (luminance only, no hue shift) ===
  const bgAvg = await sharpModule(bg).resize(1, 1).raw().toBuffer();
  const subAvg = await sharpModule(subjectBuffer).resize(1, 1).raw().toBuffer();

  const bgLum = bgAvg[0] * 0.299 + bgAvg[1] * 0.587 + bgAvg[2] * 0.114;
  const subLum = subAvg[0] * 0.299 + subAvg[1] * 0.587 + subAvg[2] * 0.114;

  // Clamp brightness adjustment to avoid wash-out or crush; do NOT touch hue/saturation
  const brightnessFactor = bgLum > 0
    ? Math.min(1.3, Math.max(0.7, bgLum / Math.max(subLum, 1)))
    : 1;
  const colorMatched = brightnessFactor === 1
    ? subjectBuffer
    : await sharpModule(subjectBuffer)
        .modulate({ brightness: brightnessFactor })
        .toBuffer();

  // === Edge softening (light blur to kill hard cutout edge) ===
  const edgeSoftened = await sharpModule(colorMatched)
    .ensureAlpha()
    .blur(1.2)
    .toBuffer();

  // === Composite: bg → shadow → subject ===
  const composited = await sharpModule(bg)
    .composite([
      { input: shadowBuffer, top: 0, left: 0 },
      { input: edgeSoftened, left: 0, top: 0 },
    ])
    .png()
    .toBuffer();

  const subjectAlphaPng = sharpModule(subjectBuffer).ensureAlpha().extractChannel(3).png().toBuffer();

  return { composited, subjectAlpha: await subjectAlphaPng };
}

async function img2imgFusion(compositePng: Buffer, subjectBuffer: Buffer, subjectAlphaPng: Buffer): Promise<Buffer> {
  try {
    const { HfInference } = await import("@huggingface/inference");
    const hf = new HfInference(process.env.HF_TOKEN!);
    const sharp = (await import("sharp")).default;

    // Build a transition-zone mask: dilate(alpha, 8px) minus alpha
    // This ring is where SD can safely blend — product interior is never touched
    const subMeta = await sharp(subjectAlphaPng).metadata();
    if (!subMeta.width || !subMeta.height) return compositePng;

    const alphaRaw = await sharp(subjectAlphaPng).ensureAlpha().raw().toBuffer();
    const dilated = await sharp(alphaRaw, { raw: { width: subMeta.width, height: subMeta.height, channels: 4 } })
      .blur(8)  // dilation via blur → threshold
      .linear(3.0, -0.1)  // push edges outward
      .ensureAlpha()
      .extractChannel(3)
      .raw()
      .toBuffer();

    const originalAlpha = await sharp(subjectAlphaPng)
      .extractChannel(3)
      .raw()
      .toBuffer();

    // transitionMask = dilated - original (only the edge ring)
    const maskPixels = Buffer.alloc(subMeta.width * subMeta.height);
    for (let i = 0; i < maskPixels.length; i++) {
      const d = dilated[i];
      const o = originalAlpha[i];
      maskPixels[i] = Math.max(0, Math.min(255, d - o));
    }

    // Resize composite to 1024 max dim for SD efficiency
    const maxDim = 1024;
    let comp = compositePng;
    let compW = subMeta.width;
    let compH = subMeta.height;

    if (subMeta.width > maxDim || subMeta.height > maxDim) {
      const scale = maxDim / Math.max(subMeta.width, subMeta.height);
      compW = Math.round(subMeta.width * scale);
      compH = Math.round(subMeta.height * scale);
      comp = await sharp(compositePng).resize(compW, compH, { fit: "inside" }).png().toBuffer();
    }

    // SD img2img with low strength — only edges will be affected because we blend back
    console.log("[bg-worker] img2img fusion, dims:", compW, "x", compH);
    const result = await hf.imageToImage({
      model: "stabilityai/stable-diffusion-xl-base-1.0",
      inputs: new Blob([new Uint8Array(comp)], { type: "image/png" }),
      parameters: {
        prompt: "casual smartphone photo, natural lighting, realistic amateur product shot, no color shift",
        negative_prompt: "text, watermark, logo, overlay, saturated, overexposed, color cast",
        strength: 0.3,
        guidance_scale: 7,
      },
    });

    let fused: Buffer;
    if (typeof result === "string") {
      const res = await fetch(result);
      fused = Buffer.from(await res.arrayBuffer());
    } else {
      fused = Buffer.from(await (result as Blob).arrayBuffer());
    }

    // Resize back to original size if needed
    if (compW !== subMeta.width || compH !== subMeta.height) {
      fused = await sharp(fused).resize(subMeta.width, subMeta.height, { fit: "inside" }).png().toBuffer();
    }

    // Per-pixel blend: mask-controlled fusion between SD result and stage A composite
    // maskVal=0   → keep compositePng 100% (product interior — colors preserved)
    // maskVal=255 → use SD fused 100% (background + edge transition)
    const { data: fusedPixels, info: fusedInfo } = await sharp(fused)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { data: origPixels } = await sharp(compositePng)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const outPixels = Buffer.alloc(fusedPixels.length);
    for (let i = 0; i < fusedInfo.width * fusedInfo.height; i++) {
      const pi = i * 4;
      const maskVal = maskPixels[i];
      const t = maskVal / 255;  // 0 = keep original, 1 = use SD result
      outPixels[pi]     = Math.round(fusedPixels[pi]     * t + origPixels[pi]     * (1 - t));
      outPixels[pi + 1] = Math.round(fusedPixels[pi + 1] * t + origPixels[pi + 1] * (1 - t));
      outPixels[pi + 2] = Math.round(fusedPixels[pi + 2] * t + origPixels[pi + 2] * (1 - t));
      outPixels[pi + 3] = Math.max(fusedPixels[pi + 3], origPixels[pi + 3]);
    }

    console.log("[bg-worker] img2img fusion done");

    return sharp(outPixels, { raw: { width: fusedInfo.width, height: fusedInfo.height, channels: 4 } })
      .png()
      .toBuffer();
  } catch (e: any) {
    console.error("[bg-worker] img2img fusion failed:", e.message, "— using stage A composite");
    return compositePng; // graceful fallback
  }
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