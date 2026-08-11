// Imports an NXLIMIT onboarding intake sheet (入职信息收集表 .docx) into the
// HR Confidential base's 员工名册 Staff table. Reusable for every hire:
//
//   node --env-file=.env.local scripts/import-intake.mjs "C:\path\to\form.docx" [--dry]
//
// - Adds any missing columns (additive only) so the register mirrors the form
// - Upserts by 姓名 (re-running updates the same row)
// - Prints MASKED confirmations only — full ID/bank numbers never hit stdout
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const APP_ID = process.env.FEISHU_ADMIN_APP_ID;
const APP_SECRET = process.env.FEISHU_ADMIN_APP_SECRET;
const CONF = process.env.FEISHU_ADMIN_BASE_APP_TOKEN;
if (!APP_ID || !APP_SECRET || !CONF) {
  console.error("Missing FEISHU_ADMIN_* env (run with --env-file=.env.local)");
  process.exit(1);
}
const docxPath = process.argv[2];
const dry = process.argv.includes("--dry");
if (!docxPath || !fs.existsSync(docxPath)) {
  console.error("Usage: node scripts/import-intake.mjs <intake.docx> [--dry]");
  process.exit(1);
}

/* ---------------- docx -> ordered cell texts (python unzips reliably) ----- */
const cellsJson = execFileSync(
  "python",
  ["-c", `
import zipfile, re, json, sys
with zipfile.ZipFile(sys.argv[1]) as z:
    xml = z.read("word/document.xml").decode("utf8")
xml = re.sub(r"</w:tc>", "\\n|CELL|\\n", xml)
xml = re.sub(r"</w:p>", "\\n", xml)
text = re.sub(r"<[^>]+>", "", xml)
cells = []
for chunk in text.split("|CELL|"):
    joined = " ".join(l.strip() for l in chunk.split("\\n") if l.strip())
    cells.append(joined)
print(json.dumps(cells, ensure_ascii=False))
`, docxPath],
  { encoding: "utf8", env: { ...process.env, PYTHONIOENCODING: "utf-8" } }
);
const cells = JSON.parse(cellsJson).map((cell) => cell.trim()).filter(Boolean);

/* ---------------- label map: form label -> staff column ------------------- */
const LABELS = [
  [/^姓名$/, "姓名 Name"],
  [/拼音|Pinyin/i, "拼音 Pinyin"],
  [/^性别/, "性别 Gender"],
  [/出生日期|Date of Birth/i, "出生日期 Date of Birth"],
  [/身份证号/, "身份证号 ID Number"],
  [/民族|Ethnicity/i, "籍贯与民族 Origin & Ethnicity+"],
  [/政治面貌/, "个人状况 Personal Status+"],
  [/婚姻状况|Marital/i, "个人状况 Personal Status+"],
  [/^籍贯/, "籍贯与民族 Origin & Ethnicity+"],
  [/国籍|Nationality/i, "籍贯与民族 Origin & Ethnicity+"],
  [/最高学历/, "学历背景 Education+"],
  [/毕业院校|University/i, "学历背景 Education+"],
  [/^专业$/, "学历背景 Education+"],
  [/毕业时间|Graduation/i, "学历背景 Education+"],
  [/英语水平/, "语言能力 Languages+"],
  [/其他语言|Other Languages/i, "语言能力 Languages+"],
  [/手机号码/, "手机号 Phone"],
  [/备用电话|Backup Phone/i, null],
  [/电子邮箱/, "个人邮箱 Personal Email"],
  [/微信号|WeChat ID/i, "微信号 WeChat"],
  [/现住地址/, "现住地址 Current Address"],
  [/户籍地址/, "户籍地址 Registered Address"],
  [/入职岗位|Position/i, "职位 Role"],
  [/入职日期/, "入职日期 Start Date"],
  [/试用期|Probation Period/i, "__probation"],
  [/工作地点/, "工作地点与方式 Work Location & Mode+"],
  [/办公方式|Work Mode/i, "工作地点与方式 Work Location & Mode+"],
  [/开户银行$/, "开户银行及支行 Bank & Branch+"],
  [/开户行支行|Branch/i, "开户银行及支行 Bank & Branch+"],
  [/账户户名/, "账户户名 Account Holder"],
  [/银行账号|Account Number/i, "银行账号 Bank Account"],
  [/社保缴纳地/, "社保信息 Social Security+"],
  [/公积金缴纳地|Housing Fund City/i, "公积金信息 Housing Fund+"],
  [/^社保账号/, "社保信息 Social Security+"],
  [/公积金账号|Housing Fund No/i, "公积金信息 Housing Fund+"],
  [/是否曾缴社保/, "社保信息 Social Security+"],
  [/上次缴纳地|Previous City/i, "社保信息 Social Security+"],
];
// Emergency-contact section labels repeat 姓名/手机号码 — handled by section
// tracking below. "+"-suffixed targets accumulate "label: value" lines.

