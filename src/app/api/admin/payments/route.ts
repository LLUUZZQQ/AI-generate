import { NextRequest } from "next/server";
import { withAuth } from "@/lib/auth-guard";
import { success, error } from "@/lib/response";
import { prisma } from "@/lib/db";

export const GET = withAuth(async (_req: NextRequest, _ctx: any, user: { id: string }) => {
  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (dbUser?.role !== "admin") return error(40300, "无权访问", 403);

  const payments = await prisma.$queryRawUnsafe(
    `SELECT ps.*, u.email FROM payment_submissions ps LEFT JOIN users u ON u.id = ps.user_id ORDER BY ps.created_at DESC LIMIT 50`
  ) as any[];

  return success({ payments });
});

export const PATCH = withAuth(async (req: NextRequest, _ctx: any, user: { id: string }) => {
  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (dbUser?.role !== "admin") return error(40300, "无权访问", 403);

  const { id, status, userId, credits, amount } = await req.json();
  if (!id || !status) return error(40001, "参数错误");

  // Update submission status
  await prisma.$executeRawUnsafe(
    `UPDATE payment_submissions SET status = $1 WHERE id = $2`,
    status, id
  );

  // If approved, add credits and record transaction
  if (status === "approved" && userId && credits) {
    await prisma.user.update({ where: { id: userId }, data: { credits: { increment: credits } } });
    await prisma.creditTransaction.create({
      data: {
        userId,
        amount: credits,
        type: "purchase",
        description: `微信扫码充值 ¥${amount} → ${credits} 积分`,
      },
    });
  }

  return success({ message: status === "approved" ? "已通过" : "已拒绝" });
});
