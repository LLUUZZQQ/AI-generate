import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { success, error } from "@/lib/response";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  if (!checkRateLimit(`login:${ip}`, 10, 60000)) {
    return error(42900, "请求过于频繁，请稍后重试", 429);
  }

  const { email, password } = await req.json();
  if (!email || !password) return error(40001, "请填写邮箱和密码");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.password) return error(40100, "邮箱或密码错误");
  if (user.banned) return error(40301, "账号已被封禁");

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return error(40100, "邮箱或密码错误");

  return success({ id: user.id, email: user.email, name: user.name });
}
