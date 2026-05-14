import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { error, success } from "@/lib/response";
import { prisma } from "@/lib/db";
import { createPayOrder } from "@/lib/pay";

const PRICE_MAP: Record<number, { credits: number; price: number }> = {
  100: { credits: 100, price: 10 },
  500: { credits: 500, price: 45 },
  2000: { credits: 2000, price: 160 },
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return error(40100, "请先登录", 401);

  const { planAmount } = await req.json();
  const plan = PRICE_MAP[planAmount];
  if (!plan) return error(40001, "无效充值档位");

  const order = await createPayOrder(plan.credits, plan.price);

  if (!order) {
    // Fallback: provide manual transfer info
    return success({
      fallback: true,
      message: "支付系统配置中，请联系客服充值",
      wechat: "UU_L777777",
      amount: `¥${plan.price} — ${plan.credits} 积分`,
    });
  }

  // Store pending order
  await prisma.creditTransaction.create({
    data: {
      userId: session.user.id,
      amount: 0, // will be updated by webhook
      type: "purchase_pending",
      description: `待支付: ${plan.credits} 积分 ¥${plan.price}`,
    },
  });

  return success({
    qrcode: order.code_url,
    orderNo: order.out_trade_no,
    amount: plan.price,
    credits: plan.credits,
  });
}
