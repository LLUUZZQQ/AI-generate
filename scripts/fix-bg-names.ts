import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { uploadToS3 } from "../src/lib/s3";
import sharp from "sharp";
import { readFileSync } from "fs";
import path from "path";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
const ENDPOINT = process.env.S3_ENDPOINT!;
const BUCKET = process.env.S3_BUCKET!;

const engNames: Record<string, string> = {
  "浅色木地板": "light-wood-floor",
  "深色木地板": "dark-wood-floor",
  "白色瓷砖": "white-tile-floor",
  "灰色毛毯": "gray-carpet",
  "白墙-明亮": "white-wall",
  "砖墙-复古": "brick-wall",
  "木质桌面": "wood-desk",
  "大理石桌面": "marble-desk",
  "白色床单": "white-bedsheet",
  "阳台-自然光": "balcony",
  "草地-户外": "grass-outdoor",
  "水泥地面": "concrete-floor",
};

async function main() {
  const templates = await prisma.backgroundTemplate.findMany();

  for (const t of templates) {
    const eng = engNames[t.name];
    if (!eng) { console.log(`Skip: ${t.name}`); continue; }

    console.log(`[${t.name}] → ${eng}`);

    // Read local file
    const localPath = path.join(process.cwd(), "public", "backgrounds", t.category, eng + ".jpg");
    let image: Buffer;
    try {
      image = readFileSync(localPath);
    } catch {
      // Try the old Chinese filename
      const oldPath = path.join(process.cwd(), "public", "backgrounds", t.category, t.name.toLowerCase().replace(/\s+/g, "-") + ".jpg");
      try {
        image = readFileSync(oldPath);
      } catch {
        console.log(`  No local file found, skipping`);
        continue;
      }
    }

    // Upload with English key
    const key = `backgrounds/${t.category}/${eng}.jpg`;
    const url = await uploadToS3(key, image, "image/jpeg");
    console.log(`  S3: ${url}`);

    // Thumbnail
    const thumb = await sharp(image).resize(300, 300, { fit: "cover" }).jpeg({ quality: 80 }).toBuffer();
    const thumbKey = `backgrounds/thumbnails/${eng}-thumb.jpg`;
    await uploadToS3(thumbKey, thumb, "image/jpeg");

    // Update DB
    await prisma.backgroundTemplate.update({
      where: { id: t.id },
      data: { fileUrl: url, thumbnailUrl: `${ENDPOINT}/${BUCKET}/${thumbKey}` },
    });

    // Save local with English name
    const fs = await import("fs/promises");
    await fs.writeFile(localPath, image);
    const localThumb = path.join(process.cwd(), "public", "backgrounds", "thumbnails", eng + "-thumb.jpg");
    await fs.writeFile(localThumb, thumb);

    console.log(`  Done`);
  }

  console.log("\nAll done!");
  await prisma.$disconnect();
}

main().catch(console.error);
