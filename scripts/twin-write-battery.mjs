// Write-path battery: drives every converted write flow end-to-end against a
// Postgres twin and asserts wire contracts + read-back state. The unit suite
// pins each handler's legacy responses; THIS proves the whole chain against a
// real database — order → payment gate → fulfilment → logging → check-in →
// review → forms → videos → coaching signup → cascade delete.
//
//   node scripts/twin-write-battery.mjs                 (HK twin, default)
//   BATTERY_BASE=http://127.0.0.1:3101 node scripts/twin-write-battery.mjs
//
// Refuses to run against production (no --allow-prod flag exists on purpose:
// point it at a twin). Twin data is throwaway; the battery also cascade-deletes
// its own client at the end.
const BASE = process.env.BATTERY_BASE || "https://trainnolimit.com:8443";
if (/^https:\/\/(www\.)?trainnolimit\.com\/?$/.test(BASE) || /trainnolimit\.cn/.test(BASE)) {
  // .cn becomes production at cutover; run the battery there ONLY before DNS.
  if (!process.argv.includes("--i-know-this-is-preprod")) {
    console.error(`Refusing to run write battery against ${BASE} — that looks like production.`);
    process.exit(2);
  }
}

const suffix = Date.now();
const NAME = `Battery Test ${suffix}`;
const PHONE = `19${String(suffix).slice(-9)}`;
const NAME2 = `Battery Coaching ${suffix}`;
const PHONE2 = `18${String(suffix).slice(-9)}`;
const today = new Date().toISOString().split("T")[0];

const results = [];
let ctx = {};

async function call(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(45000),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { __raw: text.slice(0, 200) }; }
  return { status: res.status, body: json };
}

async function step(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, ok: true });
    console.log(`✓ ${name}${detail ? `  (${detail})` : ""}`);
  } catch (e) {
    results.push({ name, ok: false, err: e.message });
    console.log(`✗ ${name}\n    ${e.message}`);
  }
}

const assert = (cond, msg, got) => {
  if (!cond) throw new Error(`${msg}${got !== undefined ? ` — got: ${JSON.stringify(got).slice(0, 300)}` : ""}`);
};

function mintPayCode() {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let c = "";
  for (let i = 0; i < 4; i++) c += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `NL-${c}`;
}

console.log(`Write battery vs ${BASE}\nclient: ${NAME} / ${PHONE}\n`);

/* ---------- A. store purchase, payment gate, fulfilment ---------- */

await step("pick a store program that has built sessions", async () => {
  const r = await call("GET", "/api/programs");
  assert(r.status === 200 && Array.isArray(r.body.programs), "programs list", r.body);
  const candidates = r.body.programs.filter(
    (x) => x.publicStoreVisible && Number(x.price) > 0 &&
      !/addon|add-on|bundle/i.test(`${x.storeListingType} ${x.productType}`)
  );
  assert(candidates.length, "no visible non-addon program with a price");
  const empty = [];
  const withSessions = async (p) => {
    const t = await call("GET", `/api/programTemplates?programId=${encodeURIComponent(p.programId)}`);
    return (t.body.templates || []).length > 0;
  };
  for (const p of candidates) {
    if (await withSessions(p)) { ctx.program = p; break; }
    empty.push(p.programId);
  }
  // A store listing with no sessions means a buyer pays and fulfilment fails —
  // surface it loudly, then fall back to ANY program with sessions so the
  // pipeline itself still gets exercised.
  if (empty.length) console.log(`    ⚠ store-visible but NO sessions: ${empty.join(", ")}`);
  if (!ctx.program) {
    for (const p of r.body.programs) {
      if (Number(p.price) > 0 || !p.programId) continue;
      if (await withSessions(p)) {
        ctx.program = { ...p, price: p.price || "0" };
        console.log(`    (fell back to non-store program ${p.programId})`);
        break;
      }
    }
  }
  if (!ctx.program) {
    for (const p of r.body.programs) {
      if (await withSessions(p)) {
        ctx.program = p;
        console.log(`    (fell back to ${p.programId})`);
        break;
      }
    }
  }
  assert(ctx.program, "no program anywhere has sessions");
  return ctx.program.programId;
});

