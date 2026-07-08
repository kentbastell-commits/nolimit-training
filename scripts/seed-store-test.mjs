// Seed a test store catalog: 4 climbing programs + a 4-part bundle + 1 joint
// add-on. Re-runnable (dedupes by Program Name — updates in place, no dupes).
// Run ON THE SERVER (nolimit Feishu creds live only there):
//   node scripts/seed-store-test.mjs           (dry: prints the plan)
//   node scripts/seed-store-test.mjs --apply    (writes)
//
// Bundle/add-on behaviour is driven by the TEXT "Store Listing Type" column
// (Main/Bundle/Add-on) so it never depends on a SingleSelect option existing.
import fs from "node:fs";

const APPLY = process.argv.includes("--apply");

function loadEnv(path) {
  try {
    for (const line of fs.readFileSync(path, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
        v = v.slice(1, -1);
      if (!process.env[m[1]]) process.env[m[1]] = v;
    }
  } catch {}
}
loadEnv("/opt/nolimit-training/.env");
loadEnv(".env");

const APP = process.env.FEISHU_BASE_APP_TOKEN;
const TABLE = process.env.FEISHU_PROGRAMS_TABLE_ID;
const base = `https://open.feishu.cn/open-apis/bitable/v1/apps/${APP}/tables/${TABLE}`;

async function token() {
  const r = await fetch(
    "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_id: process.env.FEISHU_APP_ID,
        app_secret: process.env.FEISHU_APP_SECRET,
      }),
    }
  );
  const d = await r.json();
  if (!d.tenant_access_token) throw new Error("no token: " + JSON.stringify(d));
  return d.tenant_access_token;
}

const t = await token();
const H = { Authorization: `Bearer ${t}`, "Content-Type": "application/json" };
const txt = (v) => {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number") return String(v);
  if (Array.isArray(v)) return v.map((x) => x?.text || x?.name || x).join(",");
  return v.text || v.name || "";
};

// --- load existing records (dedupe by name) ---
let existing = [];
let pageToken = "";
do {
  const url = new URL(`${base}/records`);
  url.searchParams.set("page_size", "200");
  if (pageToken) url.searchParams.set("page_token", pageToken);
  const rr = await fetch(url, { headers: H });
  const rd = await rr.json();
  existing = existing.concat(rd?.data?.items || []);
  pageToken = rd?.data?.has_more ? rd.data.page_token : "";
} while (pageToken);
const byName = new Map(
  existing.map((it) => [txt(it.fields?.["Program Name"]).trim(), it])
);

function newProgramId() {
  return `PR-${Math.floor(1000 + Math.random() * 9000)}`;
}

// Build the Feishu fields object, omitting empties (empty on a Number column
// fails the whole write).
function buildFields(p, programId) {
  const f = {
    "Program ID": programId,
    "Program Name": p.name,
    "Program Name CN": p.nameCn,
    Sport: "Rock Climbing",
    Level: p.level || "",
    Phase: p.phase || "",
    Status: "Active",
    "Product Type": "Digital Program",
    Currency: "CNY",
    "Public Store Visible": true,
    "Store Category": p.listing === "Add-on" ? "Joint Add-Ons" : "Rock Climbing",
    "Store Category CN": p.listing === "Add-on" ? "关节加购" : "攀岩",
    "Store Listing Type": p.listing,
    "Sales Description": p.desc || "",
    "Sales Description CN": p.descCn || "",
  };
  if (p.goal) f.Goal = p.goal;
  if (p.goalCn) f["Goal CN"] = p.goalCn;
  if (p.weeks) f["Duration Weeks"] = p.weeks;
  if (p.perWeek) f["Sessions / Week"] = p.perWeek;
  if (p.price != null) f.Price = p.price;
  if (p.compareAt != null) f["Compare At Price"] = p.compareAt;
  if (p.bundleIds) f["Bundle Program IDs"] = p.bundleIds;
  return f;
}

