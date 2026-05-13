import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { downloadFromS3 } from "../src/lib/s3";
import sharp from "sharp";

async function main() {
  const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

  const t = await p.bgReplaceTask.findUnique({
    where: { id: "cmp4694sl0000vovdrfps4tix" },
    include: { results: { take: 1 } },
  });
  if (!t?.results[0]?.resultKey) { console.log("no result"); await p.$disconnect(); return; }
  const buf = await downloadFromS3(t.results[0].resultKey);
  const m = await sharp(buf).metadata();
  const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;
  console.log("GPT-5.4 FETCH:", m.width + "x" + m.height, Math.round(buf.length / 1024) + "KB");
  console.log("  TL:", [data[0], data[1], data[2]]);
  console.log("  BL:", [data[(h-1)*w*4], data[(h-1)*w*4+1], data[(h-1)*w*4+2]]);

  // Compare with traditional
  const t2 = await p.bgReplaceTask.findUnique({
    where: { id: "cmp41nl8d000010vda5w05ni1" },
    include: { results: { take: 1 } },
  });
  if (t2?.results[0]?.resultKey) {
    const buf2 = await downloadFromS3(t2.results[0].resultKey);
    const { data: d2 } = await sharp(buf2).raw().toBuffer({ resolveWithObject: true });
    let diffCount = 0;
    const len = Math.min(data.length, d2.length);
    for (let i = 0; i < len; i++) {
      if (data[i] !== d2[i]) diffCount++;
    }
    console.log("DIFF vs traditional:", diffCount, "pixels of", len, "(" + (diffCount / len * 100).toFixed(2) + "%)");
    if (diffCount === 0) console.log(">>> STILL FALLBACK - identical to traditional");
    else console.log(">>> AI BLEND WORKED - different from traditional!");
  }

  await p.$disconnect();
}
main();
