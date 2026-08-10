#!/usr/bin/env node
import {
  FeishuClient,
  formatApiError,
  loadCompanyOpsConfig,
} from "./client.mjs";
import {
  companyOpsSchema,
  FIELD_TYPES,
  onboardingTemplateSeeds,
  sharedAssetsTree,
} from "./schema.mjs";

const config = loadCompanyOpsConfig();
const client = new FeishuClient(config);
const results = { pass: 0, fail: 0, warn: 0 };

function emit(level, scope, detail) {
  results[level.toLowerCase()] += 1;
  console.log(`${level}|${scope}|${detail}`);
}

const pass = (scope, detail) => emit("PASS", scope, detail);
const fail = (scope, detail) => emit("FAIL", scope, detail);
const warn = (scope, detail) => emit("WARN", scope, detail);

function identityKey(memberType, memberId) {
  if (!memberId) return "";
  if (memberType === "openid" || memberType === "open_id") {
    return `openid:${memberId}`;
  }
  if (memberType === "userid" || memberType === "user_id") {
    return `userid:${memberId}`;
  }
  return "";
}

async function resolveFounderAdminAllowlist() {
  const identities = [];
  let administratorLookupError;
  const addIdentity = (keys) => {
    const cleanKeys = [...new Set(keys.filter(Boolean))];
    if (!cleanKeys.length) return;
    const existing = identities.find((identity) =>
      cleanKeys.some((key) => identity.has(key)),
    );
    if (existing) {
      for (const key of cleanKeys) existing.add(key);
      return;
    }
    identities.push(new Set(cleanKeys));
  };

  try {
    const response = await client.get("/user/v4/app_admin_user/list");
    const administrators = Array.isArray(response.data?.user_list)
      ? response.data.user_list
      : [];
    for (const administrator of administrators) {
      addIdentity([
        identityKey("openid", administrator?.open_id),
        identityKey("userid", administrator?.user_id),
      ]);
    }
  } catch (error) {
    administratorLookupError = error;
  }

  for (const openId of config.founderOpenIds) {
    addIdentity([identityKey("openid", openId)]);
  }

  const allowedKeys = new Set(identities.flatMap((identity) => [...identity]));
  if (!identities.length) {
    fail(
      "security/founder-allowlist",
      `no founder/application administrator identities resolved (${administratorLookupError?.code || administratorLookupError?.status || "admin-list-empty"}); configure FEISHU_FOUNDER_OPEN_IDS and verify the app-admin scope`,
    );
  } else {
    if (administratorLookupError && config.founderOpenIds.length) {
      warn(
        "security/founder-allowlist",
        `application administrator lookup unavailable (${administratorLookupError.code || administratorLookupError.status || "unknown"}); verified the explicit founder allowlist instead`,
      );
    }
    pass(
      "security/founder-allowlist",
      `${identities.length} founder/application administrator identity record(s) resolved`,
    );
  }
  return { identities, allowedKeys };
}

function memberKey(member) {
  return identityKey(member?.member_type, member?.member_id);
}

