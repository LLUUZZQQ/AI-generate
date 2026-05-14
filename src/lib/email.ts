import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    // Log mode — store codes in DB, show in API response (dev only)
    console.warn("[email] SMTP not configured — codes will be logged instead");
    return null;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || "587"),
    secure: SMTP_PORT === "465",
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

export async function sendVerificationCode(email: string, code: string): Promise<boolean> {
  const transport = getTransporter();

  if (!transport) {
    console.log(`[email] VERIFICATION CODE for ${email}: ${code}`);
    return true; // Dev mode — code is logged, caller handles display
  }

  try {
    await transport.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: "FrameCraft - 邮箱验证码",
      html: `<div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:20px">
        <h2 style="color:#b57bee">FrameCraft</h2>
        <p>你的验证码是：</p>
        <p style="font-size:32px;font-weight:bold;letter-spacing:4px;color:#b57bee">${code}</p>
        <p style="color:#888;font-size:12px">5 分钟内有效，请勿分享给他人。</p>
      </div>`,
    });
    console.log(`[email] Verification code sent to ${email}`);
    return true;
  } catch (e: any) {
    console.error("[email] Send failed:", e.message);
    return false;
  }
}

export async function sendPasswordReset(email: string, token: string): Promise<boolean> {
  const transport = getTransporter();
  const resetUrl = `${process.env.NEXT_PUBLIC_URL || "http://localhost:3000"}/reset-password?token=${token}`;

  if (!transport) {
    console.log(`[email] PASSWORD RESET for ${email}: ${resetUrl}`);
    return true;
  }

  try {
    await transport.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: "FrameCraft - 重置密码",
      html: `<div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:20px">
        <h2 style="color:#b57bee">FrameCraft</h2>
        <p>点击下方按钮重置密码：</p>
        <a href="${resetUrl}" style="display:inline-block;background:#b57bee;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;margin:12px 0">重置密码</a>
        <p style="color:#888;font-size:12px">链接 30 分钟内有效。如非本人操作请忽略。</p>
      </div>`,
    });
    return true;
  } catch (e: any) {
    console.error("[email] Send failed:", e.message);
    return false;
  }
}
