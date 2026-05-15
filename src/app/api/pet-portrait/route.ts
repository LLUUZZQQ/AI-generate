import { NextRequest } from "next/server";
import { withAuth } from "@/lib/auth-guard";
import { success, error } from "@/lib/response";
import { checkRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";
import { downloadFromS3, uploadToS3 } from "@/lib/s3";
import { z } from "zod";

const PET_PORTRAIT_COST = 3;

const schema = z.object({
  fileKey: z.string().min(1),
  style: z.enum(["oil-painting", "watercolor", "cyberpunk", "royal", "anime", "vangogh"]),
});

const STYLE_PROMPTS: Record<string, string> = {
  "oil-painting": "Transform this pet into a classical oil painting portrait. Rich brushstrokes, dramatic lighting like Rembrandt, dark background, noble bearing. The pet's face and features must remain recognizable and faithful to the original.",
  "watercolor": "Transform this pet into a delicate watercolor painting. Soft color washes, flowing edges, light and airy feel, white background with subtle color blooms. The pet's face and features must remain recognizable and faithful to the original.",
  "cyberpunk": "Transform this pet into a cyberpunk character portrait. Neon lights (purple, cyan, pink), futuristic city background, glowing accessories on the pet, synthwave aesthetic. The pet's face and features must remain recognizable and faithful to the original.",
  "royal": "Transform this pet into a royal palace portrait. Luxurious velvet background, golden frame border feel, regal pose, rich jewel tones, majestic lighting. The pet looks like nobility. The pet's face and features must remain recognizable and faithful to the original.",
  "anime": "Transform this pet into a Studio Ghibli / anime style illustration. Soft cel-shaded look, warm magical atmosphere, expressive eyes, gentle color palette, whimsical background. The pet's face and features must remain recognizable and faithful to the original.",
  "vangogh": "Transform this pet into a Vincent van Gogh style painting. Bold swirling brushstrokes, vibrant yellows and blues, thick impasto texture, starry night background elements. The pet's face and features must remain recognizable and faithful to the original.",
};

const STYLE_LABELS: Record<string, string> = {
  "oil-painting": "古典油画",
  "watercolor": "清新水彩",
  "cyberpunk": "赛博朋克",
  "royal": "皇家肖像",
  "anime": "吉卜力动漫",
  "vangogh": "梵高风格",
};

export const POST = withAuth(async (req: NextRequest, _ctx: any, user: { id: string }) => {
  if (!checkRateLimit(`pet-portrait:${user.id}`, 5, 60000)) {
    return error(42900, "请求太频繁，请稍后重试", 429);
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return error(40001, "参数错误");

  const { fileKey, style } = parsed.data;

  // Check credits
  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser || dbUser.credits < PET_PORTRAIT_COST) {
    return error(40003, "积分不足，请先充值");
  }

  try {
    // Download original photo
    let imageB64: string;
    if (fileKey.startsWith("http")) {
      const res = await fetch(fileKey);
      const buf = Buffer.from(await res.arrayBuffer());
      imageB64 = buf.toString("base64");
    } else {
      const buf = await downloadFromS3(fileKey);
      imageB64 = buf.toString("base64");
    }

    const prompt = STYLE_PROMPTS[style];

    // Call OpenRouter
    const apiKey = process.env.OPENAI_API_KEY!;
    const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_URL || "http://localhost:3000",
        "X-Title": "FrameCraft",
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image-preview",
        messages: [
          { role: "user", content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageB64}` } },
          ]},
        ],
        max_tokens: 4096,
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("[pet-portrait] HTTP", resp.status, errText.substring(0, 200));
      return error(50000, "AI 生成失败，请重试");
    }

    const data = await resp.json() as any;
    const message = data?.choices?.[0]?.message;
    if (!message) return error(50000, "AI 未返回内容");

    let resultBuf: Buffer | null = null;
    const content = message.content;

    if (typeof content === "string") {
      if (content.startsWith("data:image") || content.length > 1000) {
        const b64 = content.includes("base64,") ? content.split("base64,")[1] : content;
        resultBuf = Buffer.from(b64, "base64");
      }
    }

    if (!resultBuf && content) {
      for (const part of content as any[]) {
        if (part.type === "image_url" && part.image_url?.url) {
          const u: string = part.image_url.url;
          if (u.startsWith("data:")) {
            resultBuf = Buffer.from(u.includes("base64,") ? u.split("base64,")[1] : u, "base64");
          } else {
            const r = await fetch(u);
            if (r.ok) resultBuf = Buffer.from(await r.arrayBuffer());
          }
          break;
        }
      }
    }

    if (!resultBuf) {
      const m = message as any;
      if (m.images?.[0]?.image_url?.url) {
        const u = m.images[0].image_url.url;
        if (u.startsWith("data:")) {
          resultBuf = Buffer.from(u.includes("base64,") ? u.split("base64,")[1] : u, "base64");
        } else {
          const r = await fetch(u);
          if (r.ok) resultBuf = Buffer.from(await r.arrayBuffer());
        }
      }
    }

    if (!resultBuf) return error(50000, "AI 未生成图片");

    // Upload result to S3
    const resultKey = `pet-portrait/${user.id}_${Date.now()}.png`;
    await uploadToS3(resultKey, resultBuf, "image/png");

    // Deduct credits
    await prisma.user.update({
      where: { id: user.id },
      data: { credits: { decrement: PET_PORTRAIT_COST } },
    });

    const baseUrl = process.env.NEXT_PUBLIC_URL || "https://ai-generate-two.vercel.app";
    return success({ url: `${baseUrl}/api/s3/${resultKey}`, style: STYLE_LABELS[style] });
  } catch (e: any) {
    console.error("[pet-portrait] error:", e.message?.substring(0, 200));
    return error(50000, "处理失败，请重试");
  }
});
