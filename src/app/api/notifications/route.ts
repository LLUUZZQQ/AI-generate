import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { error, success } from "@/lib/response";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return error(40100, "请先登录", 401);

  const { searchParams } = new URL(req.url);
  const markRead = searchParams.get("markRead");

  if (markRead) {
    await prisma.$executeRawUnsafe(
      `UPDATE notifications SET read = true WHERE user_id = $1 AND read = false`,
      session.user.id
    );
    return success({ message: "ok" });
  }

  const [notifications, unread] = await Promise.all([
    prisma.$queryRawUnsafe(
      `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
      session.user.id
    ) as Promise<any[]>,
    prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int as count FROM notifications WHERE user_id = $1 AND read = false`,
      session.user.id
    ) as Promise<any[]>,
  ]);

  return success({ notifications, unread: unread?.[0]?.count || 0 });
}
