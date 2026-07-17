import {
  appToken,
  createRecord,
  fieldText,
  getFieldNames,
  getTenantToken,
  listRecords,
  updateRecord,
} from "./client.ts";
import type { ProgramDTO } from "../dto.ts";
import type {
  CreateProgramInput,
  DuplicateProgramInput,
  HandlerResult,
  UpdateProgramInput,
} from "../repositories/programs.ts";
import { getCached, setCached, invalidateCache } from "../../../api/_cache.ts";

// Build programId -> Session Type from the workout-templates table and cache it
// (30 min). Runs in the background so listPrograms never blocks on this large
// fetch. Guarded so concurrent misses don't each kick off a fetch.
let sessionTypeRefreshInFlight = false;
async function refreshSessionTypeMap() {
  if (sessionTypeRefreshInFlight) return;
  sessionTypeRefreshInFlight = true;
  try {
    const templateItems = await listRecords(
      process.env.FEISHU_WORKOUT_TEMPLATES_TABLE_ID as string
    );
    const map: Record<string, string> = {};
    for (const templateItem of templateItems) {
      const f = templateItem.fields || {};
      const type = fieldText(f["Session Type"]);
      if (!type) continue;
      const pidField = f["Program ID"];
      const keys: string[] = [];
      const pidText = fieldText(pidField);
      if (pidText) keys.push(pidText);
      const pushIds = (o: any) => {
        if (o && typeof o === "object") {
          if (Array.isArray(o.record_ids)) keys.push(...o.record_ids);
          if (Array.isArray(o.link_record_ids)) keys.push(...o.link_record_ids);
          if (typeof o.record_id === "string") keys.push(o.record_id);
        }
      };
      if (Array.isArray(pidField)) pidField.forEach(pushIds);
      else pushIds(pidField);
      for (const key of keys) {
        if (key && !(key in map)) map[key] = type;
      }
    }
    setCached("programSessionTypes", map, 30 * 60 * 1000);
    invalidateCache("programs"); // re-map programs with types on the next call
  } catch {
    // ignore — retry on the next cache miss
  } finally {
    sessionTypeRefreshInFlight = false;
  }
}

export async function listPrograms(): Promise<ProgramDTO[]> {
  const items = await listRecords(process.env.FEISHU_PROGRAMS_TABLE_ID as string);

  // A session's type ("Session Type") lives on its workout rows in the (large)
  // templates table, not on the program record. Fetching it inline made this
  // endpoint ~12s, so instead we serve the programId->type map from a
  // long-lived cache and refresh it in the BACKGROUND (the self-hosted server
  // keeps the promise alive after responding). When the refresh finishes it
  // drops the programs cache so the next call re-maps with types.
  const sessionTypeMap =
    getCached<Record<string, string>>("programSessionTypes") || {};
  if (!getCached("programSessionTypes")) {
    void refreshSessionTypeMap();
  }

  return items.map((item: any) => {
    const fields = item.fields || {};
    const programCode = fieldText(fields["Program ID"]);
    return {
      recordId: item.record_id,
      programId: programCode,
      sessionType:
        sessionTypeMap[programCode] || sessionTypeMap[item.record_id] || "",
      programName: fieldText(fields["Program Name"]),
      programNameCn: fieldText(fields["Program Name CN"]),
      goal: fieldText(fields["Goal"]),
      goalCn: fieldText(fields["Goal CN"]),
      sport: fieldText(fields["Sport"]),
      level: fieldText(fields["Level"]),
      durationWeeks: fieldText(fields["Duration Weeks"]),
      phase: fieldText(fields["Phase"]),
      phaseCn: fieldText(fields["Phase CN"]),
      season: fieldText(fields["Season"]),
      sessionsPerWeek: fieldText(fields["Sessions / Week"]),
      coach: fieldText(fields["Coach"]),
      status: fieldText(fields["Status"]),
      builtForClient: fieldText(fields["Built For Client"]),
      builtForTeam: fieldText(fields["Built For Team"]),
      storeCategory: fieldText(fields["Store Category"]),
      storeCategoryCn: fieldText(fields["Store Category CN"]),
      storeListingType: fieldText(fields["Store Listing Type"]),
      bundleProgramIds: fieldText(fields["Bundle Program IDs"]),
      productType: fieldText(fields["Product Type"]),
      price: fieldText(fields["Price"]),
      compareAtPrice: fieldText(fields["Compare At Price"]),
      currency: fieldText(fields["Currency"]),
      publicStoreVisible: Boolean(fields["Public Store Visible"]),
      purchaseLink: fieldText(fields["Purchase Link"]),
      defaultIntakeFormId: fieldText(fields["Default Intake Form ID"]),
      accessLengthDays: fieldText(fields["Access Length Days"]),
      productStatus: fieldText(fields["Product Status"]),
      salesDescription: fieldText(fields["Sales Description"]),
      salesDescriptionCn: fieldText(fields["Sales Description CN"]),
      storeUrl: fieldText(fields["Store URL"]),
      storeDescription: fieldText(fields["Store Description"]),
      storeDescriptionCn: fieldText(fields["Store Description CN"]),
      productImage: fieldText(fields["Product Image"]),
    };
  });
}