async function upsert(p) {
  const found = byName.get(p.name.trim());
  const programId = found
    ? txt(found.fields?.["Program ID"]) || newProgramId()
    : newProgramId();
  const fields = buildFields(p, programId);
  if (!APPLY) {
    console.log(
      `[dry] ${found ? "UPDATE" : "CREATE"} "${p.name}" (${programId}) ` +
        `listing=${p.listing} price=${p.price ?? "-"}${p.bundleIds ? ` bundle=[${p.bundleIds}]` : ""}`
    );
    return { programId, recordId: found?.record_id || "(new)" };
  }
  let resp, data;
  if (found) {
    resp = await fetch(`${base}/records/${found.record_id}`, {
      method: "PUT",
      headers: H,
      body: JSON.stringify({ fields }),
    });
  } else {
    resp = await fetch(`${base}/records`, {
      method: "POST",
      headers: H,
      body: JSON.stringify({ fields }),
    });
  }
  data = await resp.json();
  if (data.code !== 0) {
    console.error(`  !! ${p.name}: code=${data.code} ${data.msg}`, JSON.stringify(fields));
    throw new Error(`write failed for ${p.name}`);
  }
  const recordId = data?.data?.record?.record_id || found?.record_id;
  console.log(`  ${found ? "updated" : "created"} "${p.name}" (${programId})`);
  return { programId, recordId };
}

// --- catalog ---
const climbing = [
  {
    name: "Climbing S1 – Foundation",
    nameCn: "攀岩 S1 · 基础",
    level: "Beginner",
    phase: "Season 1",
    weeks: 4,
    perWeek: 3,
    price: 299,
    listing: "Main",
    goal: "Build the base: grip, core, and joint prep for climbing.",
    goalCn: "打基础：握力、核心与关节准备。",
    desc: "Phase 1 of the Elite Climbing series — foundation strength, finger prep and movement quality.",
    descCn: "精英攀岩系列第一阶段——基础力量、手指准备与动作质量。",
  },
  {
    name: "Climbing S2 – Base Strength",
    nameCn: "攀岩 S2 · 基础力量",
    level: "Intermediate",
    phase: "Season 2",
    weeks: 4,
    perWeek: 3,
    price: 299,
    listing: "Main",
    goal: "Add pulling strength and contact strength on the wall.",
    goalCn: "增强上肢拉力与接触力量。",
    desc: "Phase 2 — heavier pulling, hangboard progressions and antagonist balance.",
    descCn: "第二阶段——更大拉力、指力板进阶与拮抗肌平衡。",
  },
  {
    name: "Climbing S3 – Power",
    nameCn: "攀岩 S3 · 爆发力",
    level: "Advanced",
    phase: "Season 3",
    weeks: 4,
    perWeek: 3,
    price: 349,
    listing: "Main",
    goal: "Develop explosive power and dynamic movement.",
    goalCn: "发展爆发力与动态动作。",
    desc: "Phase 3 — power endurance, campus work and dynamic control.",
    descCn: "第三阶段——力量耐力、抱石板与动态控制。",
  },
  {
    name: "Climbing S4 – Performance",
    nameCn: "攀岩 S4 · 表现",
    level: "Advanced",
    phase: "Season 4",
    weeks: 4,
    perWeek: 3,
    price: 349,
    listing: "Main",
    goal: "Peak for your project: performance and recovery.",
    goalCn: "为线路冲刺：表现与恢复。",
    desc: "Phase 4 — peaking, project strategy and recovery management.",
    descCn: "第四阶段——竞技状态、线路策略与恢复管理。",
  },
];

const addon = {
  name: "Climber's Joint Prep",
  nameCn: "攀岩者关节强化",
  level: "All levels",
  weeks: 4,
  perWeek: 2,
  price: 99,
  compareAt: 149,
  listing: "Add-on",
  goal: "Fingers, elbows and shoulders — prehab that keeps you climbing.",
  goalCn: "手指、肘、肩——让你持续攀爬的预防训练。",
  desc: "A joint-specific resilience block to run alongside any climbing program.",
  descCn: "可搭配任意攀岩计划的关节强化模块。",
};

console.log(APPLY ? "=== APPLYING ===" : "=== DRY RUN ===");
const climbResults = [];
for (const c of climbing) climbResults.push(await upsert(c));
await upsert(addon);

const bundle = {
  name: "Elite Climbing – Full Series (S1–S4)",
  nameCn: "精英攀岩 · 全季套餐（S1–S4）",
  level: "All levels",
  phase: "Series",
  weeks: 16,
  perWeek: 3,
  price: 899,
  listing: "Bundle",
  bundleIds: climbResults.map((r) => r.programId).join(","),
  goal: "All four climbing phases in one discounted package.",
  goalCn: "四个攀岩阶段一次性打包，享受优惠。",
  desc: "The complete 16-week climbing journey — Foundation through Performance — at a bundle price.",
  descCn: "完整 16 周攀岩旅程——从基础到竞技——套餐优惠价。",
};
await upsert(bundle);

console.log(
  APPLY
    ? "\nAPPLIED. Bundle members: " + bundle.bundleIds
    : "\nDRY RUN — bundle would include: " + bundle.bundleIds
);
