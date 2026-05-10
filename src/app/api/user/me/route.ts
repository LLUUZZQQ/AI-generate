import { withAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { success } from "@/lib/response";

export const GET = withAuth(async (_req: any, _ctx: any, user: { id: string }) => {
  const u = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, email: true, name: true, avatar: true, credits: true, createdAt: true },
  });

  const stats = await prisma.content.groupBy({
    by: ["type", "status"],
    where: { userId: user.id },
    _count: true,
  });

  return success({ user: u, stats });
});
