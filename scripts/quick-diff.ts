import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { downloadFromS3 } from "../src/lib/s3";
import sharp from "sharp";

async function main() {
  const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

  const t = await p.bgReplaceTask.findUnique({
    where: { id: "cmp48ax2t00001svdvac74m0f" },
    include: { results: { take: 1 } },
  });
  const buf = await downloadFromS3(t!.results[0].resultKey!);
  const m = await sharp(buf).metadata();
  const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;
  console.log("NEW:", m.width + "x" + m.height, Math.round(buf.length / 1024) + "KB");
  console.log("  TL:", [data[0], data[1], data[2]]);
  console.log("  BL:", [data[(h-1)*w*4], data[(h-1)*w*4+1], data[(h-1)*w*4+2]]);

  const t2 = await p.bgReplaceTask.findUnique({
    where: { id: "cmp41nl8d000010vda5w05ni1" },
    include: { results: { take: 1 } },
  });
  const buf2 = await downloadFromS3(t2!.results[0].resultKey!);
  const { data: d2 } = await sharp(buf2).raw().toBuffer({ resolveWithObject: true });
  let diff = 0;
  const len = Math.min(data.length, d2.length);
  for (let i = 0; i < len; i++) { if (data[i] !== d2[i]) diff++; }
  console.log("Diff:", diff, "of", len, "(" + (diff / len * 100).toFixed(2) + "%)");
  console.log(diff === 0 ? ">>> FALLBACK" : ">>> AI BLEND WORKED!");

  await p.$disconnect();
}
main();
