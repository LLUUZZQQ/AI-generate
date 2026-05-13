import { NextRequest } from "next/server";
import { withAuth } from "@/lib/auth-guard";
import { success, error } from "@/lib/response";
import { prisma } from "@/lib/db";

export const GET = withAuth(async (_req: NextRequest, _ctx: any, user: { id: string }) => {
  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (dbUser?.role !== "admin") return error(40300, "无权访问", 403);

  const [totalUsers, totalBGTasks, totalBgResults, totalCreditsConsumed, recentUsers] = await Promise.all([
    prisma.user.count(),
    prisma.bgReplaceTask.count(),
    prisma.bgReplaceResult.count(),
    prisma.creditTransaction.aggregate({
      where: { type: "background_replace" },
      _sum: { amount: true },
    }),
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 5, select: { id: true, name: true, email: true, credits: true, createdAt: true } }),
  ]);

  const bgTasksByDay = await prisma.$queryRawUnsafe(
    `SELECT DATE(created_at) as day, COUNT(*)::int as count FROM bg_replace_tasks WHERE created_at > NOW() - INTERVAL '7 days' GROUP BY day ORDER BY day`
  ) as any[];

  return success({
    totalUsers,
    totalBGTasks,
    totalBgResults,
    totalCreditsConsumed: Math.abs(totalCreditsConsumed._sum.amount || 0),
    recentUsers,
    bgTasksByDay,
  });
});
