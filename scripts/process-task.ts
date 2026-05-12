import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { downloadFromS3, uploadToS3 } from "../src/lib/s3";
import sharp from "sharp";
import path from "path";
import { writeFile, mkdir } from "fs/promises";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

// Replicate the worker logic
async function removeBackground(imageBuffer: Buffer): Promise<Buffer> {
  const { HfInference } = await import("@huggingface/inference");
  const hf = new HfInference(process.env.HF_TOKEN!);
  const blob = new Blob([new Uint8Array(imageBuffer)], { type: "image/png" });

  console.log("Calling HF RMBG-2.0...");
  const result = await hf.imageSegmentation({ model: "briaai/RMBG-2.0", inputs: blob });

  if (Array.isArray(result)) {
    const mask = result[0]?.mask;
    if (!mask) throw new Error("No mask");
    const maskBuffer = Buffer.from(mask, "base64");
    const original = sharp(imageBuffer);
    const { width, height } = await original.metadata();
    const maskImage = sharp(maskBuffer).resize(width!, height!).greyscale();
    return original.ensureAlpha()
      .composite([{ input: await maskImage.toBuffer(), blend: "dest-in" }])
      .png().toBuffer();
  }
  throw new Error("Unexpected result: " + typeof result);
}

async function compositeImages(subject: Buffer, bg: Buffer): Promise<Buffer> {
  const [sMeta, bMeta] = await Promise.all([sharp(subject).metadata(), sharp(bg).metadata()]);
  const sW = Math.round(bMeta.width! * 0.65);
  const sH = Math.round(sW * (sMeta.height! / sMeta.width!));
  const resized = await sharp(subject).resize(sW, sH, { fit: "inside" }).toBuffer();
  const left = Math.round((bMeta.width! - sW) / 2);
  const top = Math.round(bMeta.height! * 0.55 - sH / 2);
  return sharp(bg).composite([{ input: resized, left, top }]).png().toBuffer();
}

async function main() {
  const taskId = "cmp25muih000004lba5k77spt";
  console.log("Processing task:", taskId);

  const task = await prisma.bgReplaceTask.findUnique({
    where: { id: taskId },
    include: { results: true },
  });
  if (!task) { console.log("Task not found"); return; }

  await prisma.bgReplaceTask.update({ where: { id: taskId }, data: { status: "processing" } });

  // Get background template
  const template = await prisma.backgroundTemplate.findUnique({ where: { id: task.backgroundId! } });
  if (!template) { console.log("Template not found"); return; }

  console.log("Template fileUrl:", template.fileUrl);

  // Read background from local filesystem
  const fs = await import("fs/promises");
  const localPath = path.join(process.cwd(), "public", template.fileUrl);
  console.log("Reading bg from:", localPath);
  const bgBuffer = await fs.readFile(localPath);
  console.log("BG size:", bgBuffer.length);

  for (const result of task.results) {
    console.log("Processing result:", result.id, "key:", result.originalKey);

    // Download original from S3
    const original = await downloadFromS3(result.originalKey);
    console.log("Original size:", original.length);

    // Remove background
    console.log("Removing background...");
    const subject = await removeBackground(original);
    console.log("Subject size:", subject.length);

    // Composite
    console.log("Compositing...");
    const composited = await compositeImages(subject, bgBuffer);
    console.log("Composited size:", composited.length);

    // Upload result
    const resultKey = `results/${taskId}/${result.id}.png`;
    await uploadToS3(resultKey, composited, "image/png");

    await prisma.bgReplaceResult.update({
      where: { id: result.id },
      data: { status: "done", resultKey },
    });
    console.log("Result done:", resultKey);
  }

  await prisma.bgReplaceTask.update({ where: { id: taskId }, data: { status: "done" } });
  console.log("Task done!");
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
