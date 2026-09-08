// One-off, re-runnable: move the content calendar's footage status to the
// four-step flow (需拍摄 To Film → 待剪辑 To Edit → 已有素材 Footage Ready,
// plus 无需拍摄 No Filming Needed) — Kent, 2026-09-08.
//
//   node --env-file=.env.local --experimental-strip-types scripts/migrate-content-footage-status.ts [--dry]
//
// 1. Proves the "待剪辑 To Edit" option is writable on the live SingleSelect
//    column by writing it to a throwaway record, checking the response, and
//    deleting that record (Bitable auto-creates a missing option on write;
//    named mistake #32 says never assume — test the exact write shape).
// 2. Rewrites every record still on the retired "拍摄中 Filming" to
//    "需拍摄 To Film". Nothing else is touched. --dry prints counts only.
import "dotenv/config";
import { getCompanyOpsConfig } from "../server/companyOps/config.ts";
import { FeishuClient } from "../server/companyOps/feishuClient.ts";

const DRY = process.argv.includes("--dry");
const FIELD = "素材状态 Footage Status";
const LEGACY = "拍摄中 Filming";
const TO_FILM = "需拍摄 To Film";
const TO_EDIT = "待剪辑 To Edit";

const config = getCompanyOpsConfig(process.env);
const client = new FeishuClient(config);
const table = config.tables.content;
const appToken = config.baseTokens.growth;
const tableId = table.id || "";
if (!appToken || !tableId) {
  throw new Error("Need the growth base app token and FEISHU_ADMIN_CONTENT_TABLE_ID in .env.local");
}
const optionsOf = (property?: Record<string, unknown>): string[] =>
  (Array.isArray(property?.options) ? (property.options as Array<{ name?: string }>) : []).map((o) => String(o.name || ""));

const fields = await client.listFields(appToken, tableId);
const footage = fields.find((f) => f.field_name === FIELD);
if (!footage) throw new Error(`Column "${FIELD}" not found on content table ${tableId}`);
const optionNames = optionsOf(footage.property);
console.log(`column "${FIELD}" (type ${footage.type}) options now: ${optionNames.join(" | ")}`);

const records = await client.listRecords(appToken, tableId, { maxRecords: 1000 });
const legacy = records.filter((r) => String(r.fields[FIELD] ?? "") === LEGACY);
console.log(`${records.length} content records, ${legacy.length} still on "${LEGACY}"`);
if (DRY) { console.log("dry run — nothing written"); process.exit(0); }

if (!optionNames.includes(TO_EDIT)) {
  const probe = await client.createRecord(appToken, tableId, { "内容 Content": "zz-probe footage option (delete me)", [FIELD]: TO_EDIT });
  const written = String(probe.fields?.[FIELD] ?? "");
  await client.deleteRecord(appToken, tableId, probe.record_id);
  const after = (await client.listFields(appToken, tableId)).find((f) => f.field_name === FIELD);
  const ok = optionsOf(after?.property).includes(TO_EDIT);
  console.log(`probe wrote "${written}" and option now ${ok ? "EXISTS" : "MISSING"} — probe record deleted`);
  if (!ok) throw new Error(`Bitable did not create the "${TO_EDIT}" option; add it by hand in the base, then re-run`);
} else {
  console.log(`option "${TO_EDIT}" already exists`);
}

let done = 0;
for (const r of legacy) {
  const res = await client.updateRecord(appToken, tableId, r.record_id, { [FIELD]: TO_FILM });
  const now = String(res.fields?.[FIELD] ?? "");
  if (now !== TO_FILM) { console.log(`  ${r.record_id}: expected "${TO_FILM}", got "${now}"`); continue; }
  done++;
}
console.log(`migrated ${done}/${legacy.length} records from "${LEGACY}" to "${TO_FILM}"`);
