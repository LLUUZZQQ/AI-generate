import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Email from "next-auth/providers/email";
import Credentials from "next-auth/providers/credentials";
import { Resend } from "resend";
import { prisma } from "./db";

const providers: any[] = [];

// GitHub OAuth
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  providers.push(GitHub({ clientId: process.env.GITHUB_CLIENT_ID, clientSecret: process.env.GITHUB_CLIENT_SECRET }));
}

// Magic Link via Resend
if (process.env.RESEND_API_KEY) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  providers.push(Email({
    server: {},
    from: process.env.AUTH_EMAIL_FROM || "AI爆款 <noreply@ai-generate.vercel.app>",
    async sendVerificationRequest({ identifier: email, url }) {
      await resend.emails.send({
        from: process.env.AUTH_EMAIL_FROM || "AI爆款 <noreply@ai-generate.vercel.app>",
        to: email,
        subject: "登录 AI爆款",
        html: `<div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:24px">
          <h2 style="color:#a855f7">AI爆款</h2>
          <p>点击下方按钮登录：</p>
          <a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#a855f7,#ec4899);color:white;padding:12px 32px;border-radius:24px;text-decoration:none;font-weight:600">登录 AI爆款</a>
          <p style="color:#888;font-size:12px;margin-top:24px">如果你没有请求此邮件，请忽略。</p>
        </div>`,
      });
    },
  }));
}

// Dev fallback: only if nothing else is configured
if (providers.length === 0) {
  providers.push(Credentials({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const email = credentials?.email as string;
      if (!email) return null;
      let user = await prisma.user.findUnique({ where: { email } });
      if (!user) user = await prisma.user.create({ data: { email, credits: 20 } });
      return { id: user.id, email: user.email, credits: user.credits };
    },
  }));
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user, account }) {
      if (account) {
        const email = user.email!;
        const existing = await prisma.user.findUnique({ where: { email } });
        if (!existing) {
          await prisma.user.create({ data: { email, name: user.name, avatar: user.image, credits: 20 } });
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        const dbUser = await prisma.user.findUnique({ where: { email: user.email! } });
        if (dbUser) { token.id = dbUser.id; token.credits = dbUser.credits; }
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.id) {
        (session.user as any).id = token.id as string;
        (session.user as any).credits = token.credits as number;
      }
      return session;
    },
  },
  pages: { signIn: "/login", newUser: "/trends", verifyRequest: "/login?sent=1" },
});
