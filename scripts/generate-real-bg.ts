import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { uploadToS3 } from "../src/lib/s3";
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import sharp from "sharp";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

// Realistic prompts for each background category
const bgPrompts: Record<string, string> = {
  "浅色木地板": "light oak wooden floor, top-down view, natural sunlight from window, realistic texture, no furniture, no objects, photorealistic, smartphone photo",
  "深色木地板": "dark walnut hardwood floor, top-down view, warm indoor lighting, realistic wood grain texture, no furniture, no objects, photorealistic",
  "白色瓷砖": "white ceramic tile floor, top-down view, bright clean, subtle grout lines, natural light, realistic texture, no objects, photorealistic",
  "灰色毛毯": "soft gray carpet floor, top-down view, cozy texture, natural light, no furniture, no objects, photorealistic, smartphone photo",
  "白墙-明亮": "plain white wall, natural daylight, clean smooth surface, minimal shadows, no decorations, no objects, photorealistic, smartphone photo",
  "砖墙-复古": "exposed red brick wall, warm lighting, rustic texture, no objects, no decorations, photorealistic, smartphone photo",
  "木质桌面": "light wood desk surface, top-down view, natural wood grain, warm light, no objects, photorealistic, smartphone photo",
  "大理石桌面": "white marble countertop, top-down view, elegant veining, bright natural light, no objects, photorealistic, smartphone photo",
  "白色床单": "white bedsheet fabric, top-down view, soft wrinkled texture, natural light, no objects, photorealistic, smartphone photo",
  "阳台-自然光": "apartment balcony floor, natural daylight, outdoor tiles, slightly weathered, no furniture, no objects, photorealistic, smartphone photo",
  "草地-户外": "green grass lawn, top-down view, natural sunlight, realistic texture, no objects, no shadows, photorealistic, smartphone photo",
  "水泥地面": "smooth concrete floor, industrial style, top-down view, natural light, subtle texture, no objects, photorealistic, smartphone photo",
};

async function generateImage(prompt: string): Promise<Buffer> {
  const { HfInference } = await import("@huggingface/inference");
  const hf = new HfInference(process.env.HF_TOKEN!);

  console.log(`  Generating: ${prompt.substring(0, 60)}...`);
  const result = await hf.textToImage({
    model: "stabilityai/stable-diffusion-xl-base-1.0",
    inputs: prompt + ", photorealistic, natural lighting, casual smartphone photo, no text, no watermark, no overlay",
    parameters: {
      negative_prompt: "text, watermark, logo, overlay, product, object, person, furniture, decoration, shoe, clothing",
      width: 1024,
      height: 1024,
    },
  });

  if (typeof result === "string") {
    const res = await fetch(result);
    return Buffer.from(await res.arrayBuffer());
  }
  return Buffer.from(await (result as Blob).arrayBuffer());
}

async function main() {
  const templates = await prisma.backgroundTemplate.findMany({ where: { isActive: true } });
  console.log(`Found ${templates.length} templates to process\n`);

  // Only process remaining ones that failed
  const retryNames = ["木质桌面", "大理石桌面", "白色床单"];

  for (const t of templates) {
    if (!retryNames.includes(t.name)) continue;
    const prompt = bgPrompts[t.name];
    if (!prompt) {
      console.log(`Skip ${t.name} — no prompt defined`);
      continue;
    }

    try {
      console.log(`[${t.name}]`);
      const image = await generateImage(prompt);

      // Upload to S3
      const key = `backgrounds/${t.category}/${t.name.toLowerCase().replace(/\s+/g, "-")}.jpg`;
      const url = await uploadToS3(key, image, "image/jpeg");
      console.log(`  Uploaded: ${url}`);

      // Generate thumbnail
      const thumb = await sharp(image).resize(300, 300, { fit: "cover" }).jpeg({ quality: 80 }).toBuffer();
      const thumbKey = `backgrounds/thumbnails/${t.name.toLowerCase().replace(/\s+/g, "-")}-thumb.jpg`;
      await uploadToS3(thumbKey, thumb, "image/jpeg");
      console.log(`  Thumbnail uploaded`);

      // Update DB
      await prisma.backgroundTemplate.update({
        where: { id: t.id },
        data: { fileUrl: `/${key}`, thumbnailUrl: `/${thumbKey}` },
      });

      // Also save locally for fallback
      const localPath = path.join(process.cwd(), "public", key);
      const localDir = path.dirname(localPath);
      const fs = await import("fs/promises");
      await fs.mkdir(localDir, { recursive: true });
      await fs.writeFile(localPath, image);

      const localThumbPath = path.join(process.cwd(), "public", thumbKey);
      await fs.mkdir(path.dirname(localThumbPath), { recursive: true });
      await fs.writeFile(localThumbPath, thumb);

      console.log(`  Local files saved\n`);
    } catch (e: any) {
      console.log(`  ERROR: ${e.message}\n`);
    }
  }

  console.log("Done!");
  await prisma.$disconnect();
}

main().catch(console.error);
