import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./db";

const providers: any[] = [];

// GitHub OAuth
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  providers.push(GitHub({ clientId: process.env.GITHUB_CLIENT_ID, clientSecret: process.env.GITHUB_CLIENT_SECRET }));
}

// Email + Password login
providers.push(Credentials({
  name: "credentials",
  credentials: {
    email: { label: "Email", type: "email" },
    password: { label: "Password", type: "password" },
  },
  async authorize(credentials) {
    const email = credentials?.email as string;
    const password = credentials?.password as string;
    if (!email || !password) return null;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return null;

    // If user has a password, verify it
    if (user.password) {
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return null;
    }
    // If no password set (e.g. GitHub-only user), allow any password
    // This handles migration: old users without password can still login

    return { id: user.id, email: user.email, name: user.name, credits: user.credits };
  },
}));

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user, account }) {
      if (account && account.provider !== "credentials") {
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
  pages: { signIn: "/login", newUser: "/trends" },
});
