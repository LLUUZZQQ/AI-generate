import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { uploadToS3 } from "../src/lib/s3";
import sharp from "sharp";
import path from "path";
import { writeFile, mkdir } from "fs/promises";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const engNames: Record<string, string> = {
  "浅色木地板": "light-wood-floor", "深色木地板": "dark-wood-floor",
  "白色瓷砖": "white-tile-floor", "灰色毛毯": "gray-carpet",
  "白墙-明亮": "white-wall", "砖墙-复古": "brick-wall",
  "木质桌面": "wood-desk", "大理石桌面": "marble-desk",
  "白色床单": "white-bedsheet", "阳台-自然光": "balcony",
  "草地-户外": "grass-outdoor", "水泥地面": "concrete-floor",
};

// Use Lorem Picsum with specific seeds — each seed returns a different real photo
const seeds: Record<string, string> = {
  "浅色木地板": "wood-floor-light",
  "深色木地板": "dark-hardwood",
  "白色瓷砖": "bathroom-tile",
  "灰色毛毯": "gray-rug",
  "白墙-明亮": "white-interior-wall",
  "砖墙-复古": "brick-texture",
  "木质桌面": "wooden-table-top",
  "大理石桌面": "marble-surface",
  "白色床单": "white-linen",
  "阳台-自然光": "balcony-outdoor",
  "草地-户外": "green-grass-lawn",
  "水泥地面": "concrete-texture",
};

async function downloadImage(seed: string): Promise<Buffer | null> {
  const url = `https://picsum.photos/seed/${seed}/1024/1024`;
  console.log(`  ${url}`);
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) { console.log(`  HTTP ${res.status}`); return null; }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 10000) { console.log(`  Too small (${buf.length})`); return null; }
    console.log(`  Got: ${buf.length} bytes`);
    return buf;
  } catch (e: any) { console.log(`  ${e.message}`); return null; }
}

async function main() {
  const templates = await prisma.backgroundTemplate.findMany({ where: { isActive: true } });
  let ok = 0, fail = 0;

  for (const t of templates) {
    const eng = engNames[t.name];
    const seed = seeds[t.name];
    if (!eng || !seed) continue;

    console.log(`\n[${t.name}] seed=${seed}`);
    const img = await downloadImage(seed);
    if (!img) { fail++; continue; }

    try {
      const optimized = await sharp(img).jpeg({ quality: 85 }).toBuffer();

      const key = `backgrounds/${t.category}/${eng}.jpg`;
      const url = await uploadToS3(key, optimized, "image/jpeg");
      console.log(`  S3: ${url}`);

      const thumb = await sharp(optimized).resize(300, 300, { fit: "cover" }).jpeg({ quality: 75 }).toBuffer();
      const thumbKey = `backgrounds/thumbnails/${eng}-thumb.jpg`;
      await uploadToS3(thumbKey, thumb, "image/jpeg");

      await prisma.backgroundTemplate.update({
        where: { id: t.id },
        data: { fileUrl: url, thumbnailUrl: `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET}/${thumbKey}` },
      });

      const fs = await import("fs/promises");
      const lp = path.join(process.cwd(), "public", key);
      await fs.mkdir(path.dirname(lp), { recursive: true });
      await fs.writeFile(lp, optimized);
      const tp = path.join(process.cwd(), "public", thumbKey);
      await fs.mkdir(path.dirname(tp), { recursive: true });
      await fs.writeFile(tp, thumb);
      ok++;
    } catch (e: any) { console.log(`  ERROR: ${e.message}`); fail++; }
    await new Promise(r => setTimeout(r, 1500));
  }

  console.log(`\nDone: ${ok} ok, ${fail} failed`);
  await prisma.$disconnect();
}
main().catch(console.error);
