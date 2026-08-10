#!/usr/bin/env node
import {
  chmodSync,
  existsSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { FeishuClient, loadCompanyOpsConfig } from "./client.mjs";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const dry = args.includes("--dry");
if (apply === dry) throw new Error("Choose exactly one mode: --dry or --apply");
const envArgument = args.find((argument) => argument.startsWith("--env="));
const envPath = resolve(envArgument ? envArgument.slice("--env=".length) : ".env");
if (!existsSync(envPath)) throw new Error(`Environment file not found: ${envPath}`);

const config = loadCompanyOpsConfig();
const client = new FeishuClient(config, { writeDelayMs: 0 });

async function verifiedFounderId() {
  if (config.founderOpenIds.length === 1) return config.founderOpenIds[0];
  if (config.founderOpenIds.length > 1) {
    throw new Error(
      "Runtime configuration requires one founder Open ID; configure the allowlist manually for multiple founders.",
    );
  }
  const members = await client.paginate(
    `/drive/v1/permissions/${config.bases.confidential}/members`,
    { query: { type: "bitable" } },
  );
  const candidates = members.filter(
    (member) =>
      member?.perm === "full_access" &&
      ["openid", "open_id"].includes(member?.member_type) &&
      member?.member_id,
  );
  if (candidates.length !== 1) {
    throw new Error(
      "Safe founder discovery requires exactly one Confidential full-access Open ID. " +
        `Found ${candidates.length}; configure FEISHU_ADMIN_FOUNDER_OPEN_IDS manually.`,
    );
  }
  const founderId = candidates[0].member_id;
  const response = await client.get(
    `/contact/v3/users/${encodeURIComponent(founderId)}`,
    { query: { user_id_type: "open_id" } },
  );
  const user = response?.data?.user;
  if (
    user?.is_tenant_manager !== true ||
    user?.status?.is_activated !== true ||
    user?.status?.is_frozen === true ||
    user?.status?.is_exited === true
  ) {
    throw new Error(
      "The sole Confidential full-access collaborator is not an active Feishu tenant manager.",
    );
  }
  return founderId;
}

const tablePins = [
  ["confidential", "员工名册 Staff", "FEISHU_ADMIN_STAFF_TABLE_ID"],
  ["confidential", "报销记录 Expenses", "FEISHU_ADMIN_EXPENSES_TABLE_ID"],
  ["confidential", "工资台账 Payroll", "FEISHU_ADMIN_PAYROLL_TABLE_ID"],
  ["confidential", "提成月结 Commission Statements", "FEISHU_ADMIN_COMMISSION_TABLE_ID"],
  ["confidential", "月度绩效 Monthly Performance", "FEISHU_ADMIN_PERFORMANCE_TABLE_ID"],
  ["confidential", "制度确认 Policy Acknowledgements", "FEISHU_ADMIN_POLICY_ACKNOWLEDGEMENTS_TABLE_ID"],
  ["teamOps", "内部请求 Internal Requests", "FEISHU_ADMIN_INTERNAL_REQUESTS_TABLE_ID"],
  ["teamOps", "产品与应用支持 Product & App Support", "FEISHU_ADMIN_SUPPORT_TABLE_ID"],
  ["teamOps", "入职任务模板 Onboarding Templates", "FEISHU_ADMIN_ONBOARDING_TEMPLATES_TABLE_ID"],
  ["teamOps", "入职案例 Onboarding Cases", "FEISHU_ADMIN_ONBOARDING_CASES_TABLE_ID"],
  ["teamOps", "入职任务 Onboarding Tasks", "FEISHU_ADMIN_ONBOARDING_TABLE_ID"],
  ["growth", "内容日历 Content Calendar", "FEISHU_ADMIN_CONTENT_TABLE_ID"],
  ["growth", "线索 Leads CRM", "FEISHU_ADMIN_LEADS_TABLE_ID"],
  ["growth", "合作伙伴 KOL & Partners", "FEISHU_ADMIN_PARTNERS_TABLE_ID"],
  ["growth", "营销活动 Campaigns", "FEISHU_ADMIN_CAMPAIGNS_TABLE_ID"],
  ["growth", "增长实验 Growth Experiments", "FEISHU_ADMIN_EXPERIMENTS_TABLE_ID"],
  ["growth", "周报与里程碑 Weekly Reports & Milestones", "FEISHU_ADMIN_WEEKLY_REPORTS_TABLE_ID"],
  ["growth", "平台数据 Platform Metrics", "FEISHU_ADMIN_METRICS_TABLE_ID"],
];

const tablesByBase = {};
for (const [baseKey] of new Map(tablePins.map((item) => [item[0], true]))) {
  const tables = await client.paginate(
    `/bitable/v1/apps/${config.bases[baseKey]}/tables`,
  );
  tablesByBase[baseKey] = new Map(tables.map((table) => [table.name, table]));
}

const values = {
  FEISHU_ADMIN_APP_ID: config.appId,
  FEISHU_ADMIN_APP_SECRET: config.appSecret,
  FEISHU_ADMIN_BASE_APP_TOKEN: config.bases.confidential,
  FEISHU_TEAMOPS_BASE_APP_TOKEN: config.bases.teamOps,
  FEISHU_GROWTH_BASE_APP_TOKEN: config.bases.growth,
  FEISHU_ADMIN_SESSION_SECRET:
    process.env.FEISHU_ADMIN_SESSION_SECRET?.trim().length >= 32
      ? process.env.FEISHU_ADMIN_SESSION_SECRET.trim()
      : randomBytes(32).toString("hex"),
  FEISHU_ADMIN_OAUTH_REDIRECT_URI:
    "https://trainnolimit.cn/api/companyOpsAuthCallback",
  FEISHU_ADMIN_AFTER_LOGIN_PATH: "/company-ops",
  FEISHU_ADMIN_COOKIE_SECURE: "true",
  FEISHU_ADMIN_FOUNDER_OPEN_IDS: await verifiedFounderId(),
  FEISHU_ADMIN_APP_ADMINS_ARE_FOUNDERS: "false",
  FEISHU_ADMIN_TENANT_DOMAIN: config.tenantDomain,
  COMPANY_OPS_PUBLIC_URL: "https://trainnolimit.cn",
};

for (const [baseKey, tableName, envName] of tablePins) {
  const table = tablesByBase[baseKey].get(tableName);
  if (!table?.table_id) throw new Error(`Required runtime table is missing: ${tableName}`);
  values[envName] = table.table_id;
}

const driveFiles = await client.paginate("/drive/v1/files", {
  pick: "files",
  pageSize: 200,
});
const driveByName = new Map(driveFiles.map((file) => [file.name, file]));
const documentLinks = [
  ["跃燃体育 Company OS · Start Here", "FEISHU_ADMIN_START_HERE_URL"],
  ["报销制度 Expense Policy", "FEISHU_ADMIN_EXPENSE_POLICY_URL"],
  ["提成制度 Commission Structure", "FEISHU_ADMIN_COMMISSION_POLICY_URL"],
  ["入职指南 Onboarding Guide", "FEISHU_ADMIN_ONBOARDING_GUIDE_URL"],
];
for (const [name, envName] of documentLinks) {
  const file = driveByName.get(name);
  if (!file?.token || file.type !== "docx") {
    throw new Error(`Required Company Operations document is missing: ${name}`);
  }
  values[envName] = `https://${config.tenantDomain}/docx/${file.token}`;
}

const confidentialDetails = tablesByBase.confidential.get(
  "员工保密资料 Confidential Details",
);
const confidentialViews = await client.paginate(
  `/bitable/v1/apps/${config.bases.confidential}/tables/${confidentialDetails.table_id}/views`,
);
const confidentialForm = confidentialViews.find(
  (view) =>
    view.view_name === "员工保密资料 Confidential Employee Details" &&
    view.view_type === "form",
);
if (!confidentialForm) throw new Error("Confidential employee form is missing");
const confidentialFormMetadata = (
  await client.get(
    `/bitable/v1/apps/${config.bases.confidential}/tables/${confidentialDetails.table_id}` +
      `/forms/${confidentialForm.view_id}`,
  )
).data?.form;
if (
  confidentialFormMetadata?.shared !== true ||
  confidentialFormMetadata?.shared_limit !== "tenant_editable" ||
  !confidentialFormMetadata?.shared_url
) {
  throw new Error("Confidential employee form is not shared safely inside the tenant");
}
values.FEISHU_ADMIN_CONFIDENTIAL_FORM_URL = confidentialFormMetadata.shared_url;

const assetsFolder = driveByName.get("公司共享资料 Company Shared Assets");
if (!assetsFolder?.token || assetsFolder.type !== "folder") {
  throw new Error("Company Shared Assets folder is missing");
}
values.FEISHU_ADMIN_SHARED_ASSETS_FOLDER_TOKEN = assetsFolder.token;
values.FEISHU_ADMIN_SHARED_ASSETS_FOLDER_URL =
  `https://${config.tenantDomain}/drive/folder/${assetsFolder.token}`;

const original = readFileSync(envPath, "utf8");
const lines = original.split(/\r?\n/);
const remaining = new Map(Object.entries(values));
const nextLines = lines.map((line) => {
  const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=/);
  if (!match || !remaining.has(match[1])) return line;
  const value = remaining.get(match[1]);
  remaining.delete(match[1]);
  return `${match[1]}=${value}`;
});
if (remaining.size) {
  if (nextLines.at(-1) !== "") nextLines.push("");
  nextLines.push("# Company Operations runtime configuration (managed by configure-runtime-env.mjs)");
  for (const [key, value] of remaining) nextLines.push(`${key}=${value}`);
  nextLines.push("");
}

const changedKeys = Object.keys(values).filter((key) => {
  const current = process.env[key] || "";
  return current !== values[key];
});
console.log(
  `${apply ? "APPLY" : "DRY"}|company-ops-runtime|managed=${Object.keys(values).length}|changed=${changedKeys.length}`,
);
console.log("SAFETY|No credential, token, Open ID, table ID, or URL value is printed.");
if (dry) process.exit(0);

const temporaryPath = `${envPath}.${process.pid}.tmp`;
writeFileSync(temporaryPath, nextLines.join("\n"), { encoding: "utf8", mode: 0o600 });
chmodSync(temporaryPath, 0o600);
renameSync(temporaryPath, envPath);
chmodSync(envPath, 0o600);
console.log("APPLY|company-ops-runtime|environment updated atomically with mode 0600");
