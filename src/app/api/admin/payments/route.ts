import { NextRequest } from "next/server";
import { withAuth } from "@/lib/auth-guard";
import { success, error } from "@/lib/response";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notify";

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
    // 10% first recharge bonus
    const purchaseCount = await prisma.creditTransaction.count({ where: { userId, type: "purchase" } });
    let bonus = 0;
    if (purchaseCount === 0 && credits >= 100) {
      bonus = Math.floor(credits * 0.1);
    }

    await prisma.user.update({ where: { id: userId }, data: { credits: { increment: credits + bonus } } });
    await prisma.creditTransaction.create({
      data: {
        userId,
        amount: credits,
        type: "purchase",
        description: `微信扫码充值 ¥${amount} → ${credits} 积分${bonus > 0 ? `（首充赠送 ${bonus} 积分）` : ""}`,
      },
    });

    await createNotification({
      userId,
      type: "success",
      message: `充值已到账！${credits} 积分${bonus > 0 ? `（含首充赠送 ${bonus} 积分）` : ""}已加入你的账户`,
      link: "/settings",
    });
  } else if (status === "denied") {
    await createNotification({
      userId,
      type: "warning",
      message: "充值审核未通过，请联系客服",
      link: "/settings?tab=billing",
    });
  }

  return success({ message: status === "approved" ? "已通过" : "已拒绝" });
});
