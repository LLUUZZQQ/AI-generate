import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./db";

const providers: any[] = [
  Credentials({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const email = credentials?.email as string;
      if (!email) return null;
      let user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        user = await prisma.user.create({ data: { email, credits: 20 } });
      }
      return { id: user.id, email: user.email, name: user.name, credits: user.credits };
    },
  }),
];

// Only enable GitHub if both keys are set
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  providers.unshift(
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        const dbUser = await prisma.user.findUnique({ where: { email: user.email! } });
        token.credits = dbUser?.credits ?? (user as any).credits ?? 20;
      }
      return token;
    },
    async session({ session, token }) {
      return {
        ...session,
        user: { ...session.user, id: token.id as string, credits: token.credits as number },
      };
    },
  },
  session: { strategy: "jwt" },
  pages: { signIn: "/login", newUser: "/trends" },
});
