import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import sharp from "sharp";
import { downloadFromS3 } from "../src/lib/s3";

async function main() {
  const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

  // 1. Check the template
  const template = await p.backgroundTemplate.findFirst({ where: { name: "白墙-明亮" } });
  console.log("=== Template ===");
  console.log("Name:", template?.name);
  console.log("fileUrl:", template?.fileUrl);
  console.log("thumbnailUrl:", template?.thumbnailUrl);

  // 2. Check if file exists in public/
  const fs = await import("fs/promises");
  const localPath = template?.fileUrl ? `public${template.fileUrl}` : null;
  if (localPath) {
    try {
      const stats = await fs.stat(localPath);
      console.log("Local file exists:", localPath, stats.size, "bytes");
    } catch {
      console.log("Local file MISSING:", localPath);
    }
  }

  // 3. Analyze the new result PNG pixel data
  console.log("\n=== NEW result analysis ===");
  const newBuf = await fs.readFile("test-output/compare/NEW-pipeline.png");
  const newImg = await sharp(newBuf).raw().toBuffer({ resolveWithObject: true });
  console.log("Dimensions:", newImg.info.width, "x", newImg.info.height, "channels:", newImg.info.channels);

  // Sample some pixels
  const data = newImg.data as Buffer;
  const w = newImg.info.width;
  const h = newImg.info.height;

  // Check: is the background a uniform color?
  const corners = [
    data[0], data[1], data[2],           // top-left
    data[(w-1)*4], data[(w-1)*4+1], data[(w-1)*4+2],  // top-right
    data[(h-1)*w*4], data[(h-1)*w*4+1], data[(h-1)*w*4+2],  // bottom-left
    data[((h-1)*w + w-1)*4], data[((h-1)*w + w-1)*4+1], data[((h-1)*w + w-1)*4+2],  // bottom-right
    data[Math.floor(h/2)*w*4], data[Math.floor(h/2)*w*4+1], data[Math.floor(h/2)*w*4+2],  // mid-left
  ];
  console.log("Corner pixel samples (R,G,B):");
  for (let i = 0; i < corners.length; i += 3) {
    console.log(`  [${corners[i]}, ${corners[i+1]}, ${corners[i+2]}]`);
  }

  // Check if there's alpha variation (subject edges)
  const alphaVals = new Set<number>();
  for (let i = 3; i < data.length; i += 4) {
    alphaVals.add(data[i]);
    if (alphaVals.size > 5) break;
  }
  console.log("Alpha values sample:", [...alphaVals].slice(0, 10));

  // 4. Check if img2img ran — look for SD artifacts
  // SD outputs tend to have more color variation

  // 5. Check OLD result for comparison
  console.log("\n=== OLD result analysis ===");
  try {
    const oldBuf = await fs.readFile("test-output/compare/OLD-before-change.png");
    const oldImg = await sharp(oldBuf).raw().toBuffer({ resolveWithObject: true });
    console.log("Dimensions:", oldImg.info.width, "x", oldImg.info.height, "channels:", oldImg.info.channels);
    console.log("Size:", oldBuf.length, "bytes");

    const oldData = oldImg.data as Buffer;
    const ow = oldImg.info.width;
    const oh = oldImg.info.height;
    const oldCorners = [
      oldData[0], oldData[1], oldData[2],
      oldData[(ow-1)*4], oldData[(ow-1)*4+1], oldData[(ow-1)*4+2],
      oldData[(oh-1)*ow*4], oldData[(oh-1)*ow*4+1], oldData[(oh-1)*ow*4+2],
    ];
    console.log("Corner pixel samples (R,G,B):");
    for (let i = 0; i < oldCorners.length; i += 3) {
      console.log(`  [${oldCorners[i]}, ${oldCorners[i+1]}, ${oldCorners[i+2]}]`);
    }
  } catch (e: any) {
    console.log("Failed to read OLD:", e.message);
  }

  // 6. Download original upload to see what we're working with
  console.log("\n=== Original upload analysis ===");
  const task = await p.bgReplaceTask.findUnique({
    where: { id: "cmp3z0qor0000novdniliv062" },
    include: { results: { take: 1 } },
  });
  if (task?.results[0]?.originalKey) {
    let origKey = task.results[0].originalKey;
    if (origKey.startsWith("http")) {
      const url = new URL(origKey);
      origKey = url.pathname.substring(1);
      const bucket = process.env.S3_BUCKET;
      if (bucket && origKey.startsWith(bucket + "/")) origKey = origKey.substring(bucket.length + 1);
    }
    console.log("Original key:", origKey);
    try {
      const origBuf = await downloadFromS3(origKey);
      console.log("Original size:", origBuf.length, "bytes");
      const origMeta = await sharp(origBuf).metadata();
      console.log("Original dims:", origMeta.width, "x", origMeta.height, origMeta.format);
    } catch (e: any) {
      console.log("Failed to download:", e.message);
    }
  }

  await p.$disconnect();
}
main();
