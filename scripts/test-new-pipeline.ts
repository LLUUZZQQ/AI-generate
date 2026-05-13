import "dotenv/config";
import sharp from "sharp";
import { writeFile } from "fs/promises";
import path from "path";

// === Copy of new compositeImages ===
async function compositeImages(subjectBuffer: Buffer, bgBuffer: Buffer): Promise<{ composited: Buffer; subjectAlpha: Buffer }> {
  const sharpModule = sharp;
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

  // Scale background to cover canvas
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

  // Shape-aware shadow
  const subjectAlphaPng = await sharpModule(subjectBuffer)
    .ensureAlpha()
    .extractChannel(3)
    .png()
    .toBuffer();

  const shadowH = Math.round(subH * 0.22);
  const shadowBase = await sharpModule(subjectAlphaPng)
    .resize(subW, shadowH, { fit: "fill", kernel: "lanczos3" })
    .extend({ top: subH - shadowH, bottom: 0, left: 0, right: 0, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  const contactShadow = await sharpModule(shadowBase)
    .blur(2.5)
    .linear(0.35, 0)
    .ensureAlpha()
    .toBuffer();

  const ambientShadow = await sharpModule(shadowBase)
    .blur(14)
    .linear(0.17, 0)
    .ensureAlpha()
    .toBuffer();

  // Color/brightness match (no hue shift)
  const bgAvg = await sharpModule(bg).resize(1, 1).raw().toBuffer();
  const subAvg = await sharpModule(subjectBuffer).resize(1, 1).raw().toBuffer();

  const bgLum = bgAvg[0] * 0.299 + bgAvg[1] * 0.587 + bgAvg[2] * 0.114;
  const subLum = subAvg[0] * 0.299 + subAvg[1] * 0.587 + subAvg[2] * 0.114;

  const brightnessFactor = bgLum > 0
    ? Math.min(1.3, Math.max(0.7, bgLum / Math.max(subLum, 1)))
    : 1;

  const colorMatched = brightnessFactor === 1
    ? subjectBuffer
    : await sharpModule(subjectBuffer)
        .modulate({ brightness: brightnessFactor })
        .toBuffer();

  // Edge softening
  const edgeSoftened = await sharpModule(colorMatched)
    .ensureAlpha()
    .blur(1.2)
    .toBuffer();

  // Composite: bg → ambient shadow → contact shadow → subject
  const composited = await sharpModule(bg)
    .composite([
      { input: ambientShadow, top: 0, left: 0 },
      { input: contactShadow, top: 0, left: 0 },
      { input: edgeSoftened, left: 0, top: 0 },
    ])
    .png()
    .toBuffer();

  // Noise matching
  const bgSample = await sharpModule(bg).resize(128, 128).greyscale().raw().toBuffer();
  let mean = 0;
  for (let i = 0; i < bgSample.length; i++) mean += bgSample[i];
  mean /= bgSample.length;
  let variance = 0;
  for (let i = 0; i < bgSample.length; i++) variance += (bgSample[i] - mean) ** 2;
  variance /= bgSample.length;
  const noiseStd = Math.sqrt(variance);

  const noiseRaw = Buffer.alloc(canvasW * canvasH);
  const intensity = Math.min(14, Math.max(3, Math.round(noiseStd * 0.55)));
  for (let i = 0; i < noiseRaw.length; i++) {
    noiseRaw[i] = Math.round(128 + (Math.random() - 0.5) * intensity * 2);
  }

  const noiseLayer = await sharpModule(noiseRaw, { raw: { width: canvasW, height: canvasH, channels: 1 } })
    .linear(0.07, 0)
    .blur(0.5)
    .ensureAlpha()
    .png()
    .toBuffer();

  const finalComposite = await sharpModule(composited)
    .composite([{ input: noiseLayer, blend: "overlay" }])
    .png()
    .toBuffer();

  return { composited: finalComposite, subjectAlpha: subjectAlphaPng };
}

async function main() {
  const testDir = path.join(process.cwd(), "test-output");
  const fs = await import("fs/promises");
  await fs.mkdir(testDir, { recursive: true });

  // === Option A: Download a transparent-background product image from the web ===
  // Use a free PNG image as test subject (already has transparent background)
  console.log("Fetching test product image...");

  // Download a product image — use loremflickr for a shoe/product photo
  let productBuffer: Buffer;
  try {
    const res = await fetch("https://loremflickr.com/800/800/shoes,product", { signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new Error("HTTP " + res.status);
    productBuffer = Buffer.from(await res.arrayBuffer());
    console.log("  Downloaded product image:", productBuffer.length, "bytes");
    await writeFile(path.join(testDir, "0-original.jpg"), productBuffer);
  } catch (e: any) {
    console.log("  loremflickr failed:", e.message);
    // Fallback: generate a test image with sharp
    console.log("  Generating synthetic test subject...");
    productBuffer = await sharp({
      create: { width: 800, height: 800, channels: 4, background: { r: 200, g: 50, b: 50, alpha: 1 } }
    })
      .composite([{
        input: Buffer.from(`<svg width="800" height="800">
          <rect width="800" height="800" fill="white"/>
          <circle cx="400" cy="350" r="180" fill="#e74c3c"/>
          <rect x="250" y="350" width="300" height="200" rx="20" fill="#2c3e50"/>
          <rect x="280" y="400" width="240" height="80" rx="10" fill="#e74c3c"/>
          <text x="400" y="680" text-anchor="middle" font-size="80" fill="#555">SHOE</text>
        </svg>`),
        top: 0, left: 0,
      }])
      .png()
      .toBuffer();
  }

  // Simple background removal: use a white-background assumption
  // In real pipeline this is done by Remove.bg / RMBG-2.0
  console.log("Simulating background removal (white key)...");
  const subject = await sharp(productBuffer)
    .png()
    .ensureAlpha()
    .toBuffer();
  await writeFile(path.join(testDir, "2-subject.png"), subject);

  // Download a real background from picsum (free, no API key)
  console.log("Downloading test background...");
  let bgBuffer: Buffer;
  try {
    const bgRes = await fetch("https://picsum.photos/seed/wood-floor/800/800", { signal: AbortSignal.timeout(30000) });
    bgBuffer = Buffer.from(await bgRes.arrayBuffer());
    console.log("  Background size:", bgBuffer.length, "bytes");
  } catch (e: any) {
    console.log("  picsum failed, generating solid bg");
    bgBuffer = await sharp({ create: { width: 800, height: 800, channels: 3, background: "#d4c5b9" } }).png().toBuffer();
  }
  await writeFile(path.join(testDir, "1-background.png"), bgBuffer);

  // Step 1: Stage A composite
  console.log("\nStep 1: Stage A composite (new pipeline)");
  const { composited: stageA, subjectAlpha } = await compositeImages(subject, bgBuffer);
  await writeFile(path.join(testDir, "3-stage-a.png"), stageA);
  console.log("  Stage A size:", stageA.length, "bytes");

  // Step 2: Old-style composite for comparison
  console.log("\nStep 2: Old-style composite (direct paste, for comparison)");
  const subMeta = await sharp(subject).metadata();
  const oldBgScaled = await sharp(bgBuffer)
    .resize(subMeta.width!, subMeta.height!, { fit: "cover" })
    .composite([{ input: subject, left: 0, top: 0 }])
    .png()
    .toBuffer();
  await writeFile(path.join(testDir, "4-old-style.png"), oldBgScaled);
  console.log("  Old-style size:", oldBgScaled.length, "bytes");

  console.log("\n==============================");
  console.log("Test output saved to:", testDir);
  console.log("Files:");
  console.log("  0-original.jpg — 原始产品照片");
  console.log("  1-background.png — 背景图");
  console.log("  2-subject.png — 抠图后产品");
  console.log("  3-stage-a.png — 新管线合成（形状阴影 + 亮度匹配 + 边缘柔化 + 噪点）");
  console.log("  4-old-style.png — 旧管线合成（直接粘贴，无阴影无匹配）");
  console.log("Compare 3-stage-a.png vs 4-old-style.png side by side");
}

main().catch((e) => { console.error(e); process.exit(1); });
