import Stripe from "stripe";
import { auth } from "@/lib/auth";
import { error, success } from "@/lib/response";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const PRICE_MAP: Record<number, { amount: number; credits: number; name: string }> = {
  50: { amount: 1500, credits: 50, name: "基础包" },
  120: { amount: 3000, credits: 120, name: "进阶包" },
  300: { amount: 6000, credits: 300, name: "专业包" },
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
          product_data: { name: `AI爆款 - ${plan.name}` },
          unit_amount: plan.amount,
        },
        quantity: 1,
      },
    ],
  });

  return success({ url: checkout.url! });
}
