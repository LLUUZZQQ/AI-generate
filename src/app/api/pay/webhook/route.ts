import Stripe from "stripe";
import { prisma } from "@/lib/db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature")!;
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.metadata?.userId;
    const credits = parseInt(session.metadata?.credits || "0");
    const planAmount = parseInt(session.metadata?.planAmount || "0");

    if (userId && credits > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: { credits: { increment: credits } },
      });

      await prisma.creditTransaction.create({
        data: {
          userId,
          amount: credits,
          type: "purchase",
          description: `Stripe 充值 ¥${planAmount > 0 ? (planAmount === 1500 ? "15" : planAmount === 3000 ? "30" : "60") : "?"} → ${credits} 积分`,
        },
      });
    }
  }

  return Response.json({ received: true });
}
