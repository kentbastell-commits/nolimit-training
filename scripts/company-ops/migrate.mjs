#!/usr/bin/env node
import {
  FeishuClient,
  formatApiError,
  loadCompanyOpsConfig,
  parseMode,
} from "./client.mjs";
import {
  companyOpsSchema,
  fieldPayload,
  FIELD_TYPES,
  onboardingTemplateSeeds,
  sharedAssetsTree,
} from "./schema.mjs";

const mode = parseMode(process.argv.slice(2));
const config = loadCompanyOpsConfig();
const client = new FeishuClient(config);
const stats = { create: 0, update: 0, unchanged: 0, warnings: 0 };

function log(action, scope, detail) {
  const prefix = mode.dry ? "DRY" : "APPLY";
  console.log(`${prefix}|${action}|${scope}|${detail}`);
}

function unchanged(scope, detail) {
  stats.unchanged += 1;
  log("OK", scope, detail);
}

function warn(scope, detail) {
  stats.warnings += 1;
  log("WARN", scope, detail);
}

function planned(action, scope, detail) {
  stats[action === "CREATE" ? "create" : "update"] += 1;
  log(action, scope, detail);
}

async function write(action, scope, detail, operation) {
  if (mode.dry) {
    stats[action === "CREATE" ? "create" : "update"] += 1;
    log(action, scope, detail);
    return undefined;
  }
  const result = await operation();
  stats[action === "CREATE" ? "create" : "update"] += 1;
  log(action, scope, detail);
  return result;
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

function uniqueMap(items, key, context) {
  const result = new Map();
  for (const item of items) {
    const value = item[key];
    if (result.has(value)) throw new Error(`Duplicate ${context}: ${value}`);
    result.set(value, item);
  }
  return result;
}

async function ensureTables(baseKey, baseSpec, appToken) {
  let tableMap = uniqueMap(await listTables(appToken), "name", `${baseKey} table`);
  for (const tableSpec of baseSpec.tables) {
    if (tableMap.has(tableSpec.name)) {
      unchanged(`${baseKey}/${tableSpec.name}`, "table exists");
      continue;
    }
    if (!tableSpec.create || !tableSpec.primary) {
      throw new Error(`Required existing table is missing: ${baseKey}/${tableSpec.name}`);
    }
    // The create-table endpoint accepts a narrower field shape than the
    // create-field endpoint. In particular, descriptions can trigger
    // 1254001 WrongRequestBody when nested in `table.fields`, even though the
    // same value is valid when a field is created or updated separately.
    // Keep table creation intentionally minimal; richer metadata belongs in
    // the normal field reconciliation pass.
    const desiredPrimary = fieldPayload(tableSpec.primary, new Map());
    const primary = {
      field_name: desiredPrimary.field_name,
      type: desiredPrimary.type,
    };
    if (desiredPrimary.property !== undefined) {
      primary.property = desiredPrimary.property;
    }
    if (desiredPrimary.ui_type !== undefined) {
      primary.ui_type = desiredPrimary.ui_type;
    }
    await write("CREATE", `${baseKey}/${tableSpec.name}`, "create table", () =>
      client.post(
        `/bitable/v1/apps/${appToken}/tables`,
        {
          table: {
            name: tableSpec.name,
            default_view_name: "表格",
            fields: [primary],
          },
        },
      ),
    );
    if (mode.dry) {
      for (const fieldSpec of tableSpec.fields || []) {
        planned("CREATE", `${baseKey}/${tableSpec.name}`, `field ${fieldSpec.name}`);
      }
      for (const viewSpec of tableSpec.views || []) {
        planned("CREATE", `${baseKey}/${tableSpec.name}`, `view ${viewSpec.name}`);
      }
      for (const formSpec of tableSpec.forms || []) {
        planned("CREATE", `${baseKey}/${tableSpec.name}`, `form ${formSpec.name}`);
        planned("UPDATE", `${baseKey}/${tableSpec.name}/${formSpec.name}`, "configure safe form metadata and questions after creation");
      }
    }
  }
  if (mode.apply) {
    tableMap = uniqueMap(await listTables(appToken), "name", `${baseKey} table`);
  }
  return tableMap;
}

function optionNames(property) {
  return (property?.options || []).map((option) => option.name);
}

async function ensureField(
  baseKey,
  tableSpec,
  table,
  fieldSpec,
  appToken,
  fieldsByName,
  tableIdsByName,
) {
  const scope = `${baseKey}/${tableSpec.name}`;
  const existing = fieldsByName.get(fieldSpec.name);
  if (!existing) {
    const payload = fieldPayload(fieldSpec, tableIdsByName);
    await write("CREATE", scope, `field ${fieldSpec.name}`, () =>
      client.post(
        `/bitable/v1/apps/${appToken}/tables/${table.table_id}/fields`,
        payload,
        { idempotent: true },
      ),
    );
    return;
  }

  if (Number(existing.type) !== Number(fieldSpec.type)) {
    warn(
      scope,
      `field ${fieldSpec.name} has type ${existing.type}; expected ${fieldSpec.type}. Left unchanged for manual review.`,
    );
    return;
  }

  if (fieldSpec.mergeOptions && fieldSpec.type === FIELD_TYPES.SELECT) {
    const desired = optionNames(fieldSpec.property);
    const current = optionNames(existing.property);
    const missing = desired.filter((name) => !current.includes(name));
    if (missing.length) {
      const payload = {
        field_name: existing.field_name,
        type: existing.type,
        property: {
          ...(existing.property || {}),
          options: [
            ...(existing.property?.options || []),
            ...missing.map((name) => ({ name })),
          ],
        },
      };
      if (existing.ui_type) payload.ui_type = existing.ui_type;
      if (existing.description || fieldSpec.description) {
        payload.description = existing.description || fieldSpec.description;
      }
      await write(
        "UPDATE",
        scope,
        `add select options to ${fieldSpec.name}: ${missing.join(", ")}`,
        () =>
          client.put(
            `/bitable/v1/apps/${appToken}/tables/${table.table_id}/fields/${existing.field_id}`,
            payload,
            {},
          ),
      );
      return;
    }
  }
  unchanged(scope, `field ${fieldSpec.name}`);
}

async function ensureFields(baseKey, baseSpec, appToken, tableMap) {
  if (mode.dry) {
    // Existing tables are still inspected in dry mode. Newly planned tables do
    // not yet have IDs, and their child operations were printed above.
  }
  const tableIdsByName = new Map(
    [...tableMap.entries()].map(([name, table]) => [name, table.table_id]),
  );
  for (const tableSpec of baseSpec.tables) {
    const table = tableMap.get(tableSpec.name);
    if (!table) continue;
    const fields = await listFields(appToken, table.table_id);
    const fieldsByName = uniqueMap(fields, "field_name", `${tableSpec.name} field`);
    for (const fieldSpec of tableSpec.fields || []) {
      await ensureField(
        baseKey,
        tableSpec,
        table,
        fieldSpec,
        appToken,
        fieldsByName,
        tableIdsByName,
      );
      if (mode.apply && !fieldsByName.has(fieldSpec.name)) {
        const refreshed = await listFields(appToken, table.table_id);
        fieldsByName.clear();
        for (const value of refreshed) fieldsByName.set(value.field_name, value);
      }
    }
  }
}

async function ensureViews(baseKey, baseSpec, appToken, tableMap) {
  for (const tableSpec of baseSpec.tables) {
    const table = tableMap.get(tableSpec.name);
    if (!table) continue;
    let views = await listViews(appToken, table.table_id);
    let viewsByName = uniqueMap(views, "view_name", `${tableSpec.name} view`);
    const desiredViews = [
      ...(tableSpec.views || []),
      ...(tableSpec.forms || []).map((item) => ({ name: item.name, type: "form" })),
    ];
    for (const viewSpec of desiredViews) {
      const existing = viewsByName.get(viewSpec.name);
      if (existing) {
        if (existing.view_type !== viewSpec.type) {
          warn(
            `${baseKey}/${tableSpec.name}`,
            `view ${viewSpec.name} is ${existing.view_type}, expected ${viewSpec.type}; left unchanged`,
          );
        } else {
          unchanged(`${baseKey}/${tableSpec.name}`, `view ${viewSpec.name}`);
        }
        continue;
      }
      await write(
        "CREATE",
        `${baseKey}/${tableSpec.name}`,
        `${viewSpec.type} view ${viewSpec.name}`,
        () =>
          client.post(
            `/bitable/v1/apps/${appToken}/tables/${table.table_id}/views`,
            { view_name: viewSpec.name, view_type: viewSpec.type },
          ),
      );
      if (mode.apply) {
        views = await listViews(appToken, table.table_id);
        viewsByName = uniqueMap(views, "view_name", `${tableSpec.name} view`);
      }
    }
  }
}

function sameArray(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

async function ensureForm(baseKey, tableSpec, table, formSpec, appToken) {
  const scope = `${baseKey}/${tableSpec.name}/${formSpec.name}`;
  const views = await listViews(appToken, table.table_id);
  const formView = views.find(
    (item) => item.view_name === formSpec.name && item.view_type === "form",
  );
  if (!formView) {
    // ensureViews has already planned this during dry-run or created it in apply.
    if (mode.dry) return;
    throw new Error(`Form view was not created: ${scope}`);
  }

  const formPath = `/bitable/v1/apps/${appToken}/tables/${table.table_id}/forms/${formView.view_id}`;
  const current = (await client.get(formPath)).data?.form || {};
  const desiredMeta = {
    name: formSpec.name,
    description: formSpec.description,
    shared: formSpec.shared,
    submit_limit_once: formSpec.submitLimitOnce,
  };
  if (formSpec.shared) desiredMeta.shared_limit = formSpec.sharedLimit;
  const metaChanged = Object.entries(desiredMeta).some(
    ([key, value]) => current[key] !== value,
  );
  if (metaChanged) {
    await write("UPDATE", scope, "form metadata and tenant-only sharing", () =>
      client.patch(formPath, desiredMeta),
    );
  } else {
    unchanged(scope, "form metadata and sharing");
  }

  const tableFields = await listFields(appToken, table.table_id);
  const fieldsById = new Map(tableFields.map((item) => [item.field_id, item]));
  const fieldsByName = new Map(tableFields.map((item) => [item.field_name, item]));
  const formFields = await client.paginate(`${formPath}/fields`);
  const formById = new Map(formFields.map((item) => [item.field_id, item]));
  const visibleSet = new Set(formSpec.visible);
  const requiredSet = new Set(formSpec.required);

  for (const name of formSpec.visible) {
    if (!fieldsByName.has(name)) warn(scope, `form field is missing from table: ${name}`);
  }
  for (const name of formSpec.required) {
    if (!visibleSet.has(name)) throw new Error(`Required form field is not visible: ${scope}/${name}`);
  }

  const currentVisibleOrder = formFields
    .filter((item) => item.visible)
    .map((item) => fieldsById.get(item.field_id)?.field_name)
    .filter((name) => visibleSet.has(name));
  const orderChanged = !sameArray(currentVisibleOrder, formSpec.visible);

  let previousFieldId = "";
  for (const name of formSpec.visible) {
    const tableField = fieldsByName.get(name);
    if (!tableField) continue;
    const currentField = formById.get(tableField.field_id);
    if (!currentField) {
      warn(scope, `form question metadata unavailable: ${name}`);
      continue;
    }
    const required = requiredSet.has(name);
    const needsUpdate =
      !currentField.visible ||
      Boolean(currentField.required) !== required ||
      orderChanged;
    if (needsUpdate) {
      await write("UPDATE", scope, `form question ${name}`, () =>
        client.patch(
          `${formPath}/fields/${tableField.field_id}`,
          {
            pre_field_id: previousFieldId,
            title: name,
            required,
            visible: true,
          },
          {},
        ),
      );
    } else {
      unchanged(scope, `form question ${name}`);
    }
    previousFieldId = tableField.field_id;
  }

  for (const currentField of formFields) {
    const tableField = fieldsById.get(currentField.field_id);
    if (!tableField || visibleSet.has(tableField.field_name) || !currentField.visible) continue;
    await write("UPDATE", scope, `hide internal question ${tableField.field_name}`, () =>
      client.patch(
        `${formPath}/fields/${currentField.field_id}`,
        { visible: false },
        {},
      ),
    );
  }
}

async function ensureForms(baseKey, baseSpec, appToken, tableMap) {
  for (const tableSpec of baseSpec.tables) {
    const table = tableMap.get(tableSpec.name);
    if (!table) continue;
    for (const formSpec of tableSpec.forms || []) {
      await ensureForm(baseKey, tableSpec, table, formSpec, appToken);
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

async function ensureOnboardingTemplates(appToken, tableMap) {
  const table = tableMap.get("入职任务模板 Onboarding Templates");
  if (!table) {
    if (mode.dry) {
      planned("CREATE", "teamOps/onboarding-templates", `${onboardingTemplateSeeds.length} template records`);
      return;
    }
    throw new Error("Onboarding Templates table is missing after migration");
  }
  const records = await client.paginate(
    `/bitable/v1/apps/${appToken}/tables/${table.table_id}/records`,
    { pageSize: 500 },
  );
  const existingKeys = new Set(
    records.map((record) => plainText(record.fields?.["模板编号 Template Key"])),
  );
  const missing = onboardingTemplateSeeds.filter(
    (record) => !existingKeys.has(record["模板编号 Template Key"]),
  );
  if (!missing.length) {
    unchanged("teamOps/onboarding-templates", `${onboardingTemplateSeeds.length} templates present`);
    return;
  }
  await write(
    "CREATE",
    "teamOps/onboarding-templates",
    `${missing.length} missing template records`,
    () =>
      client.post(
        `/bitable/v1/apps/${appToken}/tables/${table.table_id}/records/batch_create`,
        { records: missing.map((fields) => ({ fields })) },
        { idempotent: true },
      ),
  );
}

async function listDriveFiles() {
  return client.paginate("/drive/v1/files", { pick: "files", pageSize: 200 });
}

async function listDriveFolderFiles(folderToken) {
  return client.paginate("/drive/v1/files", {
    query: { folder_token: folderToken },
    pick: "files",
    pageSize: 200,
  });
}

async function listPermissionMembers(token, type) {
  return client.paginate(`/drive/v1/permissions/${token}/members`, {
    query: { type },
  });
}

async function ensureMember(resource, memberId, perm, memberType = "openid") {
  const members = await listPermissionMembers(resource.token, resource.type);
  const existing = members.find(
    (item) => item.member_type === memberType && item.member_id === memberId,
  );
  if (existing && existing.perm === perm) {
    unchanged(`security/${resource.name}`, `${perm} collaborator present`);
    return;
  }
  if (existing) {
    await write("UPDATE", `security/${resource.name}`, `collaborator permission -> ${perm}`, () =>
      client.put(
        `/drive/v1/permissions/${resource.token}/members/${memberId}`,
        { member_type: memberType, perm },
        { query: { type: resource.type, need_notification: false } },
      ),
    );
    return;
  }
  await write("CREATE", `security/${resource.name}`, `${perm} collaborator`, () =>
    client.post(
      `/drive/v1/permissions/${resource.token}/members`,
      { member_type: memberType, member_id: memberId, perm },
      { query: { type: resource.type, need_notification: false } },
    ),
  );
}

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

async function resolveFounderAdminIdentities() {
  const identities = [];
  let administratorLookupError;
  const addIdentity = (keys, principal) => {
    const cleanKeys = [...new Set(keys.filter(Boolean))];
    if (!cleanKeys.length || !principal?.memberId) return;
    const existing = identities.find((identity) =>
      cleanKeys.some((key) => identity.keys.has(key)),
    );
    if (existing) {
      for (const key of cleanKeys) existing.keys.add(key);
      if (
        existing.principal.memberType !== "openid" &&
        principal.memberType === "openid"
      ) {
        existing.principal = principal;
      }
      return;
    }
    identities.push({ keys: new Set(cleanKeys), principal });
  };

  try {
    const response = await client.get("/user/v4/app_admin_user/list");
    const administrators = Array.isArray(response.data?.user_list)
      ? response.data.user_list
      : [];
    for (const administrator of administrators) {
      const openId = administrator?.open_id || "";
      const userId = administrator?.user_id || "";
      addIdentity(
        [identityKey("openid", openId), identityKey("userid", userId)],
        openId
          ? { memberType: "openid", memberId: openId }
          : { memberType: "userid", memberId: userId },
      );
    }
  } catch (error) {
    administratorLookupError = error;
  }

  for (const openId of config.founderOpenIds) {
    addIdentity(
      [identityKey("openid", openId)],
      { memberType: "openid", memberId: openId },
    );
  }

  if (!identities.length && mode.dry) {
    const currentMembers = await listPermissionMembers(
      config.bases.confidential,
      "bitable",
    );
    for (const member of currentMembers) {
      if (member?.perm !== "full_access") continue;
      const key = identityKey(member.member_type, member.member_id);
      if (!key) continue;
      const memberType = key.startsWith("openid:") ? "openid" : "userid";
      addIdentity(
        [key],
        { memberType, memberId: member.member_id },
      );
    }
    if (identities.length) {
      warn(
        "security/founder-allowlist",
        "Dry-run only: using current Confidential full_access collaborator(s) to preview the plan. --apply still requires application-admin scope or FEISHU_FOUNDER_OPEN_IDS.",
      );
    }
  }

  const principals = identities.map((identity) => identity.principal);
  if (!principals.length) {
    throw new Error(
      `No founder or application-administrator identity is available (${administratorLookupError?.code || administratorLookupError?.status || "admin-list-empty"}). ` +
        "Grant admin:app.admin_id:readonly or set FEISHU_FOUNDER_OPEN_IDS before applying security changes.",
    );
  }
  if (administratorLookupError && config.founderOpenIds.length) {
    warn(
      "security/founder-allowlist",
      `Application administrators could not be read (${administratorLookupError.code || administratorLookupError.status || "unknown"}); using the explicit FEISHU_FOUNDER_OPEN_IDS allowlist only.`,
    );
  }
  unchanged(
    "security/founder-allowlist",
    `${principals.length} founder/application administrator identity record(s) resolved`,
  );
  return principals;
}

async function ensureResourceSecurity(resources, founderPrincipals) {
  for (const resource of resources) {
    const current = (
      await client.get(`/drive/v1/permissions/${resource.token}/public`, {
        query: { type: resource.type },
      })
    ).data?.permission_public;
    const changed = Object.entries(resource.permission).some(
      ([key, value]) => current?.[key] !== value,
    );
    if (!changed) {
      unchanged(`security/${resource.name}`, "public permission policy");
      continue;
    }
    await write("UPDATE", `security/${resource.name}`, "harden public permissions", () =>
      client.patch(
        `/drive/v1/permissions/${resource.token}/public`,
        resource.permission,
        { query: { type: resource.type } },
      ),
    );
  }

  for (const resource of resources) {
    for (const principal of founderPrincipals) {
      await ensureMember(
        resource,
        principal.memberId,
        "full_access",
        principal.memberType,
      );
    }
  }

  const growth = resources.find((item) => item.key === "growth");
  const founderOpenIds = new Set(
    founderPrincipals
      .filter((principal) => principal.memberType === "openid")
      .map((principal) => principal.memberId),
  );
  if (growth && config.growthEditorOpenIds.length) {
    for (const editorId of config.growthEditorOpenIds) {
      if (!founderOpenIds.has(editorId)) await ensureMember(growth, editorId, "edit");
    }
  } else if (growth) {
    warn(
      "security/growth",
      "No FEISHU_GROWTH_EDITOR_OPEN_IDS configured. The raw Growth Base link will remain closed; only founders/app can edit until Yumei's Open ID is added.",
    );
  }
}

function buildBaseSecurityResources() {
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
  return resources;
}

function buildDocumentSecurityResources(driveFiles) {
  const filesByName = uniqueMap(driveFiles, "name", "Drive file");
  const resources = [];
  for (const documentSpec of companyOpsSchema.documents) {
    const file = filesByName.get(documentSpec.name);
    if (!file) throw new Error(`App-owned document not found: ${documentSpec.name}`);
    resources.push({
      key: documentSpec.name,
      name: documentSpec.name,
      token: file.token,
      type: documentSpec.type,
      permission: documentSpec.permission,
    });
  }
  return resources;
}

function planFolderChildren(nodes, parentPath) {
  for (const node of nodes) {
    const path = `${parentPath}/${node.name}`;
    planned("CREATE", "drive/company-assets", `folder ${path}`);
    planFolderChildren(node.children || [], path);
  }
}

async function ensureFolderChildren(parentFolder, nodes, parentPath) {
  const files = await listDriveFolderFiles(parentFolder.token);
  for (const node of nodes) {
    const path = `${parentPath}/${node.name}`;
    const sameName = files.find((item) => item.name === node.name);
    if (sameName && sameName.type !== "folder") {
      warn("drive/company-assets", `${path} exists but is not a folder; left unchanged for manual review`);
      continue;
    }

    let child = sameName;
    if (!child) {
      const response = await write("CREATE", "drive/company-assets", `folder ${path}`, () =>
        client.post(
          "/drive/v1/files/create_folder",
          { name: node.name, folder_token: parentFolder.token },
          {},
        ),
      );
      if (mode.dry) {
        planFolderChildren(node.children || [], path);
        continue;
      }
      const token = response?.data?.token;
      if (!token) throw new Error(`Feishu created ${path} but returned no folder token`);
      child = { name: node.name, type: "folder", token };
    } else {
      unchanged("drive/company-assets", `folder ${path}`);
    }

    if ((node.children || []).length) {
      await ensureFolderChildren(child, node.children, path);
    }
  }
}

async function ensureSharedAssetsFolder(driveFiles, founderPrincipals) {
  const folderName = "公司共享资料 Company Shared Assets";
  let folder = driveFiles.find(
    (item) => item.name === folderName && item.type === "folder",
  );
  if (!folder) {
    const response = await write(
      "CREATE",
      "drive/company-assets",
      `root folder ${folderName}`,
      () =>
        client.post(
          "/drive/v1/files/create_folder",
          { name: folderName, folder_token: "" },
          {},
        ),
    );
    if (mode.dry) {
      for (const _founder of founderPrincipals) {
        planned("CREATE", "drive/company-assets", "founder full_access collaborator after folder creation");
      }
      planFolderChildren(sharedAssetsTree, folderName);
      planned("CREATE", "teamOps/System Links", "store company-assets folder URL after folder creation");
      return null;
    }
    const token = response?.data?.token;
    if (!token) throw new Error("Feishu created the assets folder but returned no folder token");
    folder = { name: folderName, type: "folder", token };
  } else {
    unchanged("drive/company-assets", `root folder ${folderName}`);
  }

  const resource = { ...folder, name: folderName };
  for (const principal of founderPrincipals) {
    try {
      await ensureMember(
        resource,
        principal.memberId,
        "full_access",
        principal.memberType,
      );
    } catch (error) {
      warn(
        "drive/company-assets",
        `Folder exists, but explicit founder access could not be granted (${error.code || error.status || "unknown"}). Do not enable public sharing; grant the founder in Feishu Drive UI.`,
      );
    }
  }
  await ensureFolderChildren(folder, sharedAssetsTree, folderName);
  return {
    ...folder,
    url: `https://${config.tenantDomain}/drive/folder/${folder.token}`,
  };
}

function urlValue(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return urlValue(value[0]);
  return value.link || value.url || "";
}

async function ensureSharedAssetsSystemLink(folder, appToken, tableMap) {
  if (!folder) return;
  const table = tableMap.get("系统链接 System Links");
  if (!table) {
    if (mode.dry) return;
    throw new Error("System Links table is missing after migration");
  }
  const path = `/bitable/v1/apps/${appToken}/tables/${table.table_id}/records`;
  const records = await client.paginate(path, { pageSize: 500 });
  const linkName = "公司共享资料 Company Shared Assets";
  const existing = records.find(
    (record) => plainText(record.fields?.["链接 Link Name"]) === linkName,
  );
  const fields = {
    "链接 Link Name": linkName,
    "地址 URL": { link: folder.url, text: "打开公司共享资料 Open Company Shared Assets" },
    "类别 Category": "公司资料 Company Assets",
    "适用人群 Audience": "全员 All Staff",
    "启用 Active": true,
    "说明 Notes": "公司控制的素材、品牌与运营共享资料根目录。访问权限按岗位单独授予。",
  };
  if (!existing) {
    await write("CREATE", "teamOps/System Links", "company-assets folder link", () =>
      client.post(path, { fields }, { idempotent: true }),
    );
    return;
  }
  if (urlValue(existing.fields?.["地址 URL"]) !== folder.url) {
    await write("UPDATE", "teamOps/System Links", "company-assets folder link", () =>
      client.put(`${path}/${existing.record_id}`, { fields }),
    );
    return;
  }
  unchanged("teamOps/System Links", "company-assets folder link");
}

async function main() {
  console.log(`MODE|${mode.dry ? "dry-run" : "apply"}`);
  console.log("SAFETY|No table or record deletion is implemented by this migration.");
  await client.authenticate();

  const founderPrincipals = await resolveFounderAdminIdentities();
  const baseSecurityResources = buildBaseSecurityResources();
  await ensureResourceSecurity(baseSecurityResources, founderPrincipals);

  const tableMaps = {};
  for (const [baseKey, baseSpec] of Object.entries(companyOpsSchema.bases)) {
    const appToken = config.bases[baseKey];
    tableMaps[baseKey] = await ensureTables(baseKey, baseSpec, appToken);
  }
  for (const [baseKey, baseSpec] of Object.entries(companyOpsSchema.bases)) {
    const appToken = config.bases[baseKey];
    await ensureFields(baseKey, baseSpec, appToken, tableMaps[baseKey]);
  }
  for (const [baseKey, baseSpec] of Object.entries(companyOpsSchema.bases)) {
    const appToken = config.bases[baseKey];
    await ensureViews(baseKey, baseSpec, appToken, tableMaps[baseKey]);
  }
  for (const [baseKey, baseSpec] of Object.entries(companyOpsSchema.bases)) {
    const appToken = config.bases[baseKey];
    await ensureForms(baseKey, baseSpec, appToken, tableMaps[baseKey]);
  }
  await ensureOnboardingTemplates(config.bases.teamOps, tableMaps.teamOps);

  const driveFiles = await listDriveFiles();
  const documentSecurityResources = buildDocumentSecurityResources(driveFiles);
  const sharedAssetsFolder = await ensureSharedAssetsFolder(
    driveFiles,
    founderPrincipals,
  );
  await ensureSharedAssetsSystemLink(
    sharedAssetsFolder,
    config.bases.teamOps,
    tableMaps.teamOps,
  );
  await ensureResourceSecurity(documentSecurityResources, founderPrincipals);

  for (const item of companyOpsSchema.manualFollowUps) {
    log("MANUAL", "follow-up", item);
  }
  console.log(
    `SUMMARY|create=${stats.create}|update=${stats.update}|unchanged=${stats.unchanged}|warnings=${stats.warnings}`,
  );
}

main().catch((error) => {
  console.error(`FAILED|${formatApiError(error)}`);
  process.exitCode = 1;
});
