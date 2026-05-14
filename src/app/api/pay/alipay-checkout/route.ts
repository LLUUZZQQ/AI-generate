import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { error, success } from "@/lib/response";
import { prisma } from "@/lib/db";
import { createPayOrder } from "@/lib/pay";

const PRICE_MAP: Record<number, { credits: number; price: number }> = {
  100: { credits: 100, price: 12 },
  500: { credits: 500, price: 45 },
  2000: { credits: 2000, price: 168 },
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return error(40100, "请先登录", 401);

  const { planAmount } = await req.json();
  const plan = PRICE_MAP[planAmount];
  if (!plan) return error(40001, "无效充值档位");

  // Try payment gateway first, fall back to manual WeChat QR
  const order = await createPayOrder(plan.credits, plan.price);

  if (order) {
    return success({
      qrcode: order.qr,
      orderNo: order.aoid,
      amount: plan.price,
      credits: plan.credits,
    });
  }

  // No gateway configured — show WeChat QR + manual confirm
  return success({
    manual: true,
    qrimg: "/wxpay-qr.jpg",
    amount: plan.price,
    credits: plan.credits,
    wechat: "UU_L777777",
    note: `请转账 ¥${plan.price} 并备注：${session.user.id?.slice(-6) || "用户名"}`,
  });
}
