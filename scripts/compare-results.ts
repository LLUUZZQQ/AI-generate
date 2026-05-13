import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { downloadFromS3 } from "../src/lib/s3";
import { writeFile, mkdir } from "fs/promises";
import sharp from "sharp";

async function main() {
  const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

  // New pipeline result
  const newTask = await p.bgReplaceTask.findUnique({
    where: { id: "cmp3z0qor0000novdniliv062" },
    include: { results: true },
  });
  const newResult = newTask?.results[0];

  // Old pipeline result (previous task)
  const oldTask = await p.bgReplaceTask.findUnique({
    where: { id: "cmp3ytq4q0000qwvd8jlb8nkl" },
    include: { results: true },
  });
  const oldResult = oldTask?.results[0];

  await mkdir("test-output/compare", { recursive: true });

  if (newResult?.resultKey) {
    console.log("Downloading NEW pipeline result:", newResult.resultKey);
    const buf = await downloadFromS3(newResult.resultKey);
    await writeFile("test-output/compare/NEW-pipeline.png", buf);
    const meta = await sharp(buf).metadata();
    console.log("  NEW:", meta.width + "x" + meta.height, meta.format, (buf.length / 1024).toFixed(0) + "KB");
  }

  if (oldResult?.resultKey) {
    console.log("Downloading OLD pipeline result:", oldResult.resultKey);
    const buf = await downloadFromS3(oldResult.resultKey);
    await writeFile("test-output/compare/OLD-pipeline.png", buf);
    const meta = await sharp(buf).metadata();
    console.log("  OLD:", meta.width + "x" + meta.height, meta.format, (buf.length / 1024).toFixed(0) + "KB");
  }

  console.log("\nCompare files at: test-output/compare/");
  console.log("  NEW-pipeline.png — 新管线（形状阴影 + 亮度匹配 + 边缘柔化 + 噪点 + img2img）");
  console.log("  OLD-pipeline.png — 旧管线（椭圆阴影 + 直接粘贴）");

  await p.$disconnect();
}
main();
