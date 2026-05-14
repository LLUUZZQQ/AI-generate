import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPayJSSign } from "@/lib/pay";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const params = Object.fromEntries(new URLSearchParams(body)) as Record<string, string>;

  // Verify PayJS signature
  if (!verifyPayJSSign(params)) {
    console.error("[payjs-webhook] Invalid signature");
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  const { return_code, out_trade_no, total_fee, transaction_id } = params;

  if (return_code !== "1") {
    console.log("[payjs-webhook] Payment not successful:", return_code);
    return new Response("success"); // Acknowledge to stop retries
  }

  // Parse body format: "FrameCraft - 500 积分"
  const creditsMatch = params.body?.match(/(\d+)\s*积分/);
  const credits = creditsMatch ? parseInt(creditsMatch[1]) : 0;

  if (credits <= 0) {
    console.error("[payjs-webhook] Could not parse credits from body:", params.body);
    return new Response("success");
  }

  // Find the pending transaction to get userId
  const transaction = await prisma.creditTransaction.findFirst({
    where: { type: "purchase_pending", description: { contains: `${credits} 积分` } },
    orderBy: { createdAt: "desc" },
  });

  if (!transaction) {
    console.error("[payjs-webhook] No pending transaction found for", credits, "credits");
    return new Response("success");
  }

  const userId = transaction.userId;

  // Check if already processed (idempotent)
  const existing = await prisma.creditTransaction.findFirst({
    where: { type: "purchase", description: { contains: transaction_id } },
  });
  if (existing) return new Response("success");

  await prisma.user.update({
    where: { id: userId },
    data: { credits: { increment: credits } },
  });

  await prisma.creditTransaction.create({
    data: {
      userId,
      amount: credits,
      type: "purchase",
      description: `支付充值 ¥${(parseInt(total_fee) / 100).toFixed(0)} → ${credits} 积分 (${transaction_id})`,
    },
  });

  // Mark pending transaction as completed
  await prisma.creditTransaction.update({
    where: { id: transaction.id },
    data: { type: "purchase_completed" },
  });

  console.log(`[payjs-webhook] ✅ ${credits} credits added to user ${userId}`);
  return new Response("success");
}
