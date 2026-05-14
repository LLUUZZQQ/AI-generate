import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { verifyXorPaySign } from "@/lib/pay";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const params = Object.fromEntries(new URLSearchParams(body)) as Record<string, string>;

  const secret = process.env.XORPAY_SECRET;
  if (!secret) { console.error("[xorpay] XORPAY_SECRET not set"); return new Response("fail", { status: 500 }); }

  // Verify signature
  if (!verifyXorPaySign(params, secret)) {
    console.error("[xorpay] Invalid signature:", params.sign);
    return new Response("fail", { status: 400 });
  }

  const { aoid, order_id, pay_price, more } = params;

  // more contains credits
  const credits = parseInt(more || "0");
  if (credits <= 0) { console.error("[xorpay] No credits in callback"); return new Response("fail", { status: 400 }); }

  // Check if already processed
  const existing = await prisma.creditTransaction.findFirst({
    where: { type: "purchase", description: { contains: aoid } },
  });
  if (existing) return new Response("success");

  // Find pending transaction
  const pending = await prisma.creditTransaction.findFirst({
    where: { type: "purchase_pending", description: { contains: `${credits} 积分` } },
    orderBy: { createdAt: "desc" },
  });

  if (!pending) { console.error("[xorpay] No pending transaction found"); return new Response("fail", { status: 500 }); }

  const userId = pending.userId;

  await prisma.user.update({
    where: { id: userId },
    data: { credits: { increment: credits } },
  });

  await prisma.creditTransaction.create({
    data: {
      userId,
      amount: credits,
      type: "purchase",
      description: `XorPay 充值 ¥${parseFloat(pay_price || "0").toFixed(0)} → ${credits} 积分 (${aoid})`,
    },
  });

  // Mark pending
  await prisma.creditTransaction.update({
    where: { id: pending.id },
    data: { type: "purchase_completed" },
  });

  console.log(`[xorpay] ✅ ${credits} credits added to user ${userId}`);
  return new Response("success");
}
