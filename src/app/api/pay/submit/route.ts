import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { error, success } from "@/lib/response";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return error(40100, "请先登录", 401);

  const payments = await prisma.$queryRawUnsafe(
    `SELECT amount, credits, status, created_at FROM payment_submissions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10`,
    session.user.id
  ) as any[];

  return success({ payments });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return error(40100, "请先登录", 401);

  const { amount, credits, ref } = await req.json();
  if (!amount || !credits) return error(40001, "参数错误");

  // Check if user already has a pending submission
  const existing = await prisma.$queryRawUnsafe(
    `SELECT id FROM payment_submissions WHERE user_id = $1 AND status = 'pending'`,
    session.user.id
  ) as any[];
  if (existing?.length > 0) return error(40005, "你已有一个待审核的支付，请等待处理");

  await prisma.$executeRawUnsafe(
    `INSERT INTO payment_submissions (id, user_id, amount, credits, ref, status) VALUES ($1, $2, $3, $4, $5, 'pending')`,
    `ps_${Date.now()}`, session.user.id, amount, credits, ref || ""
  );

  return success({ message: "支付已提交，请等待审核" });
}
