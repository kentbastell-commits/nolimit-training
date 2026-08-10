// On-demand translation for Company Operations content text (Yumei writes
// Chinese, founders write English — each reads in their own language).
// Session-gated like the other companyOps endpoints; non-mutating, so no
// CSRF requirement. Best-effort: failures return translated:null and the UI
// keeps showing the original text.
import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  assertCompanyOpsAuthConfigured,
  getCompanyOpsConfig,
} from "../server/companyOps/config.ts";
import { noStore, requireRequestSession } from "../server/companyOps/auth.ts";
import { publicCompanyOpsError } from "../server/companyOps/repository.ts";
import { translateText } from "../server/db/translate.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  noStore(res);
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const config = getCompanyOpsConfig();
    assertCompanyOpsAuthConfigured(config);
    requireRequestSession(req, config);

    const { text, target } = (req.body || {}) as { text?: unknown; target?: unknown };
    const clean = String(text || "").trim();
    if (!clean) return res.status(400).json({ error: "text is required" });
    if (clean.length > 4000) return res.status(400).json({ error: "text too long" });
    if (target !== "en" && target !== "zh") {
      return res.status(400).json({ error: "target must be 'en' or 'zh'" });
    }

    const translated = await translateText(clean, target);
    return res.status(200).json({ translated: translated || null });
  } catch (error) {
    const safe = publicCompanyOpsError(error);
    return res.status(safe.status).json({ error: safe.message, message: safe.message });
  }
}
