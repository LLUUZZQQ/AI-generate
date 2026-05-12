import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { uploadToS3 } from "../src/lib/s3";
import sharp from "sharp";
import path from "path";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

async function genWoodDesk(): Promise<Buffer> {
  // Generate a wood-like pattern using SVG
  const svg = `<svg width="1024" height="1024">
    <defs>
      <linearGradient id="g1" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:#d4b896"/>
        <stop offset="15%" style="stop-color:#c4a47a"/>
        <stop offset="30%" style="stop-color:#d4b896"/>
        <stop offset="45%" style="stop-color:#ba9a6a"/>
        <stop offset="60%" style="stop-color:#d4b896"/>
        <stop offset="75%" style="stop-color:#c4a47a"/>
        <stop offset="90%" style="stop-color:#d4b896"/>
        <stop offset="100%" style="stop-color:#ba9a6a"/>
      </linearGradient>
    </defs>
    <rect width="1024" height="1024" fill="url(#g1)"/>
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer();
}

async function genWhiteBedsheet(): Promise<Buffer> {
  const svg = `<svg width="1024" height="1024">
    <defs>
      <linearGradient id="g2" x1="0%" y1="0%" x2="100%" y2="50%">
        <stop offset="0%" style="stop-color:#f8f8f6"/>
        <stop offset="30%" style="stop-color:#f4f4f2"/>
        <stop offset="60%" style="stop-color:#fafaf9"/>
        <stop offset="100%" style="stop-color:#f4f4f2"/>
      </linearGradient>
    </defs>
    <rect width="1024" height="1024" fill="url(#g2)"/>
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer();
}

async function genConcrete(): Promise<Buffer> {
  const svg = `<svg width="1024" height="1024">
    <defs>
      <radialGradient id="g3" cx="50%" cy="50%" r="70%">
        <stop offset="0%" style="stop-color:#c0c0bc"/>
        <stop offset="50%" style="stop-color:#b0b0ad"/>
        <stop offset="100%" style="stop-color:#a0a09d"/>
      </radialGradient>
    </defs>
    <rect width="1024" height="1024" fill="url(#g3)"/>
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer();
}

const fallbacks: Record<string, () => Promise<Buffer>> = {
  "木质桌面": genWoodDesk,
  "白色床单": genWhiteBedsheet,
  "水泥地面": genConcrete,
};

async function main() {
  const templates = await prisma.backgroundTemplate.findMany({ where: { isActive: true } });

  for (const t of templates) {
    const gen = fallbacks[t.name];
    if (!gen) continue;

    try {
      console.log(`[${t.name}]`);
      const image = await gen();

      const key = `backgrounds/${t.category}/${t.name.toLowerCase().replace(/\s+/g, "-")}.jpg`;
      const url = await uploadToS3(key, image, "image/jpeg");
      console.log(`  Uploaded: ${url}`);

      const thumb = await sharp(image).resize(300, 300, { fit: "cover" }).jpeg({ quality: 80 }).toBuffer();
      const thumbKey = `backgrounds/thumbnails/${t.name.toLowerCase().replace(/\s+/g, "-")}-thumb.jpg`;
      await uploadToS3(thumbKey, thumb, "image/jpeg");

      await prisma.backgroundTemplate.update({
        where: { id: t.id },
        data: { fileUrl: `/${key}`, thumbnailUrl: `/${thumbKey}` },
      });

      const fs = await import("fs/promises");
      const localPath = path.join(process.cwd(), "public", key);
      await fs.mkdir(path.dirname(localPath), { recursive: true });
      await fs.writeFile(localPath, image);

      const localThumbPath = path.join(process.cwd(), "public", thumbKey);
      await fs.mkdir(path.dirname(localThumbPath), { recursive: true });
      await fs.writeFile(localThumbPath, thumb);

      console.log(`  Done\n`);
    } catch (e: any) {
      console.log(`  ERROR: ${e.message}\n`);
    }
  }

  console.log("Done!");
  await prisma.$disconnect();
}

main().catch(console.error);
