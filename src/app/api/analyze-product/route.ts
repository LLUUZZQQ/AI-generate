import { NextRequest } from "next/server";
import { withAuth } from "@/lib/auth-guard";
import { success, error } from "@/lib/response";
import { prisma } from "@/lib/db";
import { z } from "zod";

// Product keyword → background category mapping
const CATEGORY_MAP: Record<string, string[]> = {
  shoes: ["indoor-floor", "outdoor"],
  sneakers: ["indoor-floor", "outdoor"],
  boots: ["indoor-floor", "outdoor"],
  footwear: ["indoor-floor", "outdoor"],
  bag: ["indoor-desk", "indoor-floor"],
  handbag: ["indoor-desk"],
  clothing: ["indoor-bed", "indoor-wall"],
  shirt: ["indoor-bed", "indoor-wall"],
  dress: ["indoor-bed", "indoor-wall"],
  jacket: ["indoor-bed", "indoor-wall"],
  watch: ["indoor-desk", "marble"],
  jewelry: ["indoor-desk"],
  phone: ["indoor-desk"],
  electronics: ["indoor-desk"],
  food: ["indoor-desk"],
  furniture: ["indoor-floor", "indoor-wall"],
  toy: ["indoor-floor", "indoor-desk"],
  book: ["indoor-desk"],
  cosmetic: ["indoor-desk"],
  plant: ["outdoor", "indoor-floor"],
};

const schema = z.object({
  fileKey: z.string().min(1),
});

export const POST = withAuth(async (req: NextRequest) => {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return error(40001, "参数错误");

  const { fileKey } = parsed.data;

  try {
    // Call OpenRouter vision model via native https
    const apiKey = process.env.OPENAI_API_KEY!;
    const reqBody = JSON.stringify({
      model: "openai/gpt-4.1-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "What product is in this image? Reply with only 2-3 English keywords, comma-separated. Examples: 'shoes,sneakers,footwear' or 'phone,electronics' or 'bag,handbag' or 'watch,jewelry' or 'shirt,clothing'. Be specific about the product type.",
            },
            {
              type: "image_url",
              image_url: {
                url: fileKey.startsWith("http")
                  ? fileKey
                  : fileKey.includes("/")
                    ? `${process.env.NEXT_PUBLIC_URL || "http://localhost:3000"}/api/s3/${fileKey}`
                    : `${process.env.NEXT_PUBLIC_URL || "http://localhost:3000"}/uploads/${fileKey}`,
              },
            },
          ],
        },
      ],
      max_tokens: 30,
    });

    const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_URL || "http://localhost:3000",
        "X-Title": "FrameCraft",
      },
      body: reqBody,
      signal: AbortSignal.timeout(10000),
    });

    if (!resp.ok) {
      // Fallback: ignore analysis failure, return all backgrounds
      const all = await prisma.backgroundTemplate.findMany({
        where: { isActive: true },
        select: { id: true },
        orderBy: { sortOrder: "asc" },
      });
      return success({ keywords: [], recommendedBgIds: all.map((t) => t.id) });
    }

    const data = await resp.json() as any;
    const text: string = data?.choices?.[0]?.message?.content || "";

    // Parse keywords from AI response
    const keywords = text
      .toLowerCase()
      .split(/[,;\n]+/)
      .map((k: string) => k.trim())
      .filter(Boolean);

    // Find matching background categories
    const matchedCategories = new Set<string>();
    for (const kw of keywords) {
      const cats = CATEGORY_MAP[kw];
      if (cats) cats.forEach((c) => matchedCategories.add(c));
    }

    // If no match, use all
    if (matchedCategories.size === 0) {
      const all = await prisma.backgroundTemplate.findMany({
        where: { isActive: true },
        select: { id: true },
        orderBy: { sortOrder: "asc" },
      });
      return success({ keywords, recommendedBgIds: all.map((t) => t.id) });
    }

    // Return recommended templates first, then the rest
    const [recommended, rest] = await Promise.all([
      prisma.backgroundTemplate.findMany({
        where: { isActive: true, category: { in: [...matchedCategories] } },
        select: { id: true },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.backgroundTemplate.findMany({
        where: { isActive: true, category: { notIn: [...matchedCategories] } },
        select: { id: true },
        orderBy: { sortOrder: "asc" },
      }),
    ]);

    return success({
      keywords,
      recommendedBgIds: [...recommended.map((t) => t.id), ...rest.map((t) => t.id)],
    });
  } catch (e: any) {
    console.error("[analyze-product] failed:", e.message);
    const all = await prisma.backgroundTemplate.findMany({
      where: { isActive: true },
      select: { id: true },
      orderBy: { sortOrder: "asc" },
    });
    return success({ keywords: [], recommendedBgIds: all.map((t) => t.id) });
  }
});
