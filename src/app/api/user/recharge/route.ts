import { NextRequest } from "next/server";
import { withAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { success, error } from "@/lib/response";
import { rechargeSchema } from "@/lib/validators";

const amountMap: Record<number, { credits: number; yuan: number }> = {
  50: { credits: 50, yuan: 15 },
  120: { credits: 120, yuan: 30 },
  300: { credits: 300, yuan: 60 },
};

export const POST = withAuth(async (req: NextRequest, _ctx: any, user: { id: string }) => {
  const body = await req.json();
  const parsed = rechargeSchema.safeParse(body);
  if (!parsed.success) return error(40001, "无效的充值档位");

  const { amount } = parsed.data;
  const plan = amountMap[amount];

  // Add credits and create transaction record
  await prisma.user.update({
    where: { id: user.id },
    data: { credits: { increment: plan.credits } },
  });

  await prisma.creditTransaction.create({
    data: {
      userId: user.id,
      amount: plan.credits,
      type: "recharge",
      description: `充值 ${plan.credits} 积分 (¥${plan.yuan})`,
    },
  });

  return success({ creditsAdded: plan.credits, totalCredits: undefined });
});
