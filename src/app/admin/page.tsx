import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { AdminPanel } from "./admin-panel";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Try id first, fall back to email
  const userId = (session.user as any).id as string | undefined;
  const userEmail = session.user.email as string | undefined;

  let dbUser = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;
  if (!dbUser && userEmail) dbUser = await prisma.user.findUnique({ where: { email: userEmail } });
  if (!dbUser || dbUser.role !== "admin") redirect("/");

  const stats = await getStats();

  return <AdminPanel stats={stats} />;
}

async function getStats() {
  const [totalUsers, totalBGTasks, totalBgResults, recentUsers, bgTasksByDay] = await Promise.all([
    prisma.user.count(),
    prisma.bgReplaceTask.count(),
    prisma.bgReplaceResult.count(),
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 5, select: { id: true, name: true, email: true, credits: true, createdAt: true } }),
    prisma.$queryRawUnsafe(`SELECT TO_CHAR(DATE(created_at), 'YYYY-MM-DD') as day, COUNT(*)::int as count FROM bg_replace_tasks WHERE created_at > NOW() - INTERVAL '7 days' GROUP BY day ORDER BY day`) as Promise<any[]>,
  ]);

  const creditAgg = await prisma.creditTransaction.aggregate({ where: { type: "background_replace" }, _sum: { amount: true } });
  return { totalUsers, totalBGTasks, totalBgResults, totalCreditsConsumed: Math.abs(creditAgg._sum.amount || 0), recentUsers, bgTasksByDay: bgTasksByDay || [] };
}