const record = {};
const append = (column, label, value) => {
  const line = `${label}: ${value}`;
  record[column] = record[column] ? `${record[column]}\n${line}` : line;
};

let section = "";
let emergency = {};
for (let index = 0; index < cells.length; index += 1) {
  let cell = cells[index];
  // Section headers share a cell with the next row's first label
  // ("...Section 5: Bank Account Information 开户银行") - recover the
  // trailing CJK label after switching sections.
  const residual = () => (cell.match(/[一-鿿][一-鿿\s]*$/) || [""])[0].trim();
  if (/紧急联系人/.test(cell) && /Section/i.test(cell)) { section = "emergency"; cell = residual(); }
  else if (/银行账户|Bank Account Information/i.test(cell)) { section = "bank"; cell = residual(); }
  else if (/教育经历|Education History/i.test(cell)) { section = "education"; continue; }
  else if (/工作经历|Work Experience/i.test(cell)) { section = "work"; continue; }
  else if (/Section/i.test(cell)) { section = ""; cell = residual(); }
  if (!cell) continue;

  const value = cells[index + 1];
  if (value === undefined) continue;

  if (section === "emergency") {
    if (/^姓名/.test(cell)) emergency.name = value;
    else if (/与本人关系|Relationship/i.test(cell)) emergency.relation = value;
    else if (/手机号码/.test(cell)) emergency.phone = value;
    else if (/工作单位|Employer/i.test(cell)) emergency.employer = value;
    else if (/联系地址/.test(cell)) emergency.address = value;
    continue;
  }
  if (section === "education" || section === "work") continue; // table rows handled below

  for (const [pattern, target] of LABELS) {
    if (!pattern.test(cell)) continue;
    if (target === null) break;
    if (value && value !== "/" && !/Section|▌/.test(value)) {
      if (target.endsWith("+")) append(target.slice(0, -1), cell.replace(/\s*\/.*$/, ""), value);
      else record[target] = value;
    }
    break;
  }
}
if (emergency.name) {
  record["紧急联系人 Emergency Contact"] = [
    emergency.name,
    emergency.relation,
    emergency.phone,
    emergency.employer,
    emergency.address,
  ].filter((part) => part && part !== "/").join(" · ");
}

// Education/work history: consume 4-column table rows following their headers.
const collectRows = (headerPattern, stopPattern) => {
  const start = cells.findIndex((cell) => headerPattern.test(cell));
  if (start === -1) return "";
  const rows = [];
  let row = [];
  for (let index = start + 1; index < cells.length; index += 1) {
    const cell = cells[index];
    if (stopPattern && stopPattern.test(cell)) break;
    if (/^(起\s*止|学\s*校|专\s*业|学\s*历|公\s*司|职\s*位|离\s*职)$/.test(cell)) continue;
    row.push(cell);
    if (row.length === 4) {
      const line = row.filter((part) => part && part !== "/").join(" · ");
      if (line) rows.push(line);
      row = [];
    }
  }
  return rows.join("\n");
};
const education = collectRows(/教育经历/, /工作经历/);
if (education) record["学历背景 Education"] =
  (record["学历背景 Education"] ? record["学历背景 Education"] + "\n" : "") + education;
const work = collectRows(/工作经历/, /^$/);
if (work) record["工作经历 Work History"] = work;

/* ---------------- derived fields ----------------------------------------- */
const parseCnDate = (value) => {
  const match = String(value || "").match(/(\d{4})[.\-年/](\d{1,2})[.\-月/](\d{1,2})/);
  if (!match) return undefined;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) - 8 * 3_600_000 + 8 * 3_600_000;
};
const startMs = parseCnDate(record["入职日期 Start Date"]);
const probationMonths = Number(String(record.__probation || "").match(/(\d+)/)?.[1] || 0);
delete record.__probation;

/* ---------------- Feishu ---------------------------------------------------*/
const BASE = "https://open.feishu.cn/open-apis";
const tok = await (await fetch(`${BASE}/auth/v3/tenant_access_token/internal`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET }),
})).json();
if (tok.code !== 0) throw new Error(`token ${tok.code}`);
const AUTH = { Authorization: `Bearer ${tok.tenant_access_token}` };
const api = async (pathname, init) => {
  const res = await fetch(`${BASE}${pathname}`, init);
  const body = await res.json();
  if (body.code !== 0) throw new Error(`${pathname} -> ${body.code}: ${body.msg}`);
  return body.data;
};

