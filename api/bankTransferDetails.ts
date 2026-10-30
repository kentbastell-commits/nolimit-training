import type { VercelRequest, VercelResponse } from "@vercel/node";
import { isVerifiedCoach } from "./_coachAuth.ts";

// Customer-facing payment fields supplied by Kent on 2026-10-19. Keep this
// server-side: the coach chooses when to share them with a customer.
export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "private, no-store");
  if (!isVerifiedCoach(req as never)) return res.status(401).json({ error: "Coach access required" });
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  return res.status(200).json({
    accountName: "广州跃燃体育信息咨询有限公司",
    accountNumber: "3602011009200555212",
    bankName: "中国工商银行股份有限公司广州建设六马路支行",
  });
}
