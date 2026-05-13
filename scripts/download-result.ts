import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { downloadFromS3 } from "../src/lib/s3";
import { writeFile, mkdir } from "fs/promises";
import sharp from "sharp";

async function download(taskId: string, label: string) {
  const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
  const task = await p.bgReplaceTask.findUnique({
    where: { id: taskId },
    include: { results: { take: 1 } },
  });
  if (!task?.results[0]?.resultKey) { console.log(label, ": no result"); return; }
  const key = task.results[0].resultKey;
  console.log(label, ":", key);
  const buf = await downloadFromS3(key);
  const fname = `test-output/compare/${label}.png`;
  await mkdir("test-output/compare", { recursive: true });
  await writeFile(fname, buf);
  const meta = await sharp(buf).metadata();
  console.log("  ->", meta.width + "x" + meta.height, (buf.length / 1024).toFixed(0) + "KB", meta.format);
  await p.$disconnect();
}

async function main() {
  await download("cmp3z0qor0000novdniliv062", "NEW-pipeline");       // after redeploy
  await download("cmp3k1g71000004jiat403g6n", "OLD-before-change");   // hours before
  await download("cmp3ytq4q0000qwvd8jlb8nkl", "FIRST-after-push");   // just after push
  console.log("\nFiles in test-output/compare/:");
}
main();
