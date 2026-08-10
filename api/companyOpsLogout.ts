import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  assertCompanyOpsAuthConfigured,
  getCompanyOpsConfig,
} from "../server/companyOps/config.ts";
import {
  clearSessionCookie,
  getRequestSession,
  noStore,
  requireMutationCsrf,
} from "../server/companyOps/auth.ts";
import { publicCompanyOpsError } from "../server/companyOps/repository.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  noStore(res);
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const config = getCompanyOpsConfig();
    assertCompanyOpsAuthConfigured(config);
    const session = getRequestSession(req, config);
    if (session) requireMutationCsrf(req, session, config);
    clearSessionCookie(res, config);
    return res.status(200).json({ success: true });
  } catch (error) {
    const safe = publicCompanyOpsError(error);
    return res.status(safe.status).json({ error: safe.message, message: safe.message });
  }
}
