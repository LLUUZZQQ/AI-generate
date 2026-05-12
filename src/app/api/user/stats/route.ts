import { withAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { success } from "@/lib/response";

export const GET = withAuth(async (_req: any, _ctx: any, user: { id: string }) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [totalTasks, totalImages, monthTasks, monthSpent, todayTasks, completedTasks] = await Promise.all([
    prisma.bgReplaceTask.count({ where: { userId: user.id } }),
    prisma.bgReplaceTask.aggregate({ where: { userId: user.id }, _sum: { imageCount: true } }),
    prisma.bgReplaceTask.count({ where: { userId: user.id, createdAt: { gte: startOfMonth } } }),
    prisma.creditTransaction.aggregate({
      where: { userId: user.id, type: "spend", createdAt: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
    prisma.bgReplaceTask.count({ where: { userId: user.id, createdAt: { gte: startOfToday } } }),
    prisma.bgReplaceTask.count({ where: { userId: user.id, status: "done" } }),
  ]);

  // recent completed results for gallery
  const recentResults = await prisma.bgReplaceResult.findMany({
    where: { task: { userId: user.id }, status: "done", resultKey: { not: null } },
    include: { task: { select: { backgroundMode: true } } },
    orderBy: { createdAt: "desc" },
    take: 12,
  });

  return success({
    totalTasks,
    totalImages: totalImages._sum.imageCount ?? 0,
    monthTasks,
    monthSpent: Math.abs(monthSpent._sum.amount ?? 0),
    todayTasks,
    completedTasks,
    recentResults: recentResults.map((r) => ({
      id: r.id,
      taskId: r.taskId,
      resultKey: r.resultKey,
      originalKey: r.originalKey,
      backgroundMode: r.task.backgroundMode,
      createdAt: r.createdAt,
    })),
  });
});
