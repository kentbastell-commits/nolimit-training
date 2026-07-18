import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  findClientByOpenid,
  bindClientOpenid,
  findClientByPhoneName,
} from "../server/db/repositories/clients.ts";

// Mini program WeChat auth.
//   POST { code }               -> one-tap login for an already-bound account
//   POST { code, phone, name }  -> bind this WeChat to the client that phone+name
//                                  resolves to (same verification as findMyPortal,
//                                  so a leaked client code alone can't bind).
// The openid never leaves the server; the mini program only ever sees the
// client code it already uses as its session.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const appid = process.env.WECHAT_MINI_APPID;
  const secret = process.env.WECHAT_MINI_SECRET;
  if (!appid || !secret) {
    return res.status(503).json({ error: "WeChat auth not configured" });
  }

  const { code, phone, name } = req.body || {};
  if (!code) {
    return res.status(400).json({ error: "code required" });
  }

  try {
    const wxRes = await fetch(
      `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${encodeURIComponent(String(code))}&grant_type=authorization_code`
    );
    const session: any = await wxRes.json();
    if (!session?.openid) {
      return res.status(401).json({
        error: "WeChat login failed",
        message: session?.errmsg || `errcode ${session?.errcode ?? "unknown"}`,
      });
    }
    const openid = String(session.openid);

    if (phone && name) {
      const clientCode = await findClientByPhoneName(String(phone), String(name));
      if (!clientCode) {
        return res.status(404).json({ error: "No portal found for that phone and name" });
      }
      const bound = await bindClientOpenid(clientCode, openid);
      if (!bound.success) {
        return res.status(500).json({ error: "Could not bind WeChat account" });
      }
      return res.status(200).json({ success: true, clientCode, bound: true });
    }

    const clientCode = await findClientByOpenid(openid);
    if (!clientCode) {
      return res.status(404).json({ success: false, error: "Not bound" });
    }
    return res.status(200).json({ success: true, clientCode });
  } catch (error: any) {
    return res.status(500).json({ error: "WeChat auth failed", message: error.message });
  }
}
