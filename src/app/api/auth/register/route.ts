import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { success, error } from "@/lib/response";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendVerificationCode } from "@/lib/email";
import { z } from "zod";

const ipCooldown = new Map<string, number>();

const disposableDomains = new Set([
  "mailinator.com", "guerrillamail.com", "10minutemail.com", "tempmail.com",
  "yopmail.com", "trashmail.com", "temp-mail.org", "fakeinbox.com",
]);

const sendSchema = z.object({
  email: z.string().email().refine((e) => {
    const domain = e.split("@")[1]?.toLowerCase();
    if (!domain) return false;
    if (disposableDomains.has(domain)) return false;
    const local = e.split("@")[0];
    if (local.length < 2) return false;
    if (/^[a-z0-9]$/i.test(local)) return false;
    return true;
  }, "请使用真实邮箱"),
});

const registerSchema = z.object({
  name: z.string().min(2).max(20),
  email: z.string().email(),
  password: z.string().min(6).max(50),
  code: z.string().length(6),
});

// POST /api/auth/register — Step 1: send code
export async function POST(req: NextRequest) {
  const body = await req.json();

  // Step 1: send verification code
  if (body.email && !body.code) {
    const parsed = sendSchema.safeParse(body);
    if (!parsed.success) return error(40001, parsed.error.issues[0]?.message || "邮箱格式错误");

    const ip = req.headers.get("x-forwarded-for") || "unknown";
    if (!checkRateLimit(`send-code:${ip}`, 3, 60000)) return error(42900, "请求过于频繁", 429);

    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (existing) return error(40004, "该邮箱已注册");

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Invalidate old codes for this email
    await prisma.verificationCode.updateMany({
      where: { email: parsed.data.email, type: "register", used: false },
      data: { used: true },
    });

    await prisma.verificationCode.create({
      data: { email: parsed.data.email, code, type: "register", expiresAt },
    });

    const sent = await sendVerificationCode(parsed.data.email, code);

    // If SMTP not configured, return code in dev mode (console.log also prints it)
    return success({
      message: sent ? "验证码已发送" : "验证码发送失败",
      devCode: process.env.SMTP_HOST ? undefined : code,
    });
  }

  // Step 2: verify code and register
  if (body.code) {
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) return error(40001, "请填写完整信息");

    const ip = req.headers.get("x-forwarded-for") || "unknown";
    if (!checkRateLimit(`register:${ip}`, 5, 60000)) return error(42900, "请求过于频繁", 429);

    const lastReg = ipCooldown.get(ip);
    if (lastReg && Date.now() - lastReg < 24 * 60 * 60 * 1000) return error(42901, "该网络今日注册已达上限", 429);

    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (existing) return error(40004, "该邮箱已注册");

    // Verify code
    const record = await prisma.verificationCode.findFirst({
      where: { email: parsed.data.email, code: parsed.data.code, type: "register", used: false },
      orderBy: { createdAt: "desc" },
    });
    if (!record || record.expiresAt < new Date()) return error(40003, "验证码错误或已过期");

    await prisma.verificationCode.update({ where: { id: record.id }, data: { used: true } });

    const hashed = await bcrypt.hash(parsed.data.password, 10);
    await prisma.user.create({ data: { name: parsed.data.name, email: parsed.data.email, password: hashed, credits: 0 } });

    ipCooldown.set(ip, Date.now());
    if (ipCooldown.size > 1000) {
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      for (const [k, v] of ipCooldown) { if (v < cutoff) ipCooldown.delete(k); }
    }

    return success({ id: "ok", message: "注册成功" });
  }

  return error(40001, "参数错误");
}
