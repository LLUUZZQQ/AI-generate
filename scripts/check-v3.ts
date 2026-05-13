import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { downloadFromS3 } from "../src/lib/s3";
import { writeFile, mkdir } from "fs/promises";
import sharp from "sharp";

async function main() {
  const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
  const t = await p.bgReplaceTask.findUnique({
    where: { id: "cmp41nl8d000010vda5w05ni1" },
    include: { results: { take: 1 } },
  });
  const k = t!.results[0].resultKey!;
  console.log("Key:", k);
  const buf = await downloadFromS3(k);
  await mkdir("test-output/compare", { recursive: true });
  await writeFile("test-output/compare/V3-fixed.png", buf);
  const m = await sharp(buf).metadata();
  console.log("Size:", m.width + "x" + m.height, (buf.length / 1024).toFixed(0) + "KB");

  const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;
  console.log("Corners:");
  console.log("  TL:", [data[0], data[1], data[2]]);
  console.log("  TR:", [data[(w-1)*4], data[(w-1)*4+1], data[(w-1)*4+2]]);
  console.log("  BL:", [data[(h-1)*w*4], data[(h-1)*w*4+1], data[(h-1)*w*4+2]]);
  console.log("  BR:", [data[((h-1)*w+w-1)*4], data[((h-1)*w+w-1)*4+1], data[((h-1)*w+w-1)*4+2]]);

  await p.$disconnect();
}
main();
