import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  findClientByOpenid,
  bindClientOpenid,
  createClient,
  findClientByPhone,
  findClientByPhoneName,
  findClientByPin,
} from "../server/db/repositories/clients.ts";
import { makeVerifiedPhoneToken, resolveMiniPhoneNumber, verifyPhoneToken } from "../server/wechat/miniPhone.ts";
import { verifyInviteToken } from "../server/wechat/invite.ts";

// Mini program WeChat auth.
//   POST { code }               -> one-tap login for an already-bound account
//   POST { code, phone, name }  -> bind this WeChat to the client that phone+name
//                                  resolves to (same verification as findMyPortal,
//                                  so a leaked client code alone can't bind).
//   POST { code, pin }          -> bind via the simple login code (same
//                                  verification findMyPortal's pin path uses).
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

  const { code, phone, name, pin, phoneCode, phoneToken, invite } = req.body || {};
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

    // Self-serve sign-up / login with WeChat's OWN verified phone number
    // (`<button open-type="getPhoneNumber">` → one-time phoneCode). Ownership
    // of the number is proven by WeChat, so: an existing account with that
    // phone (e.g. created by a payment link) is bound and logged in; no
    // account → one is created from the typed name. A stranger from social
    // media therefore never needs a coach-issued code (Kent, 2026-09-17).
    if (phoneCode || phoneToken) {
      let verifiedPhone = "";
      if (phoneToken) {
        // Second round trip of a sign-up: the phone was verified moments ago
        // and travels as a signed token (the getPhoneNumber code is single-use).
        verifiedPhone = verifyPhoneToken(String(phoneToken)) || "";
        if (!verifiedPhone) {
          return res.status(401).json({ error: "Phone verification expired - tap Continue with WeChat again" });
        }
      } else {
        try {
          verifiedPhone = await resolveMiniPhoneNumber(String(phoneCode));
        } catch (error: any) {
          return res.status(502).json({ error: "Could not read your WeChat phone number", message: error.message });
        }
      }
      const typedName = String(name || "").trim().replace(/\s+/g, " ").slice(0, 60);
      let clientCode = await findClientByPhone(verifiedPhone, typedName);
      let created = false;
      if (!clientCode) {
        if (typedName.length < 2) {
          return res.status(404).json({
            success: false,
            needsName: true,
            phoneToken: makeVerifiedPhoneToken(verifiedPhone),
            error: "No account for this phone yet",
          });
        }
        const made = await createClient({
          name: typedName,
          phone: verifiedPhone,
          source: "Mini program",
          paymentStatus: "Pending",
          intakeStatus: "Not Sent",
          subscriptionStatus: "Active",
        });
        clientCode = String((made as { recordId?: string }).recordId || (made as { clientId?: string }).clientId || "");
        if (!made.success || !clientCode) {
          return res.status(500).json({ error: "Could not create the account" });
        }
        created = true;
      }
      const bound = await bindClientOpenid(clientCode, openid);
      if (!bound.success) {
        const errorMessage = String(bound.error || "Could not bind WeChat account");
        return res.status(errorMessage.includes("already linked") ? 409 : 500).json({ error: errorMessage });
      }
      return res.status(200).json({ success: true, clientCode, bound: true, created });
    }

    // Coach-issued personal invite (scan code / ?invite= link): the token
    // names the client, so whoever scans it is bound — no phone, no name. A
    // parent can forward the code to a child's phone. bindClientOpenid still
    // refuses a client already bound to another WeChat (409 below).
    if (invite) {
      const clientCode = verifyInviteToken(String(invite));
      if (!clientCode) {
        return res.status(410).json({ error: "Invite expired or invalid — ask your coach for a new one" });
      }
      const bound = await bindClientOpenid(clientCode, openid);
      if (!bound.success) {
        const errorMessage = String(bound.error || "Could not bind WeChat account");
        return res.status(errorMessage.includes("already linked") ? 409 : 500).json({ error: errorMessage });
      }
      return res.status(200).json({ success: true, clientCode, bound: true, invited: true });
    }

    if (pin || (phone && name)) {
      const clientCode = pin
        ? await findClientByPin(String(pin))
        : await findClientByPhoneName(String(phone), String(name));
      if (!clientCode) {
        return res.status(404).json({ error: "No portal found for that login" });
      }
      const bound = await bindClientOpenid(clientCode, openid);
      if (!bound.success) {
        const errorMessage = String(bound.error || "Could not bind WeChat account");
        const alreadyLinked = errorMessage.includes("already linked");
        return res
          .status(alreadyLinked ? 409 : 500)
          .json({ error: errorMessage });
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
