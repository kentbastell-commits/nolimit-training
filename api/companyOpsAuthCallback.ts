import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  assertCompanyOpsAuthConfigured,
  getCompanyOpsConfig,
} from "../server/companyOps/config.ts";
import {
  clearOAuthStateCookie,
  createSession,
  getCookie,
  noStore,
  queryText,
  setSessionCookie,
  verifyOAuthState,
} from "../server/companyOps/auth.ts";
import { FeishuClient } from "../server/companyOps/feishuClient.ts";
import {
  createCompanyOpsRepository,
  publicCompanyOpsError,
} from "../server/companyOps/repository.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  noStore(res);
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const config = getCompanyOpsConfig();
  try {
    assertCompanyOpsAuthConfigured(config);
    const stateToken = queryText(req.query.state);
    const state = verifyOAuthState(
      stateToken,
      getCookie(req, config.stateCookieName),
      config
    );
    clearOAuthStateCookie(res, config);
    if (queryText(req.query.error)) {
      throw new Error("Feishu sign-in was cancelled");
    }
    const code = queryText(req.query.code);
    if (!code || code.length > 2_048) {
      return res.status(400).json({ error: "Feishu did not return a valid sign-in code" });
    }
    const client = new FeishuClient(config);
    const userToken = await client.exchangeAuthorizationCode(code);
    const user = await client.getOAuthUser(userToken);
    if (config.allowedTenantKey && user.tenantKey !== config.allowedTenantKey) {
      return res.status(403).json({ error: "This Feishu organization is not allowed" });
    }
    const principal = await createCompanyOpsRepository(
      config,
      client
    ).resolvePrincipal(user);
    const { token } = createSession(config, {
      openId: user.openId,
      userId: user.userId,
      name: principal.name,
      avatarUrl: user.avatarUrl,
      tenantKey: user.tenantKey,
      role: principal.role,
    });
    setSessionCookie(res, token, config);
    res.statusCode = 302;
    res.setHeader("Location", state.returnTo);
    return res.end();
  } catch (error) {
    clearOAuthStateCookie(res, config);
    const safe = publicCompanyOpsError(error);
    return res.status(safe.status).json({ error: safe.message, message: safe.message });
  }
}