function collaboratorBreakdown(members) {
  const counts = new Map();
  for (const member of members) {
    const type = member?.member_type || "unknown-type";
    const perm = member?.perm || "unknown-permission";
    const key = `${type}/${perm}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, count]) => `${key}=${count}`)
    .join(", ");
}

function verifyBasePublicSafety(resource, current) {
  const required = {
    external_access: false,
    invite_external: false,
    link_share_entity: "closed",
    security_entity: "only_full_access",
    share_entity: "only_full_access",
  };
  const unsafe = Object.entries(required)
    .filter(([key, value]) => current[key] !== value)
    .map(([key, value]) => `${key}=${current[key]} (required ${value})`);
  if (unsafe.length) {
    fail(
      `security/${resource.name}`,
      `unsafe public/tenant-edit settings: ${unsafe.join("; ")}`,
    );
  } else {
    pass(
      `security/${resource.name}`,
      "external access disabled, link closed, and sharing restricted to full-access collaborators",
    );
  }
}

async function listTables(appToken) {
  return client.paginate(`/bitable/v1/apps/${appToken}/tables`);
}

async function listFields(appToken, tableId) {
  return client.paginate(
    `/bitable/v1/apps/${appToken}/tables/${tableId}/fields`,
  );
}

async function listViews(appToken, tableId) {
  return client.paginate(
    `/bitable/v1/apps/${appToken}/tables/${tableId}/views`,
  );
}

async function listRecords(appToken, tableId) {
  return client.paginate(
    `/bitable/v1/apps/${appToken}/tables/${tableId}/records`,
    { pageSize: 500 },
  );
}

async function listDriveFolderFiles(folderToken) {
  return client.paginate("/drive/v1/files", {
    query: { folder_token: folderToken },
    pick: "files",
    pageSize: 200,
  });
}

async function verifyFolderChildren(parentFolder, nodes, parentPath) {
  const files = await listDriveFolderFiles(parentFolder.token);
  for (const node of nodes) {
    const path = `${parentPath}/${node.name}`;
    const item = files.find((candidate) => candidate.name === node.name);
    if (!item) {
      fail("drive/company-assets", `folder missing: ${path}`);
      continue;
    }
    if (item.type !== "folder") {
      fail("drive/company-assets", `${path} exists but is not a folder`);
      continue;
    }
    pass("drive/company-assets", `folder present: ${path}`);
    if ((node.children || []).length) {
      await verifyFolderChildren(item, node.children, path);
    }
  }
}

function plainText(value) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value.map((item) => item?.text || item?.name || "").join("");
  }
  return value == null ? "" : String(value);
}

function hasValue(value) {
  if (value == null || value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

function checkOptionSet(scope, fieldSpec, existing) {
  if (![FIELD_TYPES.SELECT, FIELD_TYPES.MULTI_SELECT].includes(fieldSpec.type)) return;
  const desired = (fieldSpec.property?.options || []).map((item) => item.name);
  const current = (existing.property?.options || []).map((item) => item.name);
  const missing = desired.filter((name) => !current.includes(name));
  if (missing.length) fail(scope, `field ${fieldSpec.name} missing options: ${missing.join(", ")}`);
}

async function verifyForm(baseKey, appToken, tableSpec, table, formSpec, views) {
  const scope = `${baseKey}/${tableSpec.name}/${formSpec.name}`;
  const formView = views.find(
    (item) => item.view_name === formSpec.name && item.view_type === "form",
  );
  if (!formView) {
    fail(scope, "form view missing");
    return;
  }
  const formPath = `/bitable/v1/apps/${appToken}/tables/${table.table_id}/forms/${formView.view_id}`;
  const metadata = (await client.get(formPath)).data?.form || {};
  if (Boolean(metadata.shared) !== Boolean(formSpec.shared)) {
    fail(scope, `shared=${metadata.shared}; expected ${formSpec.shared}`);
  } else if (formSpec.shared && metadata.shared_limit !== "tenant_editable") {
    fail(scope, `shared form is not tenant-only (${metadata.shared_limit || "unset"})`);
  } else {
    pass(scope, formSpec.shared ? "shared only inside tenant" : "operational form unshared");
  }

  const fields = await listFields(appToken, table.table_id);
  const byId = new Map(fields.map((item) => [item.field_id, item.field_name]));
  const formFields = await client.paginate(`${formPath}/fields`);
  const visible = formFields
    .filter((item) => item.visible)
    .map((item) => byId.get(item.field_id))
    .filter(Boolean);
  const required = formFields
    .filter((item) => item.visible && item.required)
    .map((item) => byId.get(item.field_id))
    .filter(Boolean);
  const extraVisible = visible.filter((name) => !formSpec.visible.includes(name));
  const missingVisible = formSpec.visible.filter((name) => !visible.includes(name));
  const missingRequired = formSpec.required.filter((name) => !required.includes(name));
  if (extraVisible.length) fail(scope, `internal/unexpected visible questions: ${extraVisible.join(", ")}`);
  if (missingVisible.length) fail(scope, `expected questions hidden/missing: ${missingVisible.join(", ")}`);
  if (missingRequired.length) fail(scope, `required flags missing: ${missingRequired.join(", ")}`);
  if (!extraVisible.length && !missingVisible.length && !missingRequired.length) {
    pass(scope, `${visible.length} safe questions; required fields configured`);
  }
}

async function verifyBase(baseKey, baseSpec, appToken) {
  const tables = await listTables(appToken);
  const tableMap = new Map(tables.map((item) => [item.name, item]));
  for (const tableSpec of baseSpec.tables) {
    const table = tableMap.get(tableSpec.name);
    const scope = `${baseKey}/${tableSpec.name}`;
    if (!table) {
      fail(scope, "table missing");
      continue;
    }
    pass(scope, "table exists");
    const fields = await listFields(appToken, table.table_id);
    const fieldMap = new Map(fields.map((item) => [item.field_name, item]));
    for (const fieldSpec of tableSpec.fields || []) {
      const existing = fieldMap.get(fieldSpec.name);
      if (!existing) {
        fail(scope, `field missing: ${fieldSpec.name}`);
        continue;
      }
      if (Number(existing.type) !== Number(fieldSpec.type)) {
        fail(scope, `field ${fieldSpec.name} type ${existing.type}; expected ${fieldSpec.type}`);
      }
      checkOptionSet(scope, fieldSpec, existing);
    }
    if (tableSpec.name === "产品与应用支持 Product & App Support") {
      const forbidden = fields
        .map((item) => item.field_name)
        .filter((name) => /(身份证|证件|银行|健康|伤病|诊断|medical|health|injury|bank|phone|手机号)/i.test(name));
      if (forbidden.length) {
        fail(scope, `sensitive-data fields are not permitted here: ${forbidden.join(", ")}`);
      } else {
        pass(scope, "support log contains no broad health, identity-document, bank, or phone fields");
      }
    }

    const views = await listViews(appToken, table.table_id);
    for (const desired of [
      ...(tableSpec.views || []),
      ...(tableSpec.forms || []).map((item) => ({ name: item.name, type: "form" })),
    ]) {
      const existing = views.find((item) => item.view_name === desired.name);
      if (!existing) fail(scope, `view missing: ${desired.name}`);
      else if (existing.view_type !== desired.type) {
        fail(scope, `view ${desired.name} is ${existing.view_type}; expected ${desired.type}`);
      }
    }
    for (const formSpec of tableSpec.forms || []) {
      await verifyForm(baseKey, appToken, tableSpec, table, formSpec, views);
    }
  }

  const workflowResponse = await client.get(
    `/bitable/v1/apps/${appToken}/workflows`,
    { query: { page_size: 100 } },
  );
  const workflowTotal = Number(
    workflowResponse.data?.total ?? workflowResponse.data?.items?.length ?? 0,
  );
  if (workflowTotal) pass(`${baseKey}/workflows`, `${workflowTotal} workflow(s)`);
  else warn(`${baseKey}/workflows`, "no Base automations yet; use the authenticated app/reminder worker or configure reviewed workflows")

  const dashboardResponse = await client.get(
    `/bitable/v1/apps/${appToken}/dashboards`,
    { query: { page_size: 100 } },
  );
  const dashboardTotal = Number(
    dashboardResponse.data?.total ?? dashboardResponse.data?.dashboards?.length ?? 0,
  );
  if (dashboardTotal) pass(`${baseKey}/dashboards`, `${dashboardTotal} dashboard(s)`);
  else warn(`${baseKey}/dashboards`, "dashboard widgets must be created in Feishu UI")

  return tableMap;
}

async function verifySecurity(tableMaps) {
  const founderAdminAllowlist = await resolveFounderAdminAllowlist();
  const driveFiles = await client.paginate("/drive/v1/files", {
    pick: "files",
    pageSize: 200,
  });
  const filesByName = new Map(driveFiles.map((item) => [item.name, item]));
  const resources = [];
  for (const [key, baseSpec] of Object.entries(companyOpsSchema.bases)) {
    resources.push({
      key,
      name: baseSpec.expectedName,
      token: config.bases[key],
      type: "bitable",
      permission: baseSpec.permission,
    });
  }
  for (const spec of companyOpsSchema.documents) {
    const file = filesByName.get(spec.name);
    if (!file) {
      fail(`security/${spec.name}`, "document missing from app Drive");
      continue;
    }
    resources.push({ ...spec, token: file.token });
  }

  for (const resource of resources) {
    const current = (
      await client.get(`/drive/v1/permissions/${resource.token}/public`, {
        query: { type: resource.type },
      })
    ).data?.permission_public || {};
    if (resource.type === "bitable") {
      verifyBasePublicSafety(resource, current);
    }
    const differences = Object.entries(resource.permission)
      .filter(([key, value]) => current[key] !== value)
      .map(([key, value]) => `${key}=${current[key]} (expected ${value})`);
    if (differences.length) fail(`security/${resource.name}`, differences.join("; "));
    else pass(`security/${resource.name}`, "public/link permissions hardened");
  }

  const confidential = resources.find((item) => item.key === "confidential");
  const founderMembers = await client.paginate(
    `/drive/v1/permissions/${confidential.token}/members`,
    { query: { type: "bitable" } },
  );
  const unexpectedConfidentialMembers = founderMembers.filter((member) => {
    const key = memberKey(member);
    return (
      !key ||
      !founderAdminAllowlist.allowedKeys.has(key) ||
      member.perm !== "full_access"
    );
  });
  if (unexpectedConfidentialMembers.length) {
    fail(
      "security/confidential-collaborators",
      `${unexpectedConfidentialMembers.length} unexpected direct collaborator(s); only founder/application administrators with full_access are allowed (${collaboratorBreakdown(unexpectedConfidentialMembers)})`,
    );
  } else if (founderMembers.length) {
    pass(
      "security/confidential-collaborators",
      `${founderMembers.length} direct collaborator(s), all allowlisted with full_access`,
    );
  } else {
    fail(
      "security/confidential-collaborators",
      "Confidential Base has no explicit founder/application administrator full_access collaborator",
    );
  }

  for (const resource of resources) {
    const members = await client.paginate(
      `/drive/v1/permissions/${resource.token}/members`,
      { query: { type: resource.type } },
    );
    const fullAccessKeys = new Set(
      members
        .filter((item) => item.perm === "full_access")
        .map(memberKey)
        .filter(Boolean),
    );
    const missing = founderAdminAllowlist.identities.filter(
      (identity) => ![...identity].some((key) => fullAccessKeys.has(key)),
    );
    if (missing.length) {
      fail(
        `security/${resource.name}`,
        `${missing.length} founder/application administrator collaborator(s) missing full_access`,
      );
    }
  }
  if (!config.growthEditorOpenIds.length) {
    warn("security/growth", "FEISHU_GROWTH_EDITOR_OPEN_IDS not configured; Yumei cannot edit the raw Base (the authenticated workspace remains usable)");
  }

  const folder = driveFiles.find(
    (item) =>
      item.name === "公司共享资料 Company Shared Assets" && item.type === "folder",
  );
  if (!folder) {
    fail("drive/company-assets", "app-owned root folder missing");
  } else {
    pass("drive/company-assets", "app-owned root folder exists");
    await verifyFolderChildren(
      folder,
      sharedAssetsTree,
      "公司共享资料 Company Shared Assets",
    );
    try {
      const publicPermission = (
        await client.get(`/drive/v1/permissions/${folder.token}/public`, {
          query: { type: "folder" },
        })
      ).data?.permission_public || {};
      if (
        publicPermission.external_access === false &&
        publicPermission.link_share_entity === "closed"
      ) {
        pass("drive/company-assets", "external access disabled and link sharing closed");
      } else {
        fail(
          "drive/company-assets",
          `unsafe public permission: external_access=${publicPermission.external_access}, link_share_entity=${publicPermission.link_share_entity || "unset"}`,
        );
      }
    } catch (error) {
      warn(
        "drive/company-assets",
        `folder public-permission verification unavailable (${error.code || error.status || "unknown"}); confirm link sharing is closed in Drive UI`,
      );
    }
    try {
      const members = await client.paginate(
        `/drive/v1/permissions/${folder.token}/members`,
        { query: { type: "folder" } },
      );
      const fullAccessKeys = new Set(
        members
          .filter((item) => item.perm === "full_access")
          .map(memberKey)
          .filter(Boolean),
      );
      const missing = founderAdminAllowlist.identities.filter(
        (identity) => ![...identity].some((key) => fullAccessKeys.has(key)),
      );
      if (missing.length) {
        warn("drive/company-assets", "folder member API did not establish founder access; grant it manually without public sharing")
      } else {
        pass("drive/company-assets", "founder has explicit full_access");
      }
    } catch (error) {
      warn("drive/company-assets", `folder member verification unavailable (${error.code || error.status || "unknown"}); verify founder access in Drive UI and do not enable public sharing`)
    }
  }

  const systemLinks = tableMaps.teamOps.get("系统链接 System Links");
  if (systemLinks) {
    const records = await listRecords(config.bases.teamOps, systemLinks.table_id);
    const exists = records.some(
      (record) =>
        plainText(record.fields?.["链接 Link Name"]) ===
        "公司共享资料 Company Shared Assets",
    );
    if (exists) pass("teamOps/System Links", "company-assets folder link present");
    else fail("teamOps/System Links", "company-assets folder link missing");
  }
}

async function verifyTemplates(tableMaps) {
  const table = tableMaps.teamOps.get("入职任务模板 Onboarding Templates");
  if (!table) return;
  const records = await listRecords(config.bases.teamOps, table.table_id);
  const keys = new Set(
    records.map((record) => plainText(record.fields?.["模板编号 Template Key"])),
  );
  const missing = onboardingTemplateSeeds
    .map((record) => record["模板编号 Template Key"])
    .filter((key) => !keys.has(key));
  if (missing.length) fail("teamOps/onboarding-templates", `missing template keys: ${missing.join(", ")}`);
  else pass("teamOps/onboarding-templates", `${onboardingTemplateSeeds.length} required templates present`);
}

async function verifyManualDestructiveFlags(tableMaps) {
  const defaultTable = tableMaps.teamOps.get("数据表");
  if (defaultTable) {
    const records = await listRecords(config.bases.teamOps, defaultTable.table_id);
    const nonEmpty = records.filter((record) =>
      Object.values(record.fields || {}).some(hasValue),
    ).length;
    warn(
      "manual/teamOps-default-table",
      `${records.length} row(s), ${nonEmpty} non-empty. Migration never deletes this table; a human must review it before deletion.`,
    );
  }
  if (tableMaps.teamOps.has("入职流程 Onboarding")) {
    warn(
      "manual/legacy-onboarding",
      "legacy onboarding table retained intentionally; archive only after the new Cases/Tasks workflow is proven",
    );
  }
  for (const item of companyOpsSchema.manualFollowUps) warn("manual/follow-up", item);
}

async function main() {
  console.log("MODE|read-only verification");
  await client.authenticate();
  const tableMaps = {};
  for (const [baseKey, baseSpec] of Object.entries(companyOpsSchema.bases)) {
    tableMaps[baseKey] = await verifyBase(
      baseKey,
      baseSpec,
      config.bases[baseKey],
    );
  }
  await verifyTemplates(tableMaps);
  await verifySecurity(tableMaps);
  await verifyManualDestructiveFlags(tableMaps);
  console.log(
    `SUMMARY|pass=${results.pass}|fail=${results.fail}|warn=${results.warn}`,
  );
  if (results.fail) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`FAILED|${formatApiError(error)}`);
  process.exitCode = 1;
});