await step("activateDigitalOrder creates Pending order + client", async () => {
  const r = await call("POST", "/api/activateDigitalOrder", {
    clientName: NAME,
    phone: PHONE,
    programId: ctx.program.programId,
    programRecordId: ctx.program.recordId,
    programName: ctx.program.programName,
    amount: Number(ctx.program.price) || undefined,
    currency: ctx.program.currency || "CNY",
    defaultIntakeFormId: ctx.program.defaultIntakeFormId || "",
    paymentCode: mintPayCode(),
    languagePreference: "English",
    privacyAccepted: true,
    crossBorderAccepted: true,
    consentVersion: "battery",
  });
  assert(r.status === 200 && r.body.success === true, "activate response", r.body);
  assert(/^CL-/.test(r.body.clientCode || ""), "clientCode shape", r.body);
  assert(r.body.orderPersisted === true, "orderPersisted", r.body);
  ctx.clientCode = r.body.clientCode;
  ctx.clientRecordId = r.body.clientRecordId;
  return ctx.clientCode;
});

await step("order is Pending (buyer-claim must NOT unlock)", async () => {
  const r = await call("GET", "/api/productOrders");
  assert(r.status === 200, "orders list", r.body);
  const order = (r.body.orders || []).find(
    (o) => o.clientCode === ctx.clientCode || String(o.clientId || "").includes(ctx.clientCode)
  );
  assert(order, "battery order found");
  assert(/pending/i.test(String(order.paymentStatus)), "paymentStatus Pending", order.paymentStatus);
  ctx.orderId = order.recordId || order.orderId;
});

await step("autoLoadProgram refuses before payment verified", async () => {
  const r = await call("POST", "/api/autoLoadProgram", { clientRecordId: ctx.clientRecordId });
  const loaded = r.status === 200 && r.body.loaded === true;
  assert(!loaded, "gate held", r.body);
  const w = await call("GET", `/api/workouts?clientCode=${ctx.clientCode}`);
  assert((w.body.workouts || []).length === 0, "no workouts before Paid", w.body.workouts?.length);
});

await step("coach verifies payment (updateProductOrder → Paid)", async () => {
  const r = await call("POST", "/api/updateProductOrder", {
    recordId: ctx.orderId,
    paymentStatus: "Paid",
  });
  assert(r.status === 200, "update order", r.body);
});

await step("autoLoadProgram loads the program after Paid", async () => {
  const r = await call("POST", "/api/autoLoadProgram", {
    clientRecordId: ctx.clientRecordId,
    startDate: today,
  });
  assert(r.status === 200, "autoload response", r.body);
  const w = await call("GET", `/api/workouts?clientCode=${ctx.clientCode}`);
  assert((w.body.workouts || []).length > 0, "workouts assigned", w.body);
  ctx.workout = w.body.workouts[0];
  return `${w.body.workouts.length} workouts`;
});

await step("findMyPortal finds the new client by phone+name", async () => {
  const r = await call("POST", "/api/findMyPortal", { phone: PHONE, name: NAME });
  assert(r.status === 200 && r.body.clientCode === ctx.clientCode, "portal lookup", r.body);
});

/* ---------- B. the training loop ---------- */

await step("saveWorkoutLog writes a session", async () => {
  const w = ctx.workout;
  const d = await call(
    "GET",
    `/api/workoutDetails?programId=${encodeURIComponent(w.programId)}&week=${encodeURIComponent(w.week)}&day=${encodeURIComponent(w.day)}`
  );
  const ex = (d.body.exercises || [])[0];
  assert(ex, "workout has exercises", d.body);
  ctx.exerciseName = ex.exerciseName;
  const r = await call("POST", "/api/saveWorkoutLog", {
    clientId: ctx.clientCode,
    clientCode: ctx.clientCode,
    assignedWorkoutRecordId: w.id,
    assignedWorkoutId: w.assignedWorkoutId,
    workoutDate: today,
    submissionNote: "battery note for coach",
    sessionRpe: 7,
    sessionDurationMin: 45,
    logs: [
      {
        exerciseId: ex.exerciseId || undefined,
        exerciseName: ex.exerciseName,
        setNumber: 1,
        prescribedReps: ex.reps || "5",
        actualReps: 5,
        actualWeight: 42.5,
        completed: true,
        exerciseOrder: 1,
      },
    ],
  });
  assert(r.status === 200 && r.body.success === true, "save log", r.body);
  assert(Number(r.body.recordsCreated) >= 1, "recordsCreated", r.body);
});

