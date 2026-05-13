import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { downloadFromS3 } from "../src/lib/s3";
import { writeFile, mkdir } from "fs/promises";
import sharp from "sharp";

async function main() {
  const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

  const tasks = [
    { id: "cmp42ww2e0000cwvdd29wyz61", label: "AI-blend", desc: "GPT-4o AI融合" },
    { id: "cmp41nl8d000010vda5w05ni1", label: "V3-fixed", desc: "修复后传统管线" },
    { id: "cmp3k1g71000004jiat403g6n", label: "OLD-original", desc: "最初旧管线" },
  ];

  await mkdir("test-output/compare", { recursive: true });

  for (const { id, label, desc } of tasks) {
    const t = await p.bgReplaceTask.findUnique({
      where: { id },
      include: { results: { take: 1 } },
    });
    if (!t?.results[0]?.resultKey) { console.log(label, ": no result"); continue; }
    const key = t.results[0].resultKey;
    const buf = await downloadFromS3(key);
    const fname = `test-output/compare/${label}.png`;
    await writeFile(fname, buf);
    const m = await sharp(buf).metadata();
    const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
    const w = info.width, h = info.height;
    const corners = {
      TL: [data[0], data[1], data[2]],
      TR: [data[(w-1)*4], data[(w-1)*4+1], data[(w-1)*4+2]],
      BL: [data[(h-1)*w*4], data[(h-1)*w*4+1], data[(h-1)*w*4+2]],
      BR: [data[((h-1)*w+w-1)*4], data[((h-1)*w+w-1)*4+1], data[((h-1)*w+w-1)*4+2]],
    };
    console.log(`${desc}:`);
    console.log(`  ${m.width}x${m.height} ${(buf.length/1024).toFixed(0)}KB`);
    console.log(`  Corners:`, JSON.stringify(corners));
    console.log();
  }

  await p.$disconnect();
}
main();
