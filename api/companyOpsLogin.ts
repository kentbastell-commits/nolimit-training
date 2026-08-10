import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  assertCompanyOpsAuthConfigured,
  getCompanyOpsConfig,
} from "../server/companyOps/config.ts";
import {
  createOAuthState,
  noStore,
  queryText,
  setOAuthStateCookie,
} from "../server/companyOps/auth.ts";
import { FeishuClient } from "../server/companyOps/feishuClient.ts";
import { publicCompanyOpsError } from "../server/companyOps/repository.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  noStore(res);
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const config = getCompanyOpsConfig();
    assertCompanyOpsAuthConfigured(config);
    const { token } = createOAuthState(
      config,
      queryText(req.query.returnTo)
    );
    setOAuthStateCookie(res, token, config);
    const location = new FeishuClient(config).buildAuthorizationUrl(token);
    res.statusCode = 302;
    res.setHeader("Location", location);
    return res.end();
  } catch (error) {
    const safe = publicCompanyOpsError(error);
    return res.status(safe.status).json({ error: safe.message, message: safe.message });
  }
}
