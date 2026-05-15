import { NextRequest } from "next/server";
import { withAuth } from "@/lib/auth-guard";
import { success, error, paginated } from "@/lib/response";
import { checkRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";
import { downloadFromS3, uploadToS3 } from "@/lib/s3";
import { z } from "zod";

const PET_PORTRAIT_COST = 3;
const HD_COST = 5;

const STYLES: Record<string, string> = {
  "oil-painting": "Transform this pet into a classical oil painting portrait. Rich brushstrokes, dramatic Rembrandt lighting, dark noble background. Keep the pet recognizable.",
  "watercolor": "Transform this pet into a delicate watercolor painting. Soft flowing washes, light airy feel, subtle color blooms on white paper. Keep the pet recognizable.",
  "cyberpunk": "Transform this pet into a cyberpunk character. Neon purple/cyan/pink lighting, futuristic city background, synthwave aesthetic. Keep the pet recognizable.",
  "royal": "Transform this pet into a royal palace portrait. Velvet background, golden ornate frame, regal bearing, jewel tones, majestic lighting. Keep the pet recognizable.",
  "anime": "Transform this pet into a Studio Ghibli anime illustration. Soft cel-shaded look, warm magical atmosphere, gentle palette. Keep the pet recognizable.",
  "vangogh": "Transform this pet into a Van Gogh painting. Bold swirling brushstrokes, vibrant yellows and blues, thick impasto texture. Keep the pet recognizable.",
  "pop-art": "Transform this pet into an Andy Warhol pop art portrait. Bold saturated colors, halftone dots, comic book style, vibrant contrast. Keep the pet recognizable.",
  "pencil": "Transform this pet into a detailed pencil sketch. Fine graphite lines, delicate shading, artistic crosshatching, white paper background. Keep the pet recognizable.",
  "stained-glass": "Transform this pet into a stained glass window. Bold black leading lines, jewel-toned colored glass segments, cathedral light shining through. Keep the pet recognizable.",
  "neon": "Transform this pet into a neon sign. Glowing neon tubes against a dark brick wall, electric vibrant colors, retro sign aesthetic. Keep the pet recognizable.",
  "baroque": "Transform this pet into a Baroque era portrait. Dramatic chiaroscuro, rich gold and crimson tones, ornate classical setting. Keep the pet recognizable.",
  "pixel": "Transform this pet into pixel art. 16-bit game sprite style, limited color palette, crisp square pixels, retro gaming aesthetic. Keep the pet recognizable.",
  "ukiyo-e": "Transform this pet into a Japanese ukiyo-e woodblock print. Flat color planes, bold outlines, traditional Japanese aesthetic, subtle washi paper texture. Keep the pet recognizable.",
  "egyptian": "Transform this pet into an ancient Egyptian hieroglyphic wall painting. Flat profile pose, gold and lapis lazuli colors, sandstone texture background. Keep the pet recognizable.",
  "astronaut": "Transform this pet into an astronaut. Realistic spacesuit helmet around the pet's head, stars and nebula in the visor reflection, deep space background. Keep the pet recognizable.",
  "disney": "Transform this pet into a classic Disney animation cel. Vintage hand-drawn animation style, expressive eyes, soft magical colors, 2D animated film look. Keep the pet recognizable.",
};

const STYLE_LABELS: Record<string, string> = {
  "oil-painting": "古典油画", "watercolor": "清新水彩", "cyberpunk": "赛博朋克",
  "royal": "皇家肖像", "anime": "吉卜力动漫", "vangogh": "梵高风格",
  "pop-art": "波普艺术", "pencil": "铅笔素描", "stained-glass": "彩色玻璃",
  "neon": "霓虹灯牌", "baroque": "巴洛克", "pixel": "像素游戏",
  "ukiyo-e": "浮世绘", "egyptian": "埃及法老", "astronaut": "太空宇航员",
  "disney": "迪士尼动画",
};

const MODELS = [
  { id: "google/gemini-3.1-flash-image-preview", label: "Gemini 3.1 Flash", sub: "快速通用" },
  { id: "black-forest-labs/flux.2-pro", label: "Flux 2 Pro", sub: "细节最佳" },
];

const createSchema = z.object({
  fileKey: z.string().min(1),
  style: z.string().min(1),
  numImages: z.number().min(1).max(4).default(1),
  intensity: z.enum(["light", "medium", "strong"]).default("medium"),
  size: z.enum(["1:1", "3:4", "4:3", "9:16"]).default("1:1"),
  model: z.string().default("google/gemini-3.1-flash-image-preview"),
  hd: z.boolean().default(false),
  customStyle: z.string().optional(),
});

export const POST = withAuth(async (req: NextRequest, _ctx: any, user: { id: string }) => {
  if (!checkRateLimit(`pet-portrait:${user.id}`, 5, 60000)) {
    return error(42900, "请求太频繁，请稍后重试", 429);
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return error(40001, "参数错误");

  const { fileKey, style, numImages, intensity, size, model, hd, customStyle } = parsed.data;
  const totalCost = numImages * (PET_PORTRAIT_COST + (hd ? HD_COST : 0));

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser || dbUser.credits < totalCost) {
    return error(40003, `积分不足，需要 ${totalCost} 积分`);
  }

  try {
    // Download original photo
    let imageB64: string;
    if (fileKey.startsWith("http")) {
      const res = await fetch(fileKey);
      imageB64 = Buffer.from(await res.arrayBuffer()).toString("base64");
    } else {
      imageB64 = (await downloadFromS3(fileKey)).toString("base64");
    }

    const basePrompt = customStyle || STYLES[style] || STYLES["oil-painting"];

    const intensityModifiers: Record<string, string> = {
      light: "Apply a subtle, gentle transformation. Keep much of the original photo's character.",
      medium: "",
      strong: "Apply a bold, dramatic transformation. Fully commit to the new style.",
    };

    const fullPrompt = `${basePrompt} ${intensityModifiers[intensity] || ""}`.trim();

    const isFlux = model.includes("flux");
    const apiKey = process.env.OPENAI_API_KEY!;

    // Generate images in parallel
    const results: string[] = [];
    const prompts = Array.from({ length: numImages }, () => fullPrompt);

    const generated = await Promise.all(prompts.map(async (p, idx) => {
      const bodyObj: any = {
        model,
        messages: [{
          role: "user",
          content: [
            { type: "text", text: p },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageB64}` } },
          ],
        }],
      };
      if (isFlux) bodyObj.modalities = ["image"];
      else bodyObj.max_tokens = 4096;

      console.log(`[pet-portrait] calling ${model} #${idx + 1}/${numImages}`);
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

      if (!resp.ok) {
        console.error(`[pet-portrait] HTTP ${resp.status} for #${idx + 1}`);
        return null;
      }

      const data = await resp.json() as any;
      const message = data?.choices?.[0]?.message;
      if (!message) return null;

      let buf: Buffer | null = null;
      const content = message.content;

      if (typeof content === "string") {
        if (content.startsWith("data:image") || content.length > 1000) {
          const b64 = content.includes("base64,") ? content.split("base64,")[1] : content;
          buf = Buffer.from(b64, "base64");
        }
      }

      if (!buf && content) {
        for (const part of content as any[]) {
          if (part.type === "image_url" && part.image_url?.url) {
            const u: string = part.image_url.url;
            if (u.startsWith("data:")) {
              buf = Buffer.from(u.includes("base64,") ? u.split("base64,")[1] : u, "base64");
            } else {
              const r = await fetch(u);
              if (r.ok) buf = Buffer.from(await r.arrayBuffer());
            }
            break;
          }
        }
      }

      if (!buf) {
        const m = message as any;
        if (m.images?.[0]?.image_url?.url) {
          const u = m.images[0].image_url.url;
          if (u.startsWith("data:")) {
            buf = Buffer.from(u.includes("base64,") ? u.split("base64,")[1] : u, "base64");
          } else {
            const r = await fetch(u);
            if (r.ok) buf = Buffer.from(await r.arrayBuffer());
          }
        }
      }

      if (!buf) return null;

      // HD upscale if requested
      if (hd) {
        const s = (await import("sharp")).default;
        const meta = await s(buf).metadata();
        if (meta.width && meta.width < 2048) {
          buf = await s(buf).resize(meta.width * 2, (meta.height || meta.width) * 2, { fit: "inside" }).png().toBuffer();
        }
      }

      const resultKey = `pet-portrait/${user.id}_${Date.now()}_${idx}.png`;
      const s3Url = await uploadToS3(resultKey, buf, "image/png");
      const baseUrl = process.env.NEXT_PUBLIC_URL || "https://ai-generate-two.vercel.app";
      return `${baseUrl}/api/s3/${resultKey}`;
    }));

    const validResults = generated.filter(Boolean) as string[];
    if (validResults.length === 0) return error(50000, "所有生成均失败，请重试");

    // Deduct credits
    await prisma.user.update({
      where: { id: user.id },
      data: { credits: { decrement: totalCost } },
    });

    // Save to history
    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO pet_portraits (user_id, original_key, style, model, results, created_at) VALUES ($1, $2, $3, $4, $5, NOW())`,
        user.id, fileKey, style, model, JSON.stringify(validResults),
      );
    } catch { /* history is non-critical */ }

    return success({ urls: validResults, style: STYLE_LABELS[style] || style, cost: totalCost });
  } catch (e: any) {
    console.error("[pet-portrait] error:", e.message?.substring(0, 200));
    return error(50000, "处理失败，请重试");
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
    const total = count?.[0]?.c || 0;
    return paginated(rows || [], total, page, pageSize);
  } catch {
    return paginated([], 0, page, pageSize);
  }
});
