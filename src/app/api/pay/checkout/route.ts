import Stripe from "stripe";
import { auth } from "@/lib/auth";
import { error, success } from "@/lib/response";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const PRICE_MAP: Record<number, { amount: number; credits: number; name: string }> = {
  100: { amount: 1000, credits: 100, name: "入门包 - 100 积分" },
  500: { amount: 4500, credits: 500, name: "进阶包 - 500 积分" },
  2000: { amount: 16000, credits: 2000, name: "专业包 - 2000 积分" },
};

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return error(40100, "请先登录", 401);

  const { planAmount } = await req.json();
  const plan = PRICE_MAP[planAmount];
  if (!plan) return error(40001, "无效充值档位");

  const checkout = await stripe.checkout.sessions.create({
    mode: "payment",
    success_url: `${process.env.NEXT_PUBLIC_URL}/settings?paid=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_URL}/settings`,
    client_reference_id: session.user.id,
    metadata: {
      userId: session.user.id,
      credits: plan.credits.toString(),
      planAmount: planAmount.toString(),
    },
    line_items: [
      {
        price_data: {
          currency: "cny",
          product_data: { name: `FrameCraft - ${plan.name}` },
          unit_amount: plan.amount,
        },
        quantity: 1,
      },
    ],
  });

  return success({ url: checkout.url! });
}
