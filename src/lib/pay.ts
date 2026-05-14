import crypto from "crypto";

// PayJS API — individual developer friendly, supports Alipay + WeChat
// Register at https://payjs.cn, get mchid + key

interface PayOrder {
  out_trade_no: string;
  total_fee: string;  // cents
  body: string;
  code_url: string;   // QR code URL
}

export async function createPayOrder(planCredits: number, planPrice: number): Promise<PayOrder | null> {
  const mchid = process.env.PAYJS_MCHID;
  const key = process.env.PAYJS_KEY;

  if (!mchid || !key) {
    console.error("[pay] PAYJS_MCHID or PAYJS_KEY not set");
    return null;
  }

  const params: Record<string, string> = {
    mchid,
    total_fee: String(planPrice * 100), // to cents
    out_trade_no: `fc${Date.now()}${Math.random().toString(36).slice(2, 8)}`,
    body: `FrameCraft - ${planCredits} 积分`,
    notify_url: `${process.env.NEXT_PUBLIC_URL || "http://localhost:3000"}/api/pay/payjs-webhook`,
  };

  // Build sign: sort keys, concat values with &, append &key=, MD5 uppercase
  const signStr = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join("&") + `&key=${key}`;
  params.sign = crypto.createHash("md5").update(signStr).digest("hex").toUpperCase();

  try {
    const formBody = new URLSearchParams(params).toString();
    const res = await fetch("https://payjs.cn/api/native", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formBody,
      signal: AbortSignal.timeout(15000),
    });

    const data = await res.json() as any;
    if (data.return_code !== 1) {
      console.error("[pay] PayJS error:", data.return_msg, data);
      return null;
    }

    return {
      out_trade_no: data.out_trade_no,
      total_fee: data.total_fee,
      body: params.body,
      code_url: data.code_url,
    };
  } catch (e: any) {
    console.error("[pay] PayJS request failed:", e.message);
    return null;
  }
}

export function verifyPayJSSign(params: Record<string, string>): boolean {
  const key = process.env.PAYJS_KEY;
  if (!key) return false;

  const sign = params.sign;
  const entries = Object.entries(params)
    .filter(([k]) => k !== "sign")
    .sort(([a], [b]) => a.localeCompare(b));

  const signStr = entries.map(([k, v]) => `${k}=${v}`).join("&") + `&key=${key}`;
  const expected = crypto.createHash("md5").update(signStr).digest("hex").toUpperCase();
  return sign === expected;
}
