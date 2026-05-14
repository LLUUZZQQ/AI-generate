import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { success, error } from "@/lib/response";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendPasswordReset } from "@/lib/email";
import crypto from "crypto";

// POST — send reset code/link
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  if (!checkRateLimit(`forgot-pw:${ip}`, 3, 60000)) return error(42900, "请求过于频繁", 429);

  const { email, token, password } = await req.json();

  // Step 1: send reset token
  if (email && !token) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return success({ message: "如果该邮箱已注册，重置链接已发送" }); // Don't reveal existence

    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    // Invalidate old tokens
    await prisma.verificationCode.updateMany({
      where: { email, type: "reset_password", used: false },
      data: { used: true },
    });

    await prisma.verificationCode.create({
      data: { email, code: resetToken, type: "reset_password", expiresAt },
    });

    await sendPasswordReset(email, resetToken);

    return success({
      message: "重置链接已发送",
      devToken: process.env.SMTP_HOST ? undefined : resetToken,
    });
  }

  // Step 2: verify token and reset password
  if (token && password) {
    if (password.length < 6) return error(40001, "密码至少6位");

    const record = await prisma.verificationCode.findFirst({
      where: { code: token, type: "reset_password", used: false },
      orderBy: { createdAt: "desc" },
    });
    if (!record || record.expiresAt < new Date()) return error(40003, "链接已过期或已使用");

    const hashed = await bcrypt.hash(password, 10);
    await prisma.user.update({ where: { email: record.email }, data: { password: hashed } });
    await prisma.verificationCode.update({ where: { id: record.id }, data: { used: true } });

    return success({ message: "密码重置成功" });
  }

  return error(40001, "参数错误");
}