/* ---------------------------------- writes -------------------------------- */
// Logic moved verbatim from api/createProgram.ts / api/updateProgram.ts /
// api/duplicateProgram.ts; shared client helpers replace the inline token
// fetch / raw create/update calls where they are drop-in equivalents.

function makeProgramId() {
  const random = Math.floor(1000 + Math.random() * 9000);
  return `PR-${random}`;
}

export async function createProgram(i: CreateProgramInput): Promise<HandlerResult> {
  // Legacy handler fetched the token first and reported a dedicated error body.
  try {
    await getTenantToken();
  } catch (error: any) {
    if (error?.kind === "token") {
      return {
        status: 500,
        body: {
          error: "Could not get Lark tenant access token",
          larkResponse: error.larkResponse,
        },
      };
    }
    throw error;
  }

  const programId = makeProgramId();

  const stableFields = {
    "Program ID": programId,
    "Program Name": i.programName,
    Goal: i.goal || "",
    Sport: i.sport || "",
    Level: i.level || "",
    "Duration Weeks": Number(i.durationWeeks) || 1,
    Phase: i.phase || "",
    "Sessions / Week": Number(i.sessionsPerWeek) || 1,
    Coach: i.coach || "Kent Bastell",
    Status: i.status || "Active",
  };
  const optionalProductFields = {
    "Product Type": i.productType || "Digital Program",
    Price: i.price === "" || i.price === undefined ? "" : Number(i.price) || 0,
    "Compare At Price":
      i.compareAtPrice === "" || i.compareAtPrice === undefined
        ? ""
        : Number(i.compareAtPrice) || 0,
    Currency: i.currency || "CNY",
    "Public Store Visible": Boolean(i.publicStoreVisible),
    "Purchase Link": i.purchaseLink || "",
    "Default Intake Form ID": i.defaultIntakeFormId || "",
    "Access Length Days": Number(i.accessLengthDays) || undefined,
    "Product Status": i.productStatus || "Draft",
    "Sales Description": i.salesDescription || "",
    "Sales Description CN": i.salesDescriptionCn || "",
    "Built For Client": i.builtForClient || "",
    "Built For Team": i.builtForTeam || "",
    "Store Category": i.storeCategory || "",
    "Store Category CN": i.storeCategoryCn || "",
    "Store Listing Type": i.storeListingType || "",
    "Bundle Program IDs": i.bundleProgramIds || "",
    Season: i.season === "" || i.season === undefined ? "" : Number(i.season) || 0,
  };
  const fallbackFields = {
    "Program ID": programId,
    "Program Name": i.programName,
  };
  const tableId = process.env.FEISHU_PROGRAMS_TABLE_ID as string;
  // [] (fields fetch failed) means "unknown schema" — keep every field, exactly
  // like the legacy handler's null Set.
  const namesArr = await getFieldNames(tableId);
  const availableFieldNames = namesArr.length ? new Set(namesArr) : null;
  const omittedFields: string[] = [];
  const filterFields = (sourceFields: Record<string, any>) =>
    Object.fromEntries(
      Object.entries(sourceFields).filter(([fieldName]) => {
        const shouldKeep =
          !availableFieldNames || availableFieldNames.has(fieldName);

        if (!shouldKeep) {
          omittedFields.push(fieldName);
        }

        return shouldKeep;
      })
    );
  const fields = filterFields(stableFields);
  const fallbackCreateFields = filterFields(fallbackFields);
  const optionalFields = Object.fromEntries(
    Object.entries(optionalProductFields).filter(([fieldName]) => {
      const shouldKeep = !availableFieldNames || availableFieldNames.has(fieldName);

      if (!shouldKeep) {
        omittedFields.push(fieldName);
      }

      return shouldKeep;
    })
  );

  // Drop empty/undefined optional values from the create: on a brand-new
  // record they are no-ops, and empty strings on typed columns (e.g. a URL
  // field like "Purchase Link") make Feishu reject the whole write
  // (URLFieldConvFail), which previously forced the slow per-field fallback.
  const isEmptyValue = (value: any) =>
    value === "" || value === undefined || value === null;
  const combinableOptionalFields = Object.fromEntries(
    Object.entries(optionalFields).filter(([, value]) => !isEmptyValue(value))
  );

  // Fast path: create the record with all fields at once (one write) instead
  // of a create + a sequential PUT per optional field (~16 round-trips).
  const combinedFields = { ...fields, ...combinableOptionalFields };
  let createData = await createRecord(tableId, combinedFields);
  let runOptionalLoop = false;

  if (createData.code !== 0) {
    // The combined write was rejected (a bad optional value). Fall back to a
    // stable-fields create, then patch optional fields individually.
    createData = await createRecord(tableId, fields);
    runOptionalLoop = true;

    if (createData.code !== 0) {
      createData = await createRecord(tableId, fallbackCreateFields);

      if (createData.code !== 0) {
        return {
          status: 500,
          body: {
            error: "Failed to create program record",
            larkResponse: createData,
            fieldsSent: combinedFields,
            fallbackFieldsSent: fallbackCreateFields,
          },
        };
      }
    }
  }

  const programRecordId = createData?.data?.record?.record_id;
  const optionalUpdateErrors: Array<{
    fieldName: string;
    value: any;
    larkResponse: any;
  }> = [];

  if (programRecordId && runOptionalLoop) {
    for (const [fieldName, value] of Object.entries(combinableOptionalFields)) {
      const updateData = await updateRecord(tableId, programRecordId, {
        [fieldName]: value,
      });

      if (updateData.code !== 0) {
        optionalUpdateErrors.push({
          fieldName,
          value,
          larkResponse: updateData,
        });
      }
    }
  }

  return {
    status: 200,
    body: {
      success: true,
      programId,
      programRecordId,
      omittedFields,
      optionalUpdateErrors,
      larkResponse: createData,
    },
  };
}

