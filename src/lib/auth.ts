import NextAuth from "next-auth";
import EmailProvider from "next-auth/providers/email";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    EmailProvider({
      server: process.env.AUTH_EMAIL_SERVER,
      from: process.env.AUTH_EMAIL_FROM,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      return { ...session, user: { ...session.user, id: user.id, credits: (user as any).credits } };
    },
  },
  pages: {
    signIn: "/login",
    newUser: "/trends",
  },
});