await step("workoutHistory reflects the log", async () => {
  const r = await call("GET", `/api/workoutHistory?clientCode=${ctx.clientCode}`);
  const h = (r.body.history || []).find((x) => x.exerciseName === ctx.exerciseName);
  assert(h && String(h.lastWeight) === "42.5", "history row", r.body.history);
});

await step("check-in create + coach review round-trip", async () => {
  const c = await call("POST", "/api/checkIns", {
    clientId: ctx.clientCode,
    submittedDate: today,
    sleepQuality: 8, energy: 7, mood: 8, soreness: 3, stress: 2,
    sleepHours: 7.5, readinessScore: 76,
    wins: "battery wins",
  });
  assert(c.status === 200 && c.body.success === true, "create check-in", c.body);
  const rev = await call("POST", "/api/checkIns", {
    recordId: c.body.recordId,
    clientId: ctx.clientCode,
    coachResponse: "battery coach reply",
  });
  assert(rev.status === 200 && rev.body.success === true, "review check-in", rev.body);
  const list = await call("GET", `/api/checkIns?clientId=${ctx.clientCode}`);
  const mine = (list.body.checkIns || []).find((x) => x.recordId === c.body.recordId);
  assert(mine && mine.coachResponse === "battery coach reply", "reply visible", mine);
});

await step("form video note + coach reply round-trip", async () => {
  const v = await call("POST", "/api/formVideos", {
    clientId: ctx.clientCode,
    clientName: NAME,
    exerciseName: ctx.exerciseName,
    note: "battery form note",
  });
  assert(v.status === 200 && v.body.success === true, "create video note", v.body);
  const rep = await call("PUT", "/api/formVideos", {
    recordId: v.body.videoId,
    coachReply: "battery video reply",
    status: "Reviewed",
  });
  assert(rep.status === 200 && rep.body.success === true, "coach reply", rep.body);
  const list = await call("GET", "/api/formVideos");
  const mine = (list.body.videos || []).find((x) => x.clientId === ctx.clientCode);
  assert(mine && mine.coachReply === "battery video reply", "reply visible", mine);
});

await step("workload log (sRPE diary) write", async () => {
  const r = await call("POST", "/api/saveWorkloadLog", {
    clientId: ctx.clientCode,
    date: today,
    cardioRpe: 6,
    cardioMin: 30,
    notes: "battery workload",
  });
  assert(r.status === 200 && r.body.success === true, "workload save", r.body);
});

/* ---------- C. forms: assign → submit → completed ---------- */

await step("assignContent + submitContentResponse completes the form", async () => {
  const forms = await call("GET", "/api/formTemplates");
  const form = (forms.body.forms || []).find((f) => (f.questions || []).length > 0);
  assert(form, "a form template with questions exists");
  const a = await call("POST", "/api/assignContent", {
    assignmentType: "Questionnaire",
    templateId: form.formId,
    templateName: form.name,
    clientId: ctx.clientRecordId,
    clientCode: ctx.clientCode,
    clientName: NAME,
    assignedDate: today,
  });
  assert(a.status === 200 && a.body.success === true, "assign form", a.body);
  const listed = await call("GET", `/api/contentAssignments?clientCode=${ctx.clientCode}`);
  const mine = (listed.body.assignments || []).find(
    (x) => x.templateId === form.formId && !/completed/i.test(x.status)
  );
  assert(mine, "assignment listed", listed.body.assignments);
  assert(/^AF-/.test(mine.assignmentId), "assignment has an AF- code (alias fix)", mine.assignmentId);
  const sub = await call("POST", "/api/submitContentResponse", {
    assignmentType: "Questionnaire",
    assignmentId: mine.assignmentId,
    assignmentRecordId: mine.recordId,
    templateId: form.formId,
    clientId: ctx.clientCode,
    clientName: NAME,
    responses: form.questions.map((q) => ({
      questionId: q.questionId,
      label: q.label,
      value: "battery answer",
    })),
  });
  assert(sub.status === 200 && sub.body.success === true, "submit response", sub.body);
  const after = await call("GET", `/api/contentAssignments?clientCode=${ctx.clientCode}`);
  const done = (after.body.assignments || []).find((x) => x.recordId === mine.recordId);
  assert(done && /completed/i.test(done.status), "assignment Completed", done);
  const resp = await call("GET", `/api/contentResponses?clientId=${ctx.clientCode}`);
  assert((resp.body.responses || []).length > 0, "response readable", resp.body);
});

