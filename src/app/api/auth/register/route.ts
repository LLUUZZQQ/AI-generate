import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { success, error } from "@/lib/response";
import { checkRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

// IP registration cooldown: 1 registration per IP per 24 hours
const ipCooldown = new Map<string, number>();

const registerSchema = z.object({
  name: z.string().min(2).max(20),
  email: z.string().email(),
  password: z.string().min(6).max(50),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";

  // Rate limit: 5 requests per minute
  if (!checkRateLimit(`register:${ip}`, 5, 60000)) {
    return error(42900, "请求过于频繁，请稍后重试", 429);
  }

  // IP cooldown: 1 registration per 24 hours
  const lastReg = ipCooldown.get(ip);
  if (lastReg && Date.now() - lastReg < 24 * 60 * 60 * 1000) {
    return error(42901, "该网络今日注册次数已达上限，请明天再试", 429);
  }

  const body = await req.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) return error(40001, "请填写完整信息");

  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return error(40004, "该邮箱已注册");

  const hashed = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { name, email, password: hashed, credits: 20 },
  });

  ipCooldown.set(ip, Date.now());

  // Clean old cooldown entries periodically
  if (ipCooldown.size > 1000) {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    for (const [k, v] of ipCooldown) { if (v < cutoff) ipCooldown.delete(k); }
  }

  return success({ message: "注册成功" });
}