export async function updateProgram(i: UpdateProgramInput): Promise<HandlerResult> {
  const fields: Record<string, string | number> = {};

  if (i.programName !== undefined) fields["Program Name"] = i.programName;
  if (i.goal !== undefined) fields.Goal = i.goal;
  if (i.sport !== undefined) fields.Sport = i.sport;
  if (i.level !== undefined) fields.Level = i.level;
  if (i.durationWeeks !== undefined) {
    fields["Duration Weeks"] = Number(i.durationWeeks) || 1;
  }
  if (i.phase !== undefined) fields.Phase = i.phase;
  if (i.sessionsPerWeek !== undefined) {
    fields["Sessions / Week"] = Number(i.sessionsPerWeek) || 1;
  }
  if (i.season !== undefined && i.season !== "") {
    fields.Season = Number(i.season) || 0;
  }
  if (i.coach !== undefined) fields.Coach = i.coach;
  if (i.status !== undefined) fields.Status = i.status;
  if (i.productType !== undefined) fields["Product Type"] = i.productType;
  // Price / Access Length Days are Number columns and Purchase Link is a URL
  // column: Feishu rejects an empty string on those (NumberFieldConvFail /
  // URLFieldConvFail) and that fails the whole update. The store form sends
  // "" for these on every non-digital program, so omit empties instead.
  if (i.price !== undefined && i.price !== "") fields.Price = Number(i.price) || 0;
  if (i.compareAtPrice !== undefined && i.compareAtPrice !== "") {
    fields["Compare At Price"] = Number(i.compareAtPrice) || 0;
  }
  if (i.currency !== undefined) fields.Currency = i.currency;
  if (i.publicStoreVisible !== undefined) {
    fields["Public Store Visible"] = Boolean(i.publicStoreVisible) as any;
  }
  if (i.purchaseLink !== undefined && i.purchaseLink !== "") {
    fields["Purchase Link"] = i.purchaseLink;
  }
  if (i.defaultIntakeFormId !== undefined) {
    fields["Default Intake Form ID"] = i.defaultIntakeFormId;
  }
  if (i.accessLengthDays !== undefined && i.accessLengthDays !== "") {
    fields["Access Length Days"] = Number(i.accessLengthDays) || 0;
  }
  if (i.productStatus !== undefined) fields["Product Status"] = i.productStatus;
  if (i.salesDescription !== undefined) {
    fields["Sales Description"] = i.salesDescription;
  }
  if (i.salesDescriptionCn !== undefined) {
    fields["Sales Description CN"] = i.salesDescriptionCn;
  }
  if (i.builtForClient !== undefined) {
    fields["Built For Client"] = i.builtForClient;
  }
  if (i.builtForTeam !== undefined) fields["Built For Team"] = i.builtForTeam;
  if (i.storeCategory !== undefined) fields["Store Category"] = i.storeCategory;
  if (i.storeCategoryCn !== undefined) {
    fields["Store Category CN"] = i.storeCategoryCn;
  }
  if (i.storeListingType !== undefined) {
    fields["Store Listing Type"] = i.storeListingType;
  }
  if (i.bundleProgramIds !== undefined) {
    fields["Bundle Program IDs"] = i.bundleProgramIds;
  }

  const updateData = await updateRecord(
    process.env.FEISHU_PROGRAMS_TABLE_ID as string,
    i.programRecordId,
    fields
  );

  if (updateData.code !== 0) {
    return {
      status: 500,
      body: {
        error: "Failed to update program",
        larkResponse: updateData,
        fieldsSent: fields,
      },
    };
  }

  return {
    status: 200,
    body: {
      success: true,
      programRecordId: i.programRecordId,
      larkResponse: updateData,
    },
  };
}

