import { NextRequest } from "next/server";
import { withAuth } from "@/lib/auth-guard";
import { success, error, paginated } from "@/lib/response";
import { checkRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";
import { downloadFromS3, uploadToS3 } from "@/lib/s3";
import { z } from "zod";

const COST_PER = 3;
const HD_COST = 5;

const STYLES: Record<string, string> = {
  "royal": "Transform this pet into a royal palace portrait. Velvet background, golden frame, regal bearing, jewel tones, majestic lighting. Keep the pet's face and features exactly as in the original photo.",
  "oil-painting": "Transform this pet into a classical oil painting. Rich brushstrokes, dramatic Rembrandt lighting, dark noble background. Keep the pet's face and features recognizable and faithful to the original.",
  "disney": "Transform this pet into a classic Disney animation cel. Vintage hand-drawn animation style, expressive eyes, soft magical colors. Keep the pet's face and features recognizable and faithful to the original.",
  "anime": "Transform this pet into a Studio Ghibli anime illustration. Soft cel-shaded look, warm magical atmosphere, gentle color palette. Keep the pet's face and features recognizable and faithful to the original.",
  "vangogh": "Transform this pet into a Van Gogh painting. Bold swirling brushstrokes, vibrant yellows and blues, thick impasto texture. Keep the pet's face and features recognizable and faithful to the original.",
  "pop-art": "Transform this pet into an Andy Warhol pop art portrait. Bold saturated colors, halftone dots, comic book style, vibrant contrast. Keep the pet's face and features recognizable and faithful to the original.",
  "cyberpunk": "Transform this pet into a cyberpunk character. Neon purple/cyan/pink lighting, futuristic city background, synthwave aesthetic. Keep the pet's face and features recognizable and faithful to the original.",
  "neon": "Transform this pet into a neon sign. Glowing neon tubes against a dark brick wall, electric vibrant colors, retro sign aesthetic. Keep the pet's face and features recognizable and faithful to the original.",
  "watercolor": "Transform this pet into a delicate watercolor painting. Soft flowing washes, light airy feel, subtle color blooms on white paper. Keep the pet's face and features recognizable and faithful to the original.",
  "pencil": "Transform this pet into a detailed pencil sketch. Fine graphite lines, delicate shading, artistic crosshatching, white paper background. Keep the pet's face and features recognizable and faithful to the original.",
  "baroque": "Transform this pet into a Baroque era portrait. Dramatic chiaroscuro, rich gold and crimson tones, ornate classical setting. Keep the pet's face and features recognizable and faithful to the original.",
  "ukiyo-e": "Transform this pet into a Japanese ukiyo-e woodblock print. Flat color planes, bold outlines, traditional Japanese aesthetic, washi paper texture. Keep the pet's face and features recognizable and faithful to the original.",
  "stained-glass": "Transform this pet into a stained glass window. Bold black leading lines, jewel-toned colored glass segments, cathedral light shining through. Keep the pet's face and features recognizable and faithful to the original.",
  "pixel": "Transform this pet into pixel art. 16-bit game sprite style, limited color palette, crisp square pixels, retro gaming aesthetic. Keep the pet's face and features recognizable and faithful to the original.",
  "egyptian": "Transform this pet into an ancient Egyptian wall painting. Gold and lapis lazuli colors, sandstone texture, hieroglyphic border. Keep the pet's face and features recognizable and faithful to the original.",
  "astronaut": "Transform this pet into an astronaut. Realistic spacesuit helmet around the pet's head, stars and nebula in the visor, deep space background. Keep the pet's face and features recognizable and faithful to the original.",
};

const STYLE_LABELS: Record<string, string> = {
  "royal": "皇家肖像", "oil-painting": "古典油画", "disney": "迪士尼动画",
  "anime": "吉卜力动漫", "vangogh": "梵高风格", "pop-art": "波普艺术",
  "cyberpunk": "赛博朋克", "neon": "霓虹灯牌", "watercolor": "清新水彩",
  "pencil": "铅笔素描", "baroque": "巴洛克", "ukiyo-e": "浮世绘",
  "stained-glass": "彩色玻璃", "pixel": "像素游戏", "egyptian": "埃及法老",
  "astronaut": "太空宇航员",
};

const createSchema = z.object({
  fileKeys: z.array(z.string()).min(1).max(5),
  style: z.string().min(1),
  numImages: z.number().min(1).max(4).default(2),
  intensity: z.enum(["light", "medium", "strong"]).default("medium"),
  model: z.string().default("google/gemini-3.1-flash-image-preview"),
  hd: z.boolean().default(false),
  customStyle: z.string().optional(),
});

export const POST = withAuth(async (req: NextRequest, _ctx: any, user: { id: string }) => {
  if (!checkRateLimit(`pet-portrait:${user.id}`, 5, 60000)) {
    return error(42900, "请求太频繁");
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return error(40001, "参数错误");

  const { fileKeys, style, numImages, intensity, model, hd, customStyle } = parsed.data;
  const totalImages = fileKeys.length * numImages;
  const totalCost = totalImages * (COST_PER + (hd ? HD_COST : 0));

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser || dbUser.credits < totalCost) {
    return error(40003, `积分不足，需要 ${totalCost} 积分`);
  }

  try {
    const basePrompt = customStyle || STYLES[style] || STYLES["royal"];
    const intensityMod: Record<string, string> = {
      light: " Apply a very subtle style treatment. Keep most of the original photo character.",
      medium: "",
      strong: " Apply maximum style intensity. Full artistic transformation.",
    };
    const fullPrompt = (basePrompt + (intensityMod[intensity] || "")).trim();

    const apiKey = process.env.OPENAI_API_KEY!;

    // Download all originals in parallel
    const imageB64List = await Promise.all(fileKeys.map(async (key) => {
      if (key.startsWith("http")) {
        const r = await fetch(key);
        return Buffer.from(await r.arrayBuffer()).toString("base64");
      }
      return (await downloadFromS3(key)).toString("base64");
    }));

    // Generate all images in parallel
    const allResults: string[][] = [];
    for (const imageB64 of imageB64List) {
      const batch = await Promise.all(
        Array.from({ length: numImages }, async (_, idx) => {
          const bodyObj: any = {
            model,
            messages: [{
              role: "user",
              content: [
                { type: "text", text: fullPrompt },
                { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageB64}` } },
              ],
            }],
            max_tokens: 4096,
          };

          console.log(`[pet-portrait] calling ${model} #${idx + 1}`);
          const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${apiKey}`,
              "Content-Type": "application/json",
              "HTTP-Referer": process.env.NEXT_PUBLIC_URL || "https://ai-generate-two.vercel.app",
              "X-Title": "FrameCraft",
            },
            body: JSON.stringify(bodyObj),
            signal: AbortSignal.timeout(90000),
          });

          if (!resp.ok) return null;
          const data = await resp.json() as any;
          const msg = data?.choices?.[0]?.message;
          if (!msg) return null;

          let buf: Buffer | null = null;
          const content = msg.content;

          if (typeof content === "string" && (content.startsWith("data:image") || content.length > 1000)) {
            buf = Buffer.from(content.includes("base64,") ? content.split("base64,")[1] : content, "base64");
          }
          if (!buf && Array.isArray(content)) {
            for (const p of content) {
              if (p.type === "image_url" && p.image_url?.url) {
                const u = p.image_url.url;
                buf = u.startsWith("data:") ? Buffer.from(u.includes("base64,") ? u.split("base64,")[1] : u, "base64") : Buffer.from(await (await fetch(u)).arrayBuffer());
                break;
              }
            }
          }
          if (!buf && (msg as any).images?.[0]?.image_url?.url) {
            const u = (msg as any).images[0].image_url.url;
            buf = u.startsWith("data:") ? Buffer.from(u.includes("base64,") ? u.split("base64,")[1] : u, "base64") : Buffer.from(await (await fetch(u)).arrayBuffer());
          }
          if (!buf) return null;

          if (hd) {
            const s = (await import("sharp")).default;
            const meta = await s(buf).metadata();
            if (meta.width && meta.width < 2048) {
              buf = await s(buf).resize(meta.width * 2, (meta.height || meta.width) * 2, { fit: "inside" }).png().toBuffer();
            }
          }

          const key = `pet-portrait/${user.id}_${Date.now()}_${idx}.png`;
          await uploadToS3(key, buf, "image/png");
          const base = process.env.NEXT_PUBLIC_URL || "https://ai-generate-two.vercel.app";
          return `${base}/api/s3/${key}`;
        }),
      );
      allResults.push(batch.filter(Boolean) as string[]);
    }

    const totalSuccess = allResults.reduce((s, r) => s + r.length, 0);
    if (totalSuccess === 0) return error(50000, "所有生成均失败");

    // Deduct only for successful images
    const actualCost = totalSuccess * (COST_PER + (hd ? HD_COST : 0));
    await prisma.user.update({
      where: { id: user.id },
      data: { credits: { decrement: actualCost } },
    });

    // Save history
    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO pet_portraits (user_id, original_key, style, model, results, created_at) VALUES ($1, $2, $3, $4, $5, NOW())`,
        user.id, fileKeys.join(","), style, model, JSON.stringify(allResults.flat()),
      );
    } catch {}

    return success({
      results: allResults,
      style: STYLE_LABELS[style] || style,
      cost: actualCost,
    });
  } catch (e: any) {
    console.error("[pet-portrait]", e.message?.substring(0, 200));
    return error(50000, "处理失败");
  }
});

export const GET = withAuth(async (req: NextRequest, _ctx: any, user: { id: string }) => {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "12");
  try {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT * FROM pet_portraits WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      user.id, pageSize, (page - 1) * pageSize,
    ) as any[];
    const count = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int as c FROM pet_portraits WHERE user_id = $1`, user.id,
    ) as any[];
    return paginated(rows || [], count?.[0]?.c || 0, page, pageSize);
  } catch (e: any) {
    console.error("[pet-portrait] history error:", e.message?.substring(0, 100));
    return paginated([], 0, page, pageSize);
  }
});
