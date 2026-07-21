// ⚠️ FROZEN MIRROR GUARD (2026-07-21): nolimit production moved to Postgres.
// This script talks DIRECTLY to Feishu — reads show pre-cutover data, writes
// go where production can never see them. Run only for historical inspection,
// with FEISHU_MIRROR_OK=yes.
if (process.env.FEISHU_MIRROR_OK !== "yes") {
  console.error("Refusing: Feishu is a frozen read-only mirror for nolimit since 2026-07-21 (prod is Postgres). Set FEISHU_MIRROR_OK=yes to override.");
  process.exit(1);
}
// Cutover parity harness: compares production API (Feishu backend) against the
// HK Postgres twin for every read endpoint the apps use. Arrays are matched by
// stable business key; record_id-ish fields are ignored (pg uses business codes
// as ids by design). Run: node parity-check.mjs
const PROD = "https://trainnolimit.com";
const TWIN = "https://trainnolimit.com:8443";

const CLIENTS = ["CL-0001", "CL-0002", "CL-0003"];

const ENDPOINTS = [
  "/api/programs",
  "/api/exercises",
  "/api/clients",
  "/api/formTemplates",
  "/api/testTemplates",
  "/api/testLibrary",
  "/api/reviews",
  "/api/teams",
  "/api/formVideos",
  "/api/analytics",
  "/api/enquiries",
  ...CLIENTS.flatMap((c) => [
    `/api/workouts?clientCode=${c}`,
    `/api/workoutHistory?clientCode=${c}`,
    `/api/checkIns?clientId=${c}`,
    `/api/contentAssignments?clientCode=${c}`,
    `/api/notifications?clientId=${c}`,
    `/api/contentResponses?clientId=${c}`,
  ]),
];

// Fields that legitimately differ between backends: Feishu record ids vs
// business-code ids, and volatile server-side stamps.
// "id" itself is record_id on Feishu vs business code on pg — a designed
// difference, so it's excluded from both comparison and sort keys.
const IGNORE_FIELD = /^(id|recordid|recordids|larkresponse|_cacheage)$/i;
const IGNORE_SUBSTR = /recordid/i;

function normalize(value, keyName = "") {
  if (Array.isArray(value)) {
    const items = value.map((v) => normalize(v));
    // Sort object arrays by best stable key so ordering never counts as a diff.
    if (items.length && typeof items[0] === "object" && items[0] !== null) {
      const keys = ["assignedWorkoutId", "programId", "exerciseId", "clientCode",
        "clientId", "formId", "testId", "assignmentId", "checkInId", "reviewId",
        "teamId", "week", "day", "name", "exerciseName", "submittedDate", "date",
        "scheduledDate", "title"];
      const keyOf = (o) =>
        keys.map((k) => String(o?.[k] ?? "")).join("|") + JSON.stringify(o).length;
      items.sort((a, b) => keyOf(a).localeCompare(keyOf(b)));
    } else {
      items.sort();
    }
    return items;
  }
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (IGNORE_FIELD.test(k) || IGNORE_SUBSTR.test(k)) continue;
      out[k] = normalize(v, k);
    }
    return out;
  }
  // Numeric strings vs numbers ("6" vs 6) are not real differences.
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value.trim();
  return value;
}

function diffPaths(a, b, path = "", out = [], budget = { n: 0 }) {
  if (budget.n > 25) return out;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      out.push(`${path}: array length ${a.length} vs ${b.length}`);
      budget.n++;
    }
    const n = Math.min(a.length, b.length);
    for (let i = 0; i < n; i++) diffPaths(a[i], b[i], `${path}[${i}]`, out, budget);
    return out;
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys)
      diffPaths(a[k], b[k], path ? `${path}.${k}` : k, out, budget);
    return out;
  }
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    out.push(
      `${path}: ${JSON.stringify(a)?.slice(0, 120)} vs ${JSON.stringify(b)?.slice(0, 120)}`
    );
    budget.n++;
  }
  return out;
}

async function fetchJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  const text = await res.text();
  try {
    return { status: res.status, body: JSON.parse(text) };
  } catch {
    return { status: res.status, body: { __nonJson: text.slice(0, 200) } };
  }
}

let pass = 0, fail = 0;
for (const ep of ENDPOINTS) {
  try {
    const [prod, twin] = await Promise.all([
      fetchJson(PROD + ep),
      fetchJson(TWIN + ep),
    ]);
    if (prod.status !== twin.status) {
      fail++;
      console.log(`✗ ${ep}\n    status ${prod.status} vs ${twin.status}`);
      continue;
    }
    const diffs = diffPaths(normalize(prod.body), normalize(twin.body));
    if (diffs.length === 0) {
      pass++;
      console.log(`✓ ${ep}`);
    } else {
      fail++;
      console.log(`✗ ${ep}   (${diffs.length}+ diffs)`);
      diffs.slice(0, 6).forEach((d) => console.log(`    ${d}`));
    }
  } catch (e) {
    fail++;
    console.log(`✗ ${ep}   ERROR ${e.message}`);
  }
}
console.log(`\n${pass} matched, ${fail} differed of ${ENDPOINTS.length}`);
