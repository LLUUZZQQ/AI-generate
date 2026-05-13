import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { downloadFromS3 } from "../src/lib/s3";
import { writeFile, mkdir } from "fs/promises";
import sharp from "sharp";

async function main() {
  const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

  const tasks = [
    { id: "cmp45i2c700003ovdxl6n1bew", label: "GPT54" },
    { id: "cmp41nl8d000010vda5w05ni1", label: "TRAD" },
  ];

  await mkdir("test-output/compare", { recursive: true });

  for (const { id, label } of tasks) {
    const t = await p.bgReplaceTask.findUnique({ where: { id }, include: { results: { take: 1 } } });
    if (!t?.results[0]?.resultKey) continue;
    const buf = await downloadFromS3(t.results[0].resultKey);
    await writeFile("test-output/compare/" + label + ".png", buf);
    const m = await sharp(buf).metadata();
    const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
    const w = info.width, h = info.height;
    console.log(label + ":", m.width + "x" + m.height, (buf.length / 1024).toFixed(0) + "KB");
    console.log("  TL:", [data[0], data[1], data[2]]);
    console.log("  BL:", [data[(h-1)*w*4], data[(h-1)*w*4+1], data[(h-1)*w*4+2]]);
  }
  await p.$disconnect();
}
main();
