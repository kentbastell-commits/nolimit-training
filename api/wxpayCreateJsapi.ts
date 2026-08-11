import type { VercelRequest, VercelResponse } from "@vercel/node";
import { attachWxpayTradeNo } from "../server/db/repositories/productOrders.ts";
import {
  createJsapiTransaction,
  makeOutTradeNo,
  signJsapiInvoke,
  verifyOpenidToken,
  wxpayConfig,
  wxpayEnabled,
} from "../server/wxpay/client.ts";
import { prepareWxpayCharge } from "../server/wxpay/orderGroup.ts";

// In-WeChat-browser payment (web store): the visitor's openid arrives as the
// signed token minted by wxAuthWeb; the transaction is created under the
// service account AppID and the response is the WeixinJSBridge invoke params.
// Amount comes exclusively from the stored orders (#22).
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!wxpayEnabled()) {
    return res.status(503).json({ enabled: false, error: "WeChat Pay is not enabled" });
  }

  const orderId = String(req.body?.orderId || "").trim();
  const openidToken = String(req.body?.openidToken || "").trim();
  if (!orderId || !openidToken) {
    return res.status(400).json({ error: "orderId and openidToken required" });
  }
  const openid = verifyOpenidToken(openidToken);
  if (!openid) {
    return res.status(401).json({ error: "openidToken invalid or expired" });
  }

  try {
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

    const config = wxpayConfig();
    if (!config) return res.status(503).json({ error: "WeChat Pay is not configured" });

    const tradeNo = makeOutTradeNo();
    await attachWxpayTradeNo(
      charge.unpaid.map((order) => order.orderId),
      tradeNo
    );
    const { prepayId } = await createJsapiTransaction({
      outTradeNo: tradeNo,
      description: charge.description,
      totalFen: charge.totalFen,
      openid,
      appId: config.appId, // service account — where the web openid came from
    });
    const invoke = signJsapiInvoke(config, prepayId, config.appId);

    return res.status(200).json({
      success: true,
      tradeNo,
      amountFen: charge.totalFen,
      payment: invoke,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(502).json({ error: "WeChat Pay create failed", message });
  }
}
