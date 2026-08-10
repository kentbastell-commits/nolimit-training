import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  assertCompanyOpsAuthConfigured,
  getCompanyOpsConfig,
} from "../server/companyOps/config.ts";
import {
  noStore,
  requireMutationCsrf,
  requireRequestSession,
  type CompanyOpsActionName,
} from "../server/companyOps/auth.ts";
import {
  createCompanyOpsRepository,
  publicCompanyOpsError,
} from "../server/companyOps/repository.ts";

const bodyObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  noStore(res);
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const config = getCompanyOpsConfig();
    assertCompanyOpsAuthConfigured(config);
    const session = requireRequestSession(req, config);
    requireMutationCsrf(req, session, config);

    const body = bodyObject(req.body);
    const unknown = Object.keys(body).filter(
      (key) => key !== "action" && key !== "payload"
    );
    if (unknown.length) {
      return res.status(400).json({ error: `Unknown request fields: ${unknown.join(", ")}` });
    }
    if (typeof body.action !== "string" || !body.action) {
      return res.status(400).json({ error: "action is required" });
    }
    const payload = bodyObject(body.payload);
    const repository = createCompanyOpsRepository(config);
    const principal = await repository.resolvePrincipal(session);
    const result = await repository.performAction(principal, {
      action: body.action as CompanyOpsActionName,
      payload,
    });
    return res.status(200).json({
      ...result,
      id: result.recordId,
    });
  } catch (error) {
    const safe = publicCompanyOpsError(error);
    return res.status(safe.status).json({ error: safe.message, message: safe.message });
  }
}
