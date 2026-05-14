import crypto from "crypto";

// XorPay — individual developer friendly, supports WeChat + Alipay
// Register at https://xorpay.com → get aid + app_secret

interface PayOrder {
  aoid: string;
  qr: string;        // weixin://wxpay/... URI — encode as QR image
  order_id: string;
}

function xorSign(fields: string[], secret: string): string {
  return crypto.createHash("md5").update(fields.join("") + secret, "utf8").digest("hex").toLowerCase();
}

export async function createPayOrder(planCredits: number, planPrice: number): Promise<PayOrder | null> {
  const aid = process.env.XORPAY_AID;
  const secret = process.env.XORPAY_SECRET;

  if (!aid || !secret) {
    console.error("[pay] XORPAY_AID or XORPAY_SECRET not set");
    return null;
  }

  const orderId = `fc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const price = planPrice.toFixed(2);
  const name = `FrameCraft - ${planCredits} 积分`;
  const notifyUrl = `${process.env.NEXT_PUBLIC_URL || "http://localhost:3000"}/api/pay/xorpay-webhook`;

  const params: Record<string, string> = {
    name,
    pay_type: "native",
    price,
    order_id: orderId,
    notify_url: notifyUrl,
    more: String(planCredits), // pass credits in callback
  };

  // Sign: name + pay_type + price + order_id + notify_url + secret
  const sign = xorSign([name, "native", price, orderId, notifyUrl], secret);
  params.sign = sign;

  try {
    const body = new URLSearchParams(params).toString();
    const res = await fetch(`https://xorpay.com/api/pay/${aid}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(15000),
    });

    const data = await res.json() as any;
    if (data.status !== "ok") {
      console.error("[pay] XorPay error:", data.status, data);
      return null;
    }

    return {
      aoid: data.aoid,
      qr: data.info.qr,
      order_id: orderId,
    };
  } catch (e: any) {
    console.error("[pay] XorPay request failed:", e.message);
    return null;
  }
}

export function verifyXorPaySign(params: Record<string, string>, secret: string): boolean {
  // Callback sign: aoid + order_id + pay_price + pay_time + secret
  const sign = xorSign(
    [params.aoid || "", params.order_id || "", params.pay_price || "", params.pay_time || ""],
    secret
  );
  return sign === (params.sign || "").toLowerCase();
}