/* ------------------------------ duplicate --------------------------------- */
// Coach tooling: clone a whole program (record + all workout-template rows)
// or copy one week's sessions to another week inside the same program.

function makeId(prefix: string) {
  return `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function dupFieldToText(value: any): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    const item = value[0];
    if (!item) return "";
    if (typeof item === "string") return item;
    if (item?.text) return item.text;
    return "";
  }
  if (value?.text) return value.text;
  return "";
}

// Strip computed/link junk a raw record carries that create() would reject,
// keep everything else verbatim.
function copyableTemplateFields(
  source: Record<string, any>,
  newProgramRecordId: string
) {
  const out: Record<string, any> = {};
  for (const [name, value] of Object.entries(source)) {
    if (value === null || value === undefined) continue;
    if (name === "Template ID") continue; // regenerated
    if (name === "Program ID") {
      out[name] = [newProgramRecordId];
      continue;
    }
    // Skip other link/attachment-shaped values (arrays of objects with
    // record_ids) — templates shouldn't have any besides Program ID.
    if (
      Array.isArray(value) &&
      value[0] &&
      typeof value[0] === "object" &&
      ("record_ids" in value[0] || "file_token" in value[0])
    ) {
      continue;
    }
    out[name] = value;
  }
  return out;
}

// Coerce copied values against the destination table's schema — old rows can
// hold numbers-as-text, which Feishu rejects on Number columns at create time.
async function numberFieldNames(token: string, tableId: string) {
  const r = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken()}/tables/${tableId}/fields?page_size=100`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const d = await r.json();
  return new Set(
    ((d?.data?.items || []) as any[])
      .filter((f) => f.type === 2)
      .map((f) => f.field_name)
  );
}

function coerceNumbers(fields: Record<string, any>, numberNames: Set<string>) {
  for (const name of Object.keys(fields)) {
    if (!numberNames.has(name)) continue;
    const n = Number(fields[name]);
    if (Number.isFinite(n)) fields[name] = n;
    else delete fields[name];
  }
  return fields;
}