const tables = await api(`/bitable/v1/apps/${CONF}/tables?page_size=100`, { headers: AUTH });
const staff = tables.items.find((table) => /员工名册|Staff/i.test(table.name));
if (!staff) throw new Error("Staff table not found");
const fieldsData = await api(`/bitable/v1/apps/${CONF}/tables/${staff.table_id}/fields?page_size=100`, { headers: AUTH });
const existing = new Map(fieldsData.items.map((field) => [field.field_name, field]));

const NEEDED_TEXT_COLUMNS = [
  "拼音 Pinyin", "性别 Gender", "身份证号 ID Number", "个人邮箱 Personal Email",
  "现住地址 Current Address", "户籍地址 Registered Address",
  "籍贯与民族 Origin & Ethnicity", "个人状况 Personal Status",
  "学历背景 Education", "语言能力 Languages", "工作地点与方式 Work Location & Mode",
  "开户银行及支行 Bank & Branch", "账户户名 Account Holder", "银行账号 Bank Account",
  "社保信息 Social Security", "公积金信息 Housing Fund", "工作经历 Work History",
];
for (const name of NEEDED_TEXT_COLUMNS) {
  if (existing.has(name)) continue;
  if (dry) { console.log("[dry] would add column:", name); continue; }
  await api(`/bitable/v1/apps/${CONF}/tables/${staff.table_id}/fields`, {
    method: "POST",
    headers: { ...AUTH, "Content-Type": "application/json" },
    body: JSON.stringify({ field_name: name, type: 1 }),
  });
  console.log("added column:", name);
}
if (!existing.has("出生日期 Date of Birth") && !dry) {
  await api(`/bitable/v1/apps/${CONF}/tables/${staff.table_id}/fields`, {
    method: "POST",
    headers: { ...AUTH, "Content-Type": "application/json" },
    body: JSON.stringify({ field_name: "出生日期 Date of Birth", type: 5, property: { date_formatter: "yyyy/MM/dd" } }),
  });
  console.log("added column: 出生日期 Date of Birth");
}

/* ---------------- build the row ------------------------------------------ */
const fields = {};
for (const [column, value] of Object.entries(record)) {
  if (!value) continue;
  if (column === "入职日期 Start Date") { if (startMs) fields[column] = startMs; continue; }
  if (column === "出生日期 Date of Birth") { const ms = parseCnDate(value); if (ms) fields[column] = ms; continue; }
  if (column === "手机号 Phone") { fields[column] = String(value); continue; }
  fields[column] = String(value);
}
const dob = parseCnDate(cells[cells.findIndex((cell) => /出生日期/.test(cell)) + 1]);
if (dob) fields["出生日期 Date of Birth"] = dob;
if (startMs && probationMonths) {
  const end = new Date(startMs);
  end.setUTCMonth(end.getUTCMonth() + probationMonths);
  end.setUTCDate(end.getUTCDate() - 1);
  fields["试用期结束 Probation End"] = end.getTime();
}
fields["状态 Status"] = "在职 Active";
fields["保密资料状态 Confidential Details"] = "已完成 Complete";
fields["应用角色 App Role"] = "growth";
fields["部门 Department"] = "品牌与增长 Brand & Growth";

const mask = (value) => String(value).replace(/\d{6,}/g, (m) => m.slice(0, 3) + "*".repeat(m.length - 6) + m.slice(-3));
console.log("\nParsed fields (masked):");
for (const [key, value] of Object.entries(fields)) {
  console.log(" ", key, "=>", mask(String(value)).slice(0, 70));
}

if (dry) { console.log("\n--dry: nothing written"); process.exit(0); }

/* ---------------- upsert by name ------------------------------------------*/
const name = fields["姓名 Name"];
if (!name) throw new Error("No 姓名 found in the form");
const rows = await api(`/bitable/v1/apps/${CONF}/tables/${staff.table_id}/records?page_size=100`, { headers: AUTH });
const match = (rows.items || []).find((row) => {
  const cellValue = row.fields["姓名 Name"];
  const textValue = Array.isArray(cellValue) ? cellValue.map((part) => part.text || part).join("") : String(cellValue || "");
  return textValue.trim() === name;
});
if (match) {
  await api(`/bitable/v1/apps/${CONF}/tables/${staff.table_id}/records/${match.record_id}`, {
    method: "PUT",
    headers: { ...AUTH, "Content-Type": "application/json" },
    body: JSON.stringify({ fields }),
  });
  console.log(`\nUPDATED existing row for ${name}`);
} else {
  await api(`/bitable/v1/apps/${CONF}/tables/${staff.table_id}/records`, {
    method: "POST",
    headers: { ...AUTH, "Content-Type": "application/json" },
    body: JSON.stringify({ fields }),
  });
  console.log(`\nCREATED row for ${name}`);
}
console.log("Done - verify in the HR Confidential base.");
