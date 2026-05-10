import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { success, error } from "@/lib/response";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(2).max(20),
  email: z.string().email(),
  password: z.string().min(6).max(50),
  captcha: z.string().length(4),
});

// Simple in-memory captcha store (clears on server restart)
const captchaStore = new Map<string, { code: string; expires: number }>();

// Clean expired captchas
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of captchaStore) { if (now > v.expires) captchaStore.delete(k); }
}, 60_000);

export async function GET() {
  const code = Math.floor(1000 + Math.random() * 9000).toString();
  const id = Math.random().toString(36).slice(2, 10);
  captchaStore.set(id, { code, expires: Date.now() + 5 * 60 * 1000 });
  return success({ captchaId: id, captcha: code });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) return error(40001, "请填写完整信息");

  const { name, email, password, captcha } = parsed.data;
  const captchaId = req.headers.get("x-captcha-id") || "";

  const stored = captchaStore.get(captchaId);
  if (!stored || stored.expires < Date.now()) return error(40002, "验证码已过期");
  if (stored.code !== captcha) return error(40003, "验证码错误");
  captchaStore.delete(captchaId);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return error(40004, "该邮箱已注册");

  const hashed = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { name, email, password: hashed, credits: 20 },
  });

  return success({ message: "注册成功" });
}
