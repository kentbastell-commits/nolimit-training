import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  assertCompanyOpsAuthConfigured,
  getCompanyOpsConfig,
  type CompanyOpsRole,
} from "../server/companyOps/config.ts";
import {
  getRequestSession,
  noStore,
} from "../server/companyOps/auth.ts";
import {
  createCompanyOpsRepository,
  publicCompanyOpsError,
} from "../server/companyOps/repository.ts";

type PublicRole = "founder" | "growth" | "employee" | "finance";

const publicRole = (role: CompanyOpsRole): PublicRole =>
  role === "staff" || role === "pending" ? "employee" : role;

const capabilities = (role: CompanyOpsRole): string[] => {
  if (role === "founder") {
    return [
      "view_growth",
      "edit_growth",
      "review_content",
      "view_decisions",
      "resolve_decisions",
      "view_finance",
      "manage_onboarding",
      "submit_expense",
    ];
  }
  if (role === "growth") {
    // No view_decisions: the decisions inbox is populated only for
    // finance-visible roles, so for growth it would render permanently empty.
    return ["view_growth", "edit_growth", "submit_expense"];
  }
  if (role === "finance") {
    return ["view_finance", "view_decisions", "submit_expense"];
  }
  if (role === "staff") return ["submit_expense"];
  return [];
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  noStore(res);
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const config = getCompanyOpsConfig();
    assertCompanyOpsAuthConfigured(config);
    const session = getRequestSession(req, config);
    if (!session) {
      return res.status(200).json({
        authenticated: false,
        loginUrl: "/api/companyOpsLogin",
      });
    }
    const principal = await createCompanyOpsRepository(config).resolvePrincipal(
      session
    );
    return res.status(200).json({
      authenticated: true,
      user: {
        id: principal.openId,
        openId: principal.openId,
        name: principal.name,
        avatarUrl: principal.avatarUrl,
        role: publicRole(principal.role),
        capabilities: capabilities(principal.role),
        accessPending: principal.role === "pending",
      },
      csrfToken: session.csrfToken,
    });
  } catch (error) {
    const safe = publicCompanyOpsError(error);
    return res.status(safe.status).json({ error: safe.message, message: safe.message });
  }
}
