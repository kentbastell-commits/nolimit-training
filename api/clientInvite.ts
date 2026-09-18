import type { VercelRequest, VercelResponse } from "@vercel/node";
import { listClients } from "../server/db/repositories/clients.ts";
import { inviteCodeDataUrl, inviteTokenExpiry, makeInviteToken } from "../server/wechat/invite.ts";

// Coach-only (COACH_ONLY_HANDLERS): a personal WeChat invite for one athlete.
//   GET /api/clientInvite?clientCode=CL-0001
//   → { token, image (data URL of the scan code), expiresAt, appPath }
// The athlete (or whoever the coach forwards the image to — a parent to a
// child) long-presses the code in WeChat, taps "Continue with WeChat", and
// that WeChat is bound to this client. See server/wechat/invite.ts.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const code = String(req.query?.clientCode || "").trim();
  if (!code) return res.status(400).json({ error: "clientCode required" });
  if (!process.env.WECHAT_MINI_APPID || !process.env.WECHAT_MINI_SECRET) {
    return res.status(503).json({ error: "WeChat mini program not configured" });
  }
  try {
    const client = (await listClients()).find(
      (c) => c.clientCode.toLowerCase() === code.toLowerCase() || c.id.toLowerCase() === code.toLowerCase()
    );
    if (!client) return res.status(404).json({ error: "Unknown client" });
    const token = makeInviteToken(client.clientCode);
    const image = await inviteCodeDataUrl(token);
    return res.status(200).json({
      success: true,
      clientCode: client.clientCode,
      clientName: client.name,
      token,
      image,
      expiresAt: inviteTokenExpiry(token),
      appPath: `/pages/home/index?invite=${encodeURIComponent(token)}`,
    });
  } catch (error: any) {
    return res.status(502).json({ error: "Could not create the invite", message: error.message });
  }
}
