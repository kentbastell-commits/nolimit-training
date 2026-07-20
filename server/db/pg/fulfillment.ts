// Postgres impl of autoLoadProgram. Same flow and result bodies as the Feishu
// impl; on this backend clientRecordId carries the CL-… code and all links are
// business-code columns. One structural difference: pg clients.program_id is a
// single FK (Feishu is a multi-link) — the client's program is set when empty
// and never overwritten, so a second purchase can't unlink the first program.
import { eq } from "drizzle-orm";
import { db } from "../client.ts";
import {
  clients,
  productOrders,
  programs,
  workoutTemplates,
  assignedWorkouts,
  formTemplates,
  assignedForms,
} from "../schema.ts";
import { str } from "./_util.ts";
import type {
  AutoLoadProgramInput,
  AutoLoadProgramResult,
  ActivateDigitalOrderInput,
  CoachingSignupInput,
  SignupResult,
} from "../repositories/fulfillment.ts";

function makeId(prefix: string) {
  return `${prefix}-${Math.floor(100000 + Math.random() * 900000)}`;
}

function normText(v?: string) {
  return String(v || "").toLowerCase().replace(/[^a-z0-9一-鿿]+/gi, " ").trim();
}

function textMatches(a?: string, b?: string) {
  const na = normText(a);
  const nb = normText(b);
  return Boolean(na && nb && (na === nb || na.includes(nb) || nb.includes(na)));
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export async function autoLoadProgram(
  input: AutoLoadProgramInput
): Promise<AutoLoadProgramResult> {
  const { clientRecordId, startDate } = input;

  // Schedule from the client's chosen start date when given; otherwise from
  // "today" in China time (same rule as the Feishu impl).
  const chinaToday = new Date(Date.now() + 8 * 3600 * 1000)
    .toISOString()
    .split("T")[0];
  const today =
    typeof startDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(startDate)
      ? startDate
      : chinaToday;

  // 1. Client by code.
  const clientRows = await db
    .select()
    .from(clients)
    .where(eq(clients.clientId, String(clientRecordId)));
  const client = clientRows[0];
  if (!client) return { status: 404, body: { error: "Client not found" } };
  const clientCode = client.clientId;
  const clientName = str(client.fullName);

  // 2. Unloaded orders for this client.
  const allOrders = await db.select().from(productOrders);
  const unloadedOrders = allOrders.filter((o) => {
    const isThisClient =
      textMatches(str(o.clientId), clientCode) ||
      textMatches(str(o.clientName), clientName);
    const isNotLoaded = !str(o.fulfillmentStatus).toLowerCase().includes("loaded");
    const hasProgramId = Boolean(str(o.programId));
    return isThisClient && isNotLoaded && hasProgramId;
  });

  if (unloadedOrders.length === 0) {
    return {
      status: 200,
      body: { success: true, alreadyLoaded: true, message: "No pending program orders found" },
    };
  }

  // Fulfil only after the coach verifies the WeChat reference. Match the
  // complete value: substring checks would incorrectly treat "Unpaid" as paid.
  const pendingOrders = unloadedOrders.filter((o) =>
    /^paid$/i.test(str(o.paymentStatus).trim())
  );

  if (pendingOrders.length === 0) {
    const paymentReferences = Array.from(
      new Set(unloadedOrders.map((o) => str(o.paymentReference).trim()).filter(Boolean))
    );
    return {
      status: 402,
      body: {
        success: false,
        paymentPending: true,
        error: "Payment verification required",
        message: "Your WeChat payment is still awaiting coach verification.",
        paymentReferences,
      },
    };
  }

  // 3+4. Lookup tables once for all pending orders.
  const allPrograms = await db.select().from(programs);
  const tmplItems = await db.select().from(workoutTemplates);

  const loadedPrograms: string[] = [];
  const failedPrograms: string[] = [];
  const loadedProgramIds = new Set<string>();
  let totalWorkoutsCreated = 0;
  let anyOrderStatusUpdateFailed = false;
  let maxAccessLengthDays = 0;

  for (const pendingOrder of pendingOrders) {
    const programIdText = str(pendingOrder.programId);
    const programNameText = str(pendingOrder.productName);

    const programRecord = allPrograms.find(
      (p) =>
        textMatches(p.programId, programIdText) ||
        textMatches(str(p.name), programNameText)
    );

    if (!programRecord) {
      failedPrograms.push(`${programIdText || programNameText}: program not found`);
      continue;
    }
    const programId = programRecord.programId;
    const programName = str(programRecord.name) || programNameText;
    const accessLengthDays = programRecord.accessLengthDays || 0;
    if (accessLengthDays > maxAccessLengthDays) {
      maxAccessLengthDays = accessLengthDays;
    }

    // Already loaded this program in this run — just mark the duplicate order
    // fulfilled so it can't re-fire, without doubling the calendar.
    if (loadedProgramIds.has(programId)) {
      try {
        await db
          .update(productOrders)
          .set({ fulfillmentStatus: "Program Loaded" })
          .where(eq(productOrders.orderId, pendingOrder.orderId));
      } catch {
        anyOrderStatusUpdateFailed = true;
      }
      continue;
    }

    const allTemplates = tmplItems.filter(
      (t) =>
        textMatches(str(t.programId), programIdText) ||
        (programId && textMatches(str(t.programId), programId))
    );

    if (allTemplates.length === 0) {
      failedPrograms.push(`${programName}: no workout sessions found`);
      continue;
    }

    // 5. Build unique sessions (deduplicate by week-day-sessionName).
    const sessionMap = new Map<
      string,
      {
        week: number;
        day: number;
        sessionName: string;
        sessionNameCn: string;
        sessionType: string;
        sessionGoal: string;
        estimatedDuration: number | null;
        intensity: string;
      }
    >();
    for (const t of allTemplates) {
      const week = t.week || 1;
      const day = t.day || 1;
      const sessionName = str(t.sessionName) || "Session";
      const sessionNameCn = str(t.sessionNameCn) || sessionName;
      const sessionType = str(t.sessionType) || "Strength";
      const sessionGoal = str(t.sessionGoal);
      const estimatedDuration = t.estimatedDuration ?? null;
      const intensity = str(t.intensity) || "Moderate";
      const key = `${week}-${day}-${sessionName}`;
      if (!sessionMap.has(key)) {
        sessionMap.set(key, {
          week,
          day,
          sessionName,
          sessionNameCn,
          sessionType,
          sessionGoal,
          estimatedDuration,
          intensity,
        });
      }
    }

    // 6+7. Schedule from `today` and insert the assigned workouts.
    const rows = Array.from(sessionMap.values()).map((session) => {
      const offsetDays = (session.week - 1) * 7 + (session.day - 1) * 2;
      const scheduledDate = addDays(today, offsetDays);
      return {
        assignedWorkoutId: makeId("AW"),
        clientId: clientCode,
        programId,
        week: session.week,
        day: session.day,
        sessionName: session.sessionName,
        sessionNameCn: session.sessionNameCn,
        sessionType: session.sessionType,
        sessionGoal: session.sessionGoal,
        estimatedDuration: session.estimatedDuration,
        intensity: session.intensity,
        scheduledDate: new Date(`${scheduledDate}T00:00:00`).getTime(),
        completionStatus: "Scheduled",
      };
    });

    try {
      await db.insert(assignedWorkouts).values(rows);
    } catch (e: any) {
      console.error(
        "autoLoadProgram: assigned-workouts insert failed",
        JSON.stringify({ message: e?.message || String(e) })
      );
      failedPrograms.push(`${programName}: workout creation failed`);
      continue;
    }
    totalWorkoutsCreated += rows.length;
    loadedPrograms.push(programName);
    loadedProgramIds.add(programId);

    // Mark this order loaded (best-effort; also the dedup guard for repeats).
    try {
      await db
        .update(productOrders)
        .set({
          fulfillmentStatus: "Program Loaded",
          accessStartDate: new Date(`${today}T00:00:00`).getTime(),
        })
        .where(eq(productOrders.orderId, pendingOrder.orderId));
    } catch (e: any) {
      anyOrderStatusUpdateFailed = true;
      console.error(
        "autoLoadProgram: order status update failed (non-fatal)",
        JSON.stringify({ message: e?.message || String(e) })
      );
    }
  }

  if (loadedPrograms.length === 0) {
    return {
      status: 500,
      body: {
        error: "Could not load program workouts",
        failures: failedPrograms,
      },
      notice: `⚠️ Program load FAILED for ${clientName || clientCode}\n${failedPrograms.join("\n")}`,
    };
  }

  // Update the client once with everything that loaded.
  const clientUpdate: Partial<typeof clients.$inferInsert> = {
    intakeStatus: "Reviewed",
    accessStartDate: new Date(`${today}T00:00:00`).getTime(),
  };
  // Single-FK column: adopt the first loaded program only when none is set.
  if (!client.programId) {
    clientUpdate.programId = Array.from(loadedProgramIds)[0];
  }
  if (maxAccessLengthDays > 0) {
    const endDate = addDays(today, Math.max(0, maxAccessLengthDays - 1));
    clientUpdate.accessEndDate = new Date(`${endDate}T00:00:00`).getTime();
  }
  try {
    await db.update(clients).set(clientUpdate).where(eq(clients.clientId, clientCode));
  } catch (e: any) {
    console.error(
      "autoLoadProgram: client program update failed (non-fatal)",
      JSON.stringify({ message: e?.message || String(e) })
    );
  }

  return {
    status: 200,
    body: {
      success: true,
      programName: loadedPrograms.join(" + "),
      programsLoaded: loadedPrograms,
      ...(failedPrograms.length ? { failures: failedPrograms } : {}),
      workoutsCreated: totalWorkoutsCreated,
      orderStatusUpdated: !anyOrderStatusUpdateFailed,
      startDate: today,
    },
    notice:
      `📦 Program loaded for ${clientName || clientCode}\n` +
      `Programs: ${loadedPrograms.join(" + ")}\n` +
      `Workouts created: ${totalWorkoutsCreated}` +
      (failedPrograms.length ? `\n⚠️ Failed: ${failedPrograms.join("; ")}` : ""),
  };
}

/* -------------------------- activateDigitalOrder -------------------------- */
// Postgres impl of the store purchase. Same flow/bodies/notices as Feishu; the
// business codes ARE the ids, so clientRecordId in the response carries the
// CL-… code and Program links are validated FK columns. The pg orders table
// has no Notes/access-window columns the Feishu alias machinery would probe —
// consent lives on the client row (same place Feishu stores it durably).

function makeShortId(prefix: string) {
  return `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function toEpochOrNow(dateStr?: string) {
  if (!dateStr) return Date.now();
  return new Date(`${dateStr}T00:00:00`).getTime();
}

// CL-XXXX is a PRIMARY KEY here (Feishu had no uniqueness constraint) — remint
// on the rare collision so a signup can't bounce.
async function mintClientCode(): Promise<string> {
  let code = makeShortId("CL");
  for (let attempt = 0; attempt < 5; attempt++) {
    const clash = await db
      .select({ id: clients.clientId })
      .from(clients)
      .where(eq(clients.clientId, code));
    if (!clash.length) break;
    code = makeShortId("CL");
  }
  return code;
}

export async function activateDigitalOrder(
  input: ActivateDigitalOrderInput
): Promise<SignupResult> {
  const {
    clientName,
    phone,
    email,
    programId,
    programRecordId,
    programName,
    amount,
    currency,
    defaultIntakeFormId,
    paymentCode,
    addons,
    bundleItems,
    languagePreference,
    consentVersion,
  } = input;

  const notices: string[] = [];

  const consentRecord = [
    "— CONSENT RECORD —",
    `Privacy / Terms: accepted (${consentVersion || "2026-07-12"})`,
    "Mainland China / Hong Kong processing: separately accepted",
    `Recorded: ${new Date().toISOString()}`,
  ].join("\n");

  // Full cart: main program + add-ons + bundle members (no amount on members).
  const cartItems: Array<{
    programId: string;
    programRecordId?: string;
    programName?: string;
    amount?: unknown;
  }> = [
    { programId, programRecordId, programName, amount },
    ...(Array.isArray(addons)
      ? addons
          .filter((item: any) => item && item.programId)
          .map((item: any) => ({
            programId: String(item.programId),
            programRecordId: item.programRecordId ? String(item.programRecordId) : undefined,
            programName: item.programName ? String(item.programName) : undefined,
            amount: item.amount,
          }))
      : []),
    ...(Array.isArray(bundleItems)
      ? bundleItems
          .filter((item: any) => item && item.programId)
          .map((item: any) => ({
            programId: String(item.programId),
            programRecordId: item.programRecordId ? String(item.programRecordId) : undefined,
            programName: item.programName ? String(item.programName) : undefined,
            amount: undefined,
          }))
      : []),
  ];

  // "Today" in China time — the UTC date lags Asia/Shanghai by 8h.
  const today = new Date(Date.now() + 8 * 3600 * 1000).toISOString().split("T")[0];

  // 1+2. Find existing client by phone, or create one.
  let clientCode = "";
  let existingClientNotes = "";
  const existingRows = await db
    .select()
    .from(clients)
    .where(eq(clients.phone, String(phone)));
  const existing = existingRows[0];

  if (existing) {
    clientCode = existing.clientId;
    existingClientNotes = str(existing.notes);
  } else {
    clientCode = await mintClientCode();
    try {
      await db.insert(clients).values({
        clientId: clientCode,
        fullName: clientName,
        phone: String(phone),
        email: email || null,
        source: "Store",
        paymentStatus: "Pending",
        intakeStatus: "Not Sent",
        subscriptionStatus: "Active",
        clientType: "Digital Program",
        coachAssigned: "Kent Bastell",
        packageType: "Active",
        // Portal opens in the language the buyer shopped in.
        languagePreference:
          String(languagePreference || "").toLowerCase() === "english"
            ? "English"
            : "Chinese",
        notes: consentRecord,
      });
    } catch {
      return { status: 500, body: { error: "Could not create or find client" }, notices };
    }
  }

  await db
    .update(clients)
    .set({ notes: [existingClientNotes, consentRecord].filter(Boolean).join("\n\n") })
    .where(eq(clients.clientId, clientCode));

  // 3. One product order per cart item. Payment Status starts "Pending" —
  // autoLoadProgram keeps the plan locked until the coach verifies the code.
  const orderIds: string[] = [];
  let orderId = "";
  let orderPersisted = false;
  let orderError: any = null;

  for (const item of cartItems) {
    try {
      const itemOrderId = makeShortId("ORD");
      // FK-validated program link; the order still lands without it.
      const programFk =
        item.programRecordId &&
        (
          await db
            .select({ id: programs.programId })
            .from(programs)
            .where(eq(programs.programId, String(item.programRecordId)))
        ).length
          ? String(item.programRecordId)
          : null;

      const amountNum = Number(item.amount);
      const hasAmount =
        item.amount !== undefined &&
        item.amount !== null &&
        String(item.amount).trim() !== "" &&
        Number.isFinite(amountNum);

      await db.insert(productOrders).values({
        orderId: itemOrderId,
        clientId: clientCode,
        clientName,
        productName: item.programName || null,
        productType: "Digital Program",
        programId: programFk,
        amount: hasAmount ? String(amountNum) : null,
        currency: currency || "CNY",
        paymentStatus: "Pending",
        paymentReference: paymentCode ? String(paymentCode) : null,
        paymentProvider: "WeChat QR",
        referrerCode:
          item === cartItems[0] && input.referralMeta?.referrerCode
            ? input.referralMeta.referrerCode
            : null,
        referralRewardsUsed:
          item === cartItems[0] && input.referralMeta && input.referralMeta.rewardsUsed > 0
            ? input.referralMeta.rewardsUsed
            : null,
        intakeStatus: "Not Sent",
        fulfillmentStatus: "New Order",
        purchasedAt: toEpochOrNow(today),
        accessStartDate: toEpochOrNow(today),
      });
      orderIds.push(itemOrderId);
      if (!orderId) orderId = itemOrderId; // main order = first cart item
      orderPersisted = true;
    } catch (orderErr: unknown) {
      orderError = orderErr instanceof Error ? orderErr.message : String(orderErr);
      console.error("activateDigitalOrder: order write threw", orderError);
    }
  }

  // 4+5. Intake form assignment.
  let assignmentId = "";
  let intakeAssigned = false;
  {
    let intakeTemplateId = defaultIntakeFormId || "";
    if (!intakeTemplateId) {
      const templates = await db.select().from(formTemplates);
      const template = templates.find((t) => {
        const type = str(t.type).toLowerCase();
        return type.includes("intake") || type.includes("questionnaire");
      });
      if (template) intakeTemplateId = template.formId;
    }

    if (intakeTemplateId) {
      assignmentId = makeShortId("FA");
      try {
        await db.insert(assignedForms).values({
          assignedFormId: assignmentId,
          formId: intakeTemplateId,
          clientId: clientCode,
          clientCode,
          assignedDate: toEpochOrNow(today),
          status: "Assigned",
        });
        intakeAssigned = true;
      } catch (e: any) {
        assignmentId = "";
        console.error(
          "activateDigitalOrder: intake assignment failed",
          JSON.stringify({ message: e?.message || String(e) })
        );
        notices.push(
          `⚠️ Intake assignment FAILED for ${clientName} (${clientCode}) — assign it manually from the coach app.`
        );
      }

      try {
        await db
          .update(clients)
          .set({
            intakeStatus: intakeAssigned ? "Sent" : "Not Sent",
            purchasedProgramId: programId,
          })
          .where(eq(clients.clientId, clientCode));
      } catch (e: any) {
        console.error(
          "activateDigitalOrder: client intake-status update failed (non-fatal)",
          JSON.stringify({ message: e?.message || String(e) })
        );
      }
    }
  }

  const itemsSummary = cartItems
    .map((item) => item.programName || item.programId)
    .join(" + ");
  notices.push(
    `🛒 New store order\n` +
      `Client: ${clientName} (${clientCode})\n` +
      `Items: ${itemsSummary}\n` +
      `Payment: PENDING — verify code ${paymentCode || "(none)"} in WeChat` +
      (orderPersisted ? "" : `\n⚠️ ORDER WRITE FAILED — check Feishu!`)
  );

  return {
    status: 200,
    body: {
      success: true,
      clientCode,
      clientRecordId: clientCode, // business code is the identity on Postgres
      orderId,
      orderIds,
      orderPersisted,
      ...(orderError ? { orderError } : {}),
      assignmentId,
      intakeAssigned,
    },
    notices,
  };
}

/* ------------------------------ coachingSignup ----------------------------- */

function buildQualifierNotes(body: any): string {
  const lines = [
    "— 1:1 COACHING SIGNUP —",
    `Term: ${body.termLabel || "—"}`,
    `Sport: ${body.sport || "—"}`,
    `Preferred start: ${body.startDate || "—"}`,
    `Primary goal: ${body.goal || "—"}`,
    "",
    "— CONSENT RECORD —",
    `Privacy / Terms: accepted (${body.consentVersion || "2026-07-12"})`,
    "Mainland China / Hong Kong processing: separately accepted",
    `Recorded: ${new Date().toISOString()}`,
  ];
  return lines.join("\n");
}

function buildIntakeNotes(body: any): string {
  const lines = [
    "— TRAINING QUESTIONNAIRE —",
    `Training age: ${body.trainingAge || "—"}`,
    `Position / focus: ${body.position || "—"}`,
    `Days per week: ${body.days || "—"}`,
    `Next competition: ${body.compDate || "—"}`,
    `Injuries / limitations: ${body.injuries || "—"}`,
    `Equipment / gym: ${body.equipment || "—"}`,
    `Other notes: ${body.notes || "—"}`,
    "",
    "— SENSITIVE INFORMATION CONSENT —",
    `Health / injury information: ${body.healthConsent ? "separately accepted" : "not provided"}`,
    `Policy version: ${body.consentVersion || "2026-07-12"}`,
    `Recorded: ${new Date().toISOString()}`,
  ];
  return lines.join("\n");
}

export async function coachingSignup(body: CoachingSignupInput): Promise<SignupResult> {
  const stage = body.stage === "intake" ? "intake" : "order";
  const notices: string[] = [];
  const today = new Date(Date.now() + 8 * 3600 * 1000).toISOString().split("T")[0];

  // ---- stage "intake": append the post-payment questionnaire to the client ----
  if (stage === "intake") {
    const clientCode = String(body.clientRecordId || "");
    const rows = await db.select().from(clients).where(eq(clients.clientId, clientCode));
    const client = rows[0];
    let ok = false;
    if (client) {
      const merged = [str(client.notes), buildIntakeNotes(body)]
        .filter(Boolean)
        .join("\n\n");
      const updated = await db
        .update(clients)
        .set({ notes: merged, intakeStatus: "Received" })
        .where(eq(clients.clientId, clientCode))
        .returning({ id: clients.clientId });
      ok = updated.length > 0;
    }
    if (ok) {
      notices.push(
        `📝 Coaching questionnaire received\nClient: ${
          body.clientName || body.clientCode || clientCode
        }`
      );
    }
    return { status: 200, body: { success: ok }, notices };
  }

  // ---- stage "order": create/find client + write the pending coaching order ----
  const clientName = String(body.clientName || "").trim();
  const phone = String(body.phone || "").trim();
  const termLabel = String(body.termLabel || "").trim();
  const amountNum = Number(body.amount);

  const languagePreference =
    String(body.languagePreference || "").toLowerCase() === "chinese"
      ? "Chinese"
      : "English";
  const currency = String(body.currency || "CNY");
  const paymentCode = body.paymentCode ? String(body.paymentCode).trim() : "";

  // 1+2. Find existing client by phone, create or refresh.
  let clientCode = "";
  const existingRows = await db.select().from(clients).where(eq(clients.phone, phone));
  const existing = existingRows[0];
  const qualifierNotes = buildQualifierNotes(body);

  if (existing) {
    clientCode = existing.clientId;
    // Returning athlete buying coaching — refresh the coaching fields and
    // append the new qualifier to their notes.
    const merged = [str(existing.notes), qualifierNotes].filter(Boolean).join("\n\n");
    await db
      .update(clients)
      .set({
        subscriptionStatus: "Active",
        clientType: "Online Coaching",
        packageType: termLabel,
        notes: merged,
      })
      .where(eq(clients.clientId, clientCode));
  } else {
    clientCode = await mintClientCode();
    try {
      await db.insert(clients).values({
        clientId: clientCode,
        fullName: clientName,
        phone,
        source: "Store",
        paymentStatus: "Pending",
        intakeStatus: "Not Sent",
        subscriptionStatus: "Active",
        clientType: "Online Coaching",
        coachAssigned: "Kent Bastell",
        packageType: termLabel,
        languagePreference,
        startDate: toEpochOrNow(body.startDate),
        notes: qualifierNotes,
      });
    } catch {
      return { status: 500, body: { error: "Could not create or find client" }, notices };
    }
  }

  // 3. The coaching order — no Program link, the term rides in Product Name.
  let orderId = "";
  let orderPersisted = false;
  let orderError: any = null;
  try {
    const itemOrderId = makeShortId("ORD");
    const hasAmount =
      body.amount !== undefined &&
      body.amount !== null &&
      String(body.amount).trim() !== "" &&
      Number.isFinite(amountNum);
    await db.insert(productOrders).values({
      orderId: itemOrderId,
      clientId: clientCode,
      clientName,
      productName: `1:1 Online Coaching — ${termLabel}`,
      productType: "Online Coaching",
      amount: hasAmount ? String(amountNum) : null,
      currency,
      paymentStatus: "Pending",
      paymentReference: paymentCode || null,
      paymentProvider: "WeChat QR",
      fulfillmentStatus: "New Order",
      purchasedAt: toEpochOrNow(today),
    });
    orderPersisted = true;
    orderId = itemOrderId;
  } catch (orderErr: unknown) {
    orderError = orderErr instanceof Error ? orderErr.message : String(orderErr);
    console.error("coachingSignup: order write threw", orderError);
  }

  notices.push(
    `⭐ New 1:1 coaching signup\n` +
      `Client: ${clientName} (${clientCode})\n` +
      `Term: ${termLabel} · ${currency} ${
        Number.isFinite(amountNum) ? amountNum.toLocaleString() : "—"
      }\n` +
      `Sport: ${body.sport || "—"}\n` +
      `Payment: PENDING — verify code ${paymentCode || "(none)"} in WeChat` +
      (orderPersisted ? "" : `\n⚠️ ORDER WRITE FAILED — check Feishu!`)
  );

  return {
    status: 200,
    body: {
      success: true,
      clientCode,
      clientRecordId: clientCode,
      orderId,
      orderPersisted,
      ...(orderError ? { orderError } : {}),
    },
    notices,
  };
}