/* ---------- D. the rest of the write surface ---------- */

await step("review, notification, enquiry writes", async () => {
  const rev = await call("POST", "/api/reviews", {
    clientId: ctx.clientCode, clientName: NAME,
    programId: ctx.program.programId, programName: ctx.program.programName,
    rating: 5, quote: "battery review",
  });
  assert(rev.status === 200, "review", rev.body);
  const n = await call("POST", "/api/notifications", {
    clientId: ctx.clientCode, title: "battery notification", body: "hello", type: "general",
  });
  assert(n.status === 200 && n.body.success === true, "notification", n.body);
  const e = await call("POST", "/api/inPersonEnquiry", {
    contactPerson: NAME, contact: PHONE, organization: "Battery Org",
    athletes: "5", notes: "battery enquiry",
    privacyAccepted: true, crossBorderAccepted: true,
  });
  assert(e.status === 200 && e.body.success === true, "enquiry", e.body);
});

await step("coachingSignup order + intake stages", async () => {
  const o = await call("POST", "/api/coachingSignup", {
    stage: "order",
    clientName: NAME2, phone: PHONE2,
    termLabel: "1 Month", months: 1, amount: 2500, currency: "CNY",
    paymentCode: mintPayCode(), languagePreference: "English",
    sport: "Climbing", goal: "battery goal",
    privacyAccepted: true, crossBorderAccepted: true, consentVersion: "battery",
  });
  assert(o.status === 200 && o.body.success === true, "signup order", o.body);
  ctx.coachingRecordId = o.body.clientRecordId;
  ctx.coachingCode = o.body.clientCode;
  const i = await call("POST", "/api/coachingSignup", {
    stage: "intake",
    clientRecordId: ctx.coachingRecordId,
    clientName: NAME2,
    trainingAge: "3 years", days: "4", equipment: "full gym",
    healthConsent: true, consentVersion: "battery",
  });
  assert(i.status === 200 && i.body.success === true, "signup intake", i.body);
});

await step("wxAuth contract (503 unconfigured / 401 bad code)", async () => {
  const r = await call("POST", "/api/wxAuth", { code: "battery" });
  const unconfigured =
    r.status === 503 && /not configured/i.test(r.body.error || "");
  // With real WECHAT_MINI_* creds (live since 2026-07-21), WeChat itself
  // rejects the fake code — the endpoint must surface that as a 401.
  const configuredBadCode =
    r.status === 401 && /login failed/i.test(r.body.error || "");
  assert(unconfigured || configuredBadCode, "wxAuth 503-or-401", r);
});

/* ---------- E. cascade delete cleans up ---------- */

await step("deleteRecord client cascade removes battery data", async () => {
  for (const [code] of [[ctx.clientCode], [ctx.coachingCode]]) {
    if (!code) continue;
    const clients = await call("GET", "/api/clients");
    const me = (clients.body.clients || []).find((c) => c.clientCode === code || c.id === code);
    assert(me, `client ${code} listed before delete`);
    const del = await call("POST", "/api/deleteRecord", {
      resource: "client",
      recordId: me.recordId || me.id,
      clientCode: code,
    });
    assert(del.status === 200 && del.body.success === true, `delete ${code}`, del.body);
  }
  const w = await call("GET", `/api/workouts?clientCode=${ctx.clientCode}`);
  assert((w.body.workouts || []).length === 0, "workouts gone after cascade", w.body.workouts?.length);
});

/* ---------- summary ---------- */

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} steps passed`);
if (failed.length) {
  failed.forEach((f) => console.log(`  FAILED: ${f.name}`));
  process.exit(1);
}
