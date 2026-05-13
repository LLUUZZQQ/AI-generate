import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { uploadToS3 } from "../src/lib/s3";
import sharp from "sharp";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const scenePrompts: Record<string, string> = {
  "浅色木地板": "Empty indoor room with light oak wood floor, warm diffused natural light from window, clean minimal interior, suitable for product photography. No furniture, no objects on floor. Casual smartphone photo quality.",
  "深色木地板": "Empty room with dark rich hardwood floor, soft warm lighting, clean interior space. No furniture or objects. Professional product photography background. Natural unposed look.",
  "白色瓷砖": "Clean white ceramic tile floor, bright natural light, modern minimal interior. Empty surface for product placement. Casual smartphone photo quality, slightly warm tone.",
  "灰色毛毯": "Soft gray carpet texture floor, cozy indoor setting, diffused natural light. Empty floor space suitable for product photography. Casual relaxed atmosphere.",
  "白墙-明亮": "Bright white wall interior, clean minimal space, soft natural window light. Empty room suitable as product photography background. Casual unposed smartphone photo.",
  "砖墙-复古": "Exposed red brick wall with warm vintage character, soft afternoon light, urban loft feel. Empty wall space suitable for product photography. Natural textured background.",
  "木质桌面": "Clean wooden table surface from above, warm natural wood grain texture, soft overhead lighting. Empty tabletop for product photography. Casual workbench style photo.",
  "大理石桌面": "White marble countertop surface, elegant veining detail, bright clean lighting from above. Empty luxury surface for product photography. High-end casual phone photo.",
  "白色床单": "Clean white bedsheet fabric surface, soft natural morning light, cozy bedroom atmosphere. Empty fabric space suitable for product photography. Relaxed casual photo.",
  "阳台-自然光": "Empty balcony floor tiles with natural outdoor daylight, soft shadows, some green plants at edges. Suitable for product photography. Casual phone snapshot in morning light.",
  "草地-户外": "Green grass lawn outdoors, natural sunlight, shallow depth of field, park-like setting. Empty ground suitable for product photography. Casual outdoor phone photo.",
  "水泥地面": "Smooth concrete floor surface, industrial modern look, diffused natural light. Empty ground suitable for product photography. Minimal urban casual photo.",
};

const engNames: Record<string, string> = {
  "浅色木地板": "light-wood-floor", "深色木地板": "dark-wood-floor",
  "白色瓷砖": "white-tile-floor", "灰色毛毯": "gray-carpet",
  "白墙-明亮": "white-wall", "砖墙-复古": "brick-wall",
  "木质桌面": "wood-desk", "大理石桌面": "marble-desk",
  "白色床单": "white-bedsheet", "阳台-自然光": "balcony",
  "草地-户外": "grass-outdoor", "水泥地面": "concrete-floor",
};

async function generateImage(prompt: string): Promise<Buffer | null> {
  const apiKey = process.env.OPENAI_API_KEY!;
  const body = JSON.stringify({
    model: "openai/dall-e-3",
    prompt: `${prompt} No text, watermark, or logo. No products or objects. Just empty background scene.`,
    n: 1,
    size: "1024x1024",
    response_format: "b64_json",
  });

  console.log("  Calling OpenRouter images.generate...");
  const resp = await fetch("https://openrouter.ai/api/v1/images/generations", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "FrameCraft",
    },
    body,
    signal: AbortSignal.timeout(120000),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error("  HTTP", resp.status, errText.substring(0, 300));
    return null;
  }

  const data = await resp.json() as any;

  // Try b64_json first
  if (data?.data?.[0]?.b64_json) {
    return Buffer.from(data.data[0].b64_json, "base64");
  }

  // Try URL
  const url = data?.data?.[0]?.url;
  if (url) {
    console.log("  Downloading from URL...");
    const imgResp = await fetch(url);
    if (imgResp.ok) return Buffer.from(await imgResp.arrayBuffer());
  }

  console.error("  Could not extract image from response:", JSON.stringify(data).substring(0, 200));
  return null;
}

async function main() {
  const templates = await prisma.backgroundTemplate.findMany({ where: { isActive: true } });
  console.log(`Generating scenes for ${templates.length} templates...\n`);

  for (const t of templates) {
    const prompt = scenePrompts[t.name];
    const eng = engNames[t.name];
    if (!prompt || !eng) { console.log(`Skip: ${t.name}`); continue; }

    console.log(`[${t.name}]`);
    const image = await generateImage(prompt);
    if (!image) continue;

    // Optimize
    const optimized = await sharp(image)
      .resize(1024, 1024, { fit: "cover", withoutEnlargement: true })
      .jpeg({ quality: 88 })
      .toBuffer();

    // Upload full
    const key = `backgrounds/${t.category}/${eng}.jpg`;
    const url = await uploadToS3(key, optimized, "image/jpeg");
    console.log("  Full:", url.substring(0, 60));

    // Thumbnail
    const thumb = await sharp(optimized)
      .resize(300, 300, { fit: "cover" })
      .jpeg({ quality: 75 })
      .toBuffer();
    const thumbKey = `backgrounds/thumbnails/${eng}-thumb.jpg`;
    await uploadToS3(thumbKey, thumb, "image/jpeg");

    // Update DB
    await prisma.backgroundTemplate.update({
      where: { id: t.id },
      data: { fileUrl: url, thumbnailUrl: `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET}/${thumbKey}` },
    });
    console.log("  Done\n");

    // Rate limit
    await new Promise(r => setTimeout(r, 3000));
  }

  console.log("All done!");
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
