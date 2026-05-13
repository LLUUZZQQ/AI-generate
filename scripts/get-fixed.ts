import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { downloadFromS3 } from "../src/lib/s3";
import { writeFile, mkdir } from "fs/promises";
import sharp from "sharp";

async function main() {
  const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

  const task = await p.bgReplaceTask.findUnique({
    where: { id: "cmp41387y0000wkvdl26p95to" },
    include: { results: { take: 1 } },
  });
  if (!task?.results[0]?.resultKey) { console.log("No result"); return; }

  const key = task.results[0].resultKey;
  console.log("Result key:", key);
  const buf = await downloadFromS3(key);
  await mkdir("test-output/compare", { recursive: true });
  const fname = "test-output/compare/FIXED-pipeline.png";
  await writeFile(fname, buf);
  const meta = await sharp(buf).metadata();
  console.log("Dimensions:", meta.width, "x", meta.height);
  console.log("Size:", (buf.length / 1024).toFixed(0), "KB");
  console.log("Format:", meta.format);
  console.log("Saved to:", fname);

  // Quick pixel check
  const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;
  console.log("\nCorner samples:");
  console.log("  top-left:", [data[0], data[1], data[2]]);
  console.log("  top-right:", [data[(w-1)*4], data[(w-1)*4+1], data[(w-1)*4+2]]);
  console.log("  bottom-left:", [data[(h-1)*w*4], data[(h-1)*w*4+1], data[(h-1)*w*4+2]]);
  console.log("  bottom-right:", [data[((h-1)*w+w-1)*4], data[((h-1)*w+w-1)*4+1], data[((h-1)*w+w-1)*4+2]]);

  await p.$disconnect();
}
main();
