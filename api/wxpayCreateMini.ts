import type { VercelRequest, VercelResponse } from "@vercel/node";
import { attachWxpayTradeNo } from "../server/db/repositories/productOrders.ts";
import {
  createJsapiTransaction,
  makeOutTradeNo,
  signJsapiInvoke,
  wxpayConfig,
  wxpayEnabled,
} from "../server/wxpay/client.ts";
import { prepareWxpayCharge } from "../server/wxpay/orderGroup.ts";

// Mini program payment: wx.login gives the client a fresh code; we exchange
// it for the athlete's openid (mini AppID), create a JSAPI transaction under
// that AppID, and return the signed params wx.requestPayment needs.
// The amount comes exclusively from the stored orders (#22).
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!wxpayEnabled()) {
    return res.status(503).json({ enabled: false, error: "WeChat Pay is not enabled" });
  }
  const miniAppId = process.env.WECHAT_MINI_APPID;
  const miniSecret = process.env.WECHAT_MINI_SECRET;
  if (!miniAppId || !miniSecret) {
    return res.status(503).json({ error: "Mini program auth not configured" });
  }

  const orderId = String(req.body?.orderId || "").trim();
  const code = String(req.body?.code || "").trim();
  if (!orderId || !code) {
    return res.status(400).json({ error: "orderId and code required" });
  }

  try {
    const wxRes = await fetch(
      `https://api.weixin.qq.com/sns/jscode2session?appid=${miniAppId}&secret=${miniSecret}&js_code=${encodeURIComponent(code)}&grant_type=authorization_code`
    );
    const session: any = await wxRes.json();
    if (!session?.openid) {
      return res.status(401).json({
        error: "WeChat login failed",
        message: session?.errmsg || `errcode ${session?.errcode ?? "unknown"}`,
      });
    }

    const charge = await prepareWxpayCharge(orderId);
    if (charge.state === "not_found") {
      return res.status(404).json({ error: "Order not found" });
    }
    if (charge.state === "already_paid") {
      return res.status(200).json({ alreadyPaid: true });
    }
    if (charge.state === "bad_currency") {
      return res.status(400).json({ error: "WeChat Pay supports CNY orders only" });
    }
    if (charge.state === "nothing_to_charge") {
      return res.status(400).json({ error: "Nothing to charge on this order" });
    }

    const tradeNo = makeOutTradeNo();
    await attachWxpayTradeNo(
      charge.unpaid.map((order) => order.orderId),
      tradeNo
    );
    const { prepayId } = await createJsapiTransaction({
      outTradeNo: tradeNo,
      description: charge.description,
      totalFen: charge.totalFen,
      openid: String(session.openid),
      appId: miniAppId,
    });
    const config = wxpayConfig();
    if (!config) return res.status(503).json({ error: "WeChat Pay is not configured" });
    const invoke = signJsapiInvoke(config, prepayId, miniAppId);

    return res.status(200).json({
      success: true,
      tradeNo,
      amountFen: charge.totalFen,
      payment: {
        timeStamp: invoke.timeStamp,
        nonceStr: invoke.nonceStr,
        package: invoke.package,
        signType: invoke.signType,
        paySign: invoke.paySign,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(502).json({ error: "WeChat Pay create failed", message });
  }
}
