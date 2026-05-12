import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { uploadToS3 } from "../src/lib/s3";
import sharp from "sharp";
import path from "path";
import { writeFile, mkdir } from "fs/promises";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

// English keywords matching each template name
const keywords: Record<string, string> = {
  "浅色木地板": "light-oak-wood-floor-texture",
  "深色木地板": "dark-hardwood-floor-texture",
  "白色瓷砖": "white-ceramic-tile-floor",
  "灰色毛毯": "gray-carpet-texture-floor",
  "白墙-明亮": "white-wall-paint-texture",
  "砖墙-复古": "red-brick-wall-texture",
  "木质桌面": "wooden-table-surface-texture",
  "大理石桌面": "white-marble-countertop-texture",
  "白色床单": "white-bedsheet-fabric-texture",
  "阳台-自然光": "balcony-floor-outdoor",
  "草地-户外": "grass-lawn-top-down",
  "水泥地面": "concrete-floor-texture",
};

async function downloadImage(keyword: string, fallback: string): Promise<Buffer | null> {
  // Try Lorem Flickr first, then Lorem Picsum as fallback
  const urls = [
    `https://loremflickr.com/1024/1024/${keyword}`,
    `https://picsum.photos/seed/${fallback}/1024/1024`,
  ];

  for (const url of urls) {
    console.log(`  Trying: ${url}`);
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (!res.ok) {
        console.log(`  HTTP ${res.status}`);
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 5000) {
        console.log(`  Too small (${buf.length} bytes), likely placeholder`);
        continue;
      }
      console.log(`  Got: ${buf.length} bytes`);
      return buf;
    } catch (e: any) {
      console.log(`  Failed: ${e.message}`);
    }
  }
  return null;
}

async function main() {
  const templates = await prisma.backgroundTemplate.findMany({ where: { isActive: true } });

  for (const t of templates) {
    const kw = keywords[t.name];
    if (!kw) { console.log(`Skip: ${t.name}`); continue; }

    console.log(`\n[${t.name}]`);
    const fb = t.name.toLowerCase().replace(/\s+/g, "-");
    const image = await downloadImage(kw, fb);
    if (!image) continue;

    // Optimize: resize if needed, compress
    const optimized = await sharp(image)
      .resize(1024, 1024, { fit: "cover", withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();

    // S3 key — avoid Chinese chars by using English name
    const engName = t.name.toLowerCase().replace(/\s+/g, "-");
    const key = `backgrounds/${t.category}/${engName}.jpg`;
    const url = await uploadToS3(key, optimized, "image/jpeg");
    console.log(`  S3: ${url}`);

    // Thumbnail
    const thumb = await sharp(optimized).resize(300, 300, { fit: "cover" }).jpeg({ quality: 80 }).toBuffer();
    const thumbKey = `backgrounds/thumbnails/${engName}-thumb.jpg`;
    await uploadToS3(thumbKey, thumb, "image/jpeg");

    // Update DB — use direct S3 URL
    await prisma.backgroundTemplate.update({
      where: { id: t.id },
      data: { fileUrl: url, thumbnailUrl: `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET}/${thumbKey}` },
    });

    // Save local copy
    const fs = await import("fs/promises");
    const localPath = path.join(process.cwd(), "public", key);
    await fs.mkdir(path.dirname(localPath), { recursive: true });
    await fs.writeFile(localPath, optimized);

    const localThumbPath = path.join(process.cwd(), "public", thumbKey);
    await fs.mkdir(path.dirname(localThumbPath), { recursive: true });
    await fs.writeFile(localThumbPath, thumb);

    console.log(`  DB updated, local saved`);

    // Rate limit
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log("\nDone!");
  await prisma.$disconnect();
}

main().catch(console.error);
