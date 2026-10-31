import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  bindClientOpenid,
  findClientByOpenid,
  findClientByPhoneName,
  findClientByPin,
} from "../server/db/repositories/clients.ts";
import {
  completeWxLoginToken,
  consumeWxLoginToken,
  createWxLoginToken,
  getWxLoginToken,
  WX_LOGIN_TOKEN_TTL_MS,
} from "../server/db/pg/wxLoginTokens.ts";
import {
  exchangeOaCodeForOpenid,
  makeOpenidToken,
  verifyOpenidToken,
} from "../server/wxpay/client.ts";
import { allowAthleteLogin, athleteSessionsRequired, issueAthleteSession, sameOriginRequest } from "../server/athleteAuth.ts";

// Website "scan with WeChat to log in" — one handler, four actions:
//   POST {action:"start"}                          -> {token, authorizeUrl}
//        Desktop mints a token and renders a QR of the phone URL.
//   POST {action:"status",t: TOKEN}                -> {status, clientCode?}
//        Desktop consumes a verified handshake once and receives its cookie.
//        Legacy GET status is read-only and never authenticates a browser.
//   POST {action:"scan", t, code}                  -> {status:"ok"|"needs_bind"}
//        Phone (inside WeChat) exchanged the OAuth code; if that WeChat is
//        already bound to a client, the token completes immediately.
//   POST {action:"bind", t, openidToken, pin}      -> {status:"ok"}
//        PIN verification binds a first-time WeChat account. A compatibility
//        phone/name lookup can complete only a legacy, non-session handshake.
// The openid never leaves the server. Client codes only flow to the desktop
// AFTER a WeChat-verified handshake, so polling a guessed token yields
// nothing until a real phone authorizes it.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const oaAppId = process.env.WECHAT_OA_APPID;
  const oaSecret = process.env.WECHAT_OA_SECRET;
  if (!oaAppId || !oaSecret) {
    return res.status(503).json({ error: "WeChat login not configured" });
  }

  const action = String(
    (req.method === "GET" ? req.query.action : req.body?.action) || ""
  ).trim();

  try {
    res.setHeader("Cache-Control", "no-store");
    if (req.method === "POST" && !sameOriginRequest(req)) return res.status(403).json({ error: "Cross-site request refused" });
    if (req.method === "POST" && action === "start") {
      if (!await allowAthleteLogin(req, res, true)) return;
      const token = await createWxLoginToken();
      const base = process.env.WXPAY_NOTIFY_BASE || "https://trainnolimit.cn";
      const landing = `${base}/wx-login.html?t=${encodeURIComponent(token)}&lang=${req.body?.lang === "en" ? "en" : "zh"}`;
      const authorizeUrl =
        "https://open.weixin.qq.com/connect/oauth2/authorize" +
        `?appid=${oaAppId}&redirect_uri=${encodeURIComponent(landing)}` +
        `&response_type=code&scope=snsapi_base&state=wxlogin#wechat_redirect`;
      // The QR encodes the authorize URL directly: scan -> WeChat opens the
      // OAuth page -> redirects to wx-login.html with both t and code.
      return res.status(200).json({
        success: true,
        token,
        qrUrl: authorizeUrl,
        expiresInMs: WX_LOGIN_TOKEN_TTL_MS,
      });
    }

    if (req.method === "GET" && action === "status") {
      const token = String(req.query.t || "").trim();
      if (!token) return res.status(400).json({ error: "t required" });
      const row = await getWxLoginToken(token);
      if (!row || row.expired) return res.status(200).json({ status: "expired" });
      if (row.status === "ok" && row.clientCode) {
        return res.status(200).json({ status: "ok", clientCode: row.clientCode });
      }
      return res.status(200).json({ status: "pending" });
    }

    if (req.method === "POST" && action === "status") {
      const token = String(req.body?.t || "").trim();
      const row = await getWxLoginToken(token);
      if (!row || row.expired || row.status === "consumed") return res.status(200).json({ status: "expired" });
      if (row.status !== "ok") return res.status(200).json({ status: "pending" });
      const consumed = await consumeWxLoginToken(token);
      if (!consumed?.clientCode) return res.status(200).json({ status: "expired" });
      return res.status(200).json({ status: "ok", ...await issueAthleteSession(req, res, consumed.clientCode, consumed.proof === "pin" ? "pin" : "wechat") });
    }

    if (req.method === "POST" && (action === "scan" || action === "bind")) {
      if (!await allowAthleteLogin(req, res, action === "scan")) return;
      const token = String(req.body?.t || "").trim();
      if (!token) return res.status(400).json({ error: "t required" });
      const row = await getWxLoginToken(token);
      if (!row || row.expired || row.status !== "pending") {
        return res.status(410).json({ error: "Login expired — refresh the QR on your computer" });
      }

      // OAuth codes are single-use: `scan` consumes the code and, when the
      // WeChat isn't bound yet, hands back a signed openid token so `bind`
      // (after the athlete types their PIN) doesn't need a second exchange.
      let openid: string | null = null;
      const code = String(req.body?.code || "").trim();
      const openidToken = String(req.body?.openidToken || "").trim();
      if (openidToken) {
        openid = verifyOpenidToken(openidToken);
      } else if (code) {
        openid = await exchangeOaCodeForOpenid(code);
      }
      if (!openid) return res.status(401).json({ error: "WeChat authorization failed" });

      if (action === "scan") {
        const clientCode = await findClientByOpenid(openid);
        if (!clientCode) {
          return res.status(200).json({
            status: "needs_bind",
            openidToken: makeOpenidToken(openid, 10 * 60_000),
          });
        }
        await completeWxLoginToken(token, clientCode);
        return res.status(200).json({ status: "ok" });
      }

      // bind: verify identity exactly like the mini program's first login.
      const { pin, phone, name } = req.body || {};
      if (!pin && athleteSessionsRequired()) return res.status(401).json({ error: "Use your coach-issued login code", code: "VERIFIED_LOGIN_REQUIRED" });
      const clientCode = pin
        ? await findClientByPin(String(pin))
        : phone && name
          ? await findClientByPhoneName(String(phone), String(name))
          : null;
      if (!clientCode) {
        return res.status(404).json({ error: "No portal found for that login" });
      }
      if (!pin) {
        await completeWxLoginToken(token, clientCode, "legacy");
        return res.status(200).json({ status: "ok" });
      }
      const bound = await bindClientOpenid(clientCode, openid);
      if (!bound.success) {
        const message = String(bound.error || "Could not bind WeChat account");
        return res.status(message.includes("already linked") ? 409 : 500).json({ error: message });
      }
      await completeWxLoginToken(token, clientCode, pin ? "pin" : "legacy");
      return res.status(200).json({ status: "ok" });
    }

    return res.status(400).json({ error: "Unknown action" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: "WeChat login failed", message });
  }
}
