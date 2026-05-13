import { NextRequest } from "next/server";
import { withAuth } from "@/lib/auth-guard";
import { success, error } from "@/lib/response";
import { prisma } from "@/lib/db";

export const GET = withAuth(async (req: NextRequest, _ctx: any, user: { id: string }) => {
  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (dbUser?.role !== "admin") return error(40300, "无权访问", 403);

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const dateFilter = from && to
    ? `WHERE created_at BETWEEN '${from}' AND '${to} 23:59:59'`
    : `WHERE created_at > NOW() - INTERVAL '30 days'`;

  const [totalUsers, totalBGTasks, totalBgResults, totalCreditsConsumed, recentUsers, bgTasksByDay] = await Promise.all([
    prisma.user.count(),
    prisma.bgReplaceTask.count(from && to ? { where: { createdAt: { gte: new Date(from), lte: new Date(to + "T23:59:59") } } } : undefined),
    prisma.bgReplaceResult.count(),
    prisma.creditTransaction.aggregate({ where: { type: "background_replace" }, _sum: { amount: true } }),
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 5, select: { id: true, name: true, email: true, credits: true, createdAt: true } }),
    prisma.$queryRawUnsafe(`SELECT TO_CHAR(DATE(created_at), 'YYYY-MM-DD') as day, COUNT(*)::int as count FROM bg_replace_tasks ${dateFilter} GROUP BY day ORDER BY day`) as Promise<any[]>,
  ]);

  return success({
    totalUsers,
    totalBGTasks,
    totalBgResults,
    totalCreditsConsumed: Math.abs(totalCreditsConsumed._sum.amount || 0),
    recentUsers,
    bgTasksByDay: bgTasksByDay || [],
  });
});