export async function duplicateProgram(
  i: DuplicateProgramInput
): Promise<HandlerResult> {
  const { programRecordId, mode, fromWeek, toWeek } = i;

  const programsTableId = process.env.FEISHU_PROGRAMS_TABLE_ID;
  const templatesTableId = process.env.FEISHU_WORKOUT_TEMPLATES_TABLE_ID;
  if (!programsTableId || !templatesTableId) {
    return { status: 500, body: { error: "Tables not configured" } };
  }

  const token = await getTenantToken();
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  const base = `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken()}/tables`;

  // All templates belonging to the source program. Kept as the legacy inline
  // scan (NOT the shared listRecords): the legacy loop tolerates an error page
  // by stopping, and duplicate must keep that exact behavior.
  const tmplItems: any[] = [];
  let pt = "";
  do {
    const u = new URL(`${base}/${templatesTableId}/records`);
    u.searchParams.set("page_size", "500");
    if (pt) u.searchParams.set("page_token", pt);
    const r = await fetch(u.toString(), { headers });
    const d = await r.json();
    if (!d?.data?.items) break;
    tmplItems.push(...d.data.items);
    pt = d.data.has_more ? d.data.page_token : "";
  } while (pt);
  const sourceTemplates = tmplItems.filter((item) => {
    const pid = item.fields?.["Program ID"];
    const ids = Array.isArray(pid)
      ? pid.flatMap((o: any) => o?.record_ids || [])
      : [];
    return ids.includes(programRecordId);
  });

  if (mode === "week") {
    const from = Number(fromWeek);
    const to = Number(toWeek);
    if (!from || !to) {
      return { status: 400, body: { error: "fromWeek and toWeek required" } };
    }
    const weekRows = sourceTemplates.filter(
      (item) => Number(dupFieldToText(item.fields?.["Week"])) === from
    );
    if (!weekRows.length) {
      return { status: 404, body: { error: `No sessions in week ${from}` } };
    }
    const tmplNumbers = await numberFieldNames(token, templatesTableId);
    const records = weekRows.map((item) => {
      const fields = coerceNumbers(
        copyableTemplateFields(item.fields, programRecordId),
        tmplNumbers
      );
      fields["Template ID"] = makeId("WT");
      fields["Week"] = to;
      return { fields };
    });
    for (let idx = 0; idx < records.length; idx += 200) {
      const r = await fetch(`${base}/${templatesTableId}/records/batch_create`, {
        method: "POST",
        headers,
        body: JSON.stringify({ records: records.slice(idx, idx + 200) }),
      });
      const d = await r.json();
      if (d.code !== 0) {
        return { status: 500, body: { error: "Week copy failed", larkResponse: d } };
      }
    }
    return {
      status: 200,
      body: { success: true, copied: records.length, week: to },
    };
  }

  // mode: program — clone the record, then every template.
  const progRes = await fetch(
    `${base}/${programsTableId}/records/${programRecordId}`,
    { headers }
  );
  const progData = await progRes.json();
  const src = progData?.data?.record?.fields;
  if (!src) return { status: 404, body: { error: "Program not found" } };

  const newProgramId = makeId("PR");
  const progFields: Record<string, any> = {};
  for (const [name, value] of Object.entries(src) as Array<[string, any]>) {
    if (value === null || value === undefined) continue;
    if (
      Array.isArray(value) &&
      value[0] &&
      typeof value[0] === "object" &&
      ("record_ids" in value[0] || "file_token" in value[0])
    )
      continue; // linked clients/orders/templates don't copy
    progFields[name] = value;
  }
  coerceNumbers(progFields, await numberFieldNames(token, programsTableId));
  progFields["Program ID"] = newProgramId;
  progFields["Program Name"] = `${dupFieldToText(src["Program Name"]) || "Program"} (Copy)`;
  if (src["Program Name CN"])
    progFields["Program Name CN"] = `${dupFieldToText(src["Program Name CN"])} (副本)`;
  // Never let a fresh copy appear in the public store by accident.
  if ("Public Store Visible" in progFields)
    progFields["Public Store Visible"] = false;

  const createRes = await fetch(`${base}/${programsTableId}/records`, {
    method: "POST",
    headers,
    body: JSON.stringify({ fields: progFields }),
  });
  const createData = await createRes.json();
  if (createData.code !== 0) {
    return {
      status: 500,
      body: { error: "Program copy failed", larkResponse: createData },
    };
  }
  const newRecordId = createData.data.record.record_id;

  const tmplNumbers = await numberFieldNames(token, templatesTableId);
  const records = sourceTemplates.map((item) => {
    const fields = coerceNumbers(
      copyableTemplateFields(item.fields, newRecordId),
      tmplNumbers
    );
    fields["Template ID"] = makeId("WT");
    return { fields };
  });
  let copied = 0;
  for (let idx = 0; idx < records.length; idx += 200) {
    const r = await fetch(`${base}/${templatesTableId}/records/batch_create`, {
      method: "POST",
      headers,
      body: JSON.stringify({ records: records.slice(idx, idx + 200) }),
    });
    const d = await r.json();
    if (d.code === 0) copied += records.slice(idx, idx + 200).length;
    else {
      return {
        status: 500,
        body: {
          error: "Template copy failed partway",
          copied,
          larkResponse: d,
        },
      };
    }
  }

  return {
    status: 200,
    body: {
      success: true,
      newProgramId,
      newRecordId,
      sessionsCopied: copied,
    },
  };
}
