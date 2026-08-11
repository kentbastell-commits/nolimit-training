import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  exchangeOaCodeForOpenid,
  makeOpenidToken,
  wxpayConfig,
} from "../server/wxpay/client.ts";

// Web (in-WeChat-browser) OAuth completion: the store bounced through the
// service account's snsapi_base authorize URL and got a code; exchange it for
// the visitor's openid and hand back an opaque signed token. The raw openid
// never reaches the browser.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!process.env.WECHAT_OA_APPID || !process.env.WECHAT_OA_SECRET) {
    return res.status(503).json({ error: "WeChat web auth not configured" });
  }
  if (!wxpayConfig()) {
    return res.status(503).json({ error: "WeChat Pay is not configured" });
  }
  const code = String(req.body?.code || "").trim();
  if (!code) return res.status(400).json({ error: "code required" });

  try {
    const openid = await exchangeOaCodeForOpenid(code);
    if (!openid) {
      return res.status(401).json({ error: "WeChat authorization failed" });
    }
    return res.status(200).json({ success: true, openidToken: makeOpenidToken(openid) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(502).json({ error: "WeChat auth failed", message });
  }
}
