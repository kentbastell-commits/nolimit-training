// Feishu impl of autoLoadProgram — logic moved verbatim from
// api/autoLoadProgram.ts. Coach notifications are composed here (the exact
// legacy strings) and returned as `notice`; the thin handler fires them.
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

function fieldToText(value: any): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    const item = value[0];
    if (!item) return "";
    if (typeof item === "string") return item;
    if (item?.text) return item.text;
    if (item?.name) return item.name;
    if (item?.record_ids) return item.record_ids[0] || "";
    return "";
  }
  if (value?.text) return value.text;
  if (value?.name) return value.name;
  return "";
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

async function getToken() {
  const res = await fetch(
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
  const data = await res.json();
  if (!data.tenant_access_token) throw new Error("Could not get Feishu token");
  return data.tenant_access_token as string;
}

export async function autoLoadProgram(
  input: AutoLoadProgramInput
): Promise<AutoLoadProgramResult> {
  const { clientRecordId, startDate } = input;

  const appToken = process.env.FEISHU_BASE_APP_TOKEN;
  const clientsTableId = process.env.FEISHU_CLIENTS_TABLE_ID;
  const ordersTableId = process.env.FEISHU_PRODUCT_ORDERS_TABLE_ID || "tbllinXYFDiUboKX";
  const programsTableId = process.env.FEISHU_PROGRAMS_TABLE_ID;
  const templatesTableId = process.env.FEISHU_WORKOUT_TEMPLATES_TABLE_ID;
  const assignedWorkoutsTableId = process.env.FEISHU_ASSIGNED_WORKOUTS_TABLE_ID;

  // Schedule from the client's chosen start date when given; otherwise from
  // "today" in China time (UTC date lags Asia/Shanghai by 8h — a 6am CST
  // purchase used to date workouts on yesterday).
  const chinaToday = new Date(Date.now() + 8 * 3600 * 1000)
    .toISOString()
    .split("T")[0];
  const today =
    typeof startDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(startDate)
      ? startDate
      : chinaToday;

  const token = await getToken();
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  const base = `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables`;

  // 1. Get client to find clientCode/clientId text
  if (!clientsTableId)
    return { status: 500, body: { error: "FEISHU_CLIENTS_TABLE_ID not set" } };
  const clientRes = await fetch(`${base}/${clientsTableId}/records/${clientRecordId}`, { headers });
  const clientData = await clientRes.json();
  const clientFields = clientData?.data?.record?.fields || {};
  const clientCode = fieldToText(clientFields["Client ID"]);
  // The clients table's name column is "Full Name" ("Name" doesn't exist).
  const clientName =
    fieldToText(clientFields["Full Name"]) || fieldToText(clientFields["Name"]);

  if (!clientCode) return { status: 404, body: { error: "Client not found" } };

  // 2. Fetch all orders and find pending ones for this client
  const ordersRes = await fetch(`${base}/${ordersTableId}/records?page_size=500`, { headers });
  const ordersData = await ordersRes.json();
  const allOrders = (ordersData?.data?.items || []) as any[];

  // ALL unloaded orders for this client — a purchase with add-ons creates
  // one order per program, and every one of them must be fulfilled here
  // (previously only the first pending order was loaded).
  const unloadedOrders = allOrders.filter((item) => {
    const f = item.fields || {};
    const oClientId = fieldToText(f["Client ID"]);
    const oClientName = fieldToText(f["Client Name"]);
    // "Fulfillment Status" is the real column (the old Onboarding/Pipeline
    // names never existed, so every order looked unloaded — letting a repeat
    // intake submission double the calendar).
    const status = fieldToText(f["Fulfillment Status"]);
    const isThisClient = textMatches(oClientId, clientCode) || textMatches(oClientName, clientName);
    const isNotLoaded = !status.toLowerCase().includes("loaded");
    const hasProgramId = Boolean(fieldToText(f["Program ID"]));
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
  const pendingOrders = unloadedOrders.filter((item) => {
    const paymentStatus = fieldToText(item.fields?.["Payment Status"]).trim();
    return /^paid$/i.test(paymentStatus);
  });

  if (pendingOrders.length === 0) {
    const paymentReferences = Array.from(
      new Set(
        unloadedOrders
          .map((item) => fieldToText(item.fields?.["Payment Reference"]).trim())
          .filter(Boolean)
      )
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

  // 3. Load lookup tables once for all pending orders
  if (!programsTableId)
    return { status: 500, body: { error: "FEISHU_PROGRAMS_TABLE_ID not set" } };
  const progsRes = await fetch(`${base}/${programsTableId}/records?page_size=200`, { headers });
  const progsData = await progsRes.json();
  const allPrograms = (progsData?.data?.items || []) as any[];

  // 4. Fetch program workout templates
  if (!templatesTableId)
    return { status: 500, body: { error: "FEISHU_WORKOUT_TEMPLATES_TABLE_ID not set" } };
  // Paginate — the templates table can exceed one page.
  const tmplItems: any[] = [];
  let tmplToken = "";
  do {
    const tu = new URL(`${base}/${templatesTableId}/records`);
    tu.searchParams.set("page_size", "500");
    if (tmplToken) tu.searchParams.set("page_token", tmplToken);
    const tmplRes = await fetch(tu.toString(), { headers });
    const tmplData = await tmplRes.json();
    if (!tmplData?.data?.items) break;
    tmplItems.push(...tmplData.data.items);
    tmplToken = tmplData.data.has_more ? tmplData.data.page_token : "";
  } while (tmplToken);

  // 5+. Fulfil every pending order: resolve its program, filter its
  // templates, schedule and batch-create its workouts, then mark it loaded.
  const loadedPrograms: string[] = [];
  const failedPrograms: string[] = [];
  // Same program bought twice (or duplicate pending orders) must not double
  // the calendar: load once per program record, mark every order fulfilled.
  const loadedProgramRecordIds = new Set<string>();
  let totalWorkoutsCreated = 0;
  let anyOrderStatusUpdateFailed = false;
  let maxAccessLengthDays = 0;

  for (const pendingOrder of pendingOrders) {
    const orderRecordId = pendingOrder.record_id;
    const programIdText = fieldToText(pendingOrder.fields["Program ID"]);
    const programNameText = fieldToText(pendingOrder.fields["Product Name"]);

    const programRecord = allPrograms.find((item: any) => {
      const pid = fieldToText(item.fields?.["Program ID"]);
      const pname = fieldToText(item.fields?.["Program Name"]);
      return textMatches(pid, programIdText) || textMatches(pname, programNameText);
    });

    if (!programRecord) {
      failedPrograms.push(`${programIdText || programNameText}: program not found`);
      continue;
    }
    const programRecordId = programRecord.record_id;
    const programName = fieldToText(programRecord.fields?.["Program Name"]) || programNameText;
    const accessLengthDays =
      Number(fieldToText(programRecord.fields?.["Access Length Days"])) || 0;
    if (accessLengthDays > maxAccessLengthDays) {
      maxAccessLengthDays = accessLengthDays;
    }

    // Already loaded this program in this run — just mark the duplicate order
    // fulfilled so it can't re-fire, without doubling the calendar.
    if (loadedProgramRecordIds.has(programRecordId)) {
      const dupUpdateRes = await fetch(`${base}/${ordersTableId}/records/${orderRecordId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          fields: { "Fulfillment Status": "Program Loaded" },
        }),
      });
      const dupUpdateData = await dupUpdateRes.json();
      if (!dupUpdateRes.ok || dupUpdateData.code !== 0) {
        anyOrderStatusUpdateFailed = true;
      }
      continue;
    }

    const allTemplates = tmplItems.filter((item: any) => {
      const pidField = item.fields?.["Program ID"];
      const tPid = fieldToText(pidField);
      // Newer templates store "Program ID" as a record link, so also match by
      // the program's record id (fieldToText returns the linked record id).
      const linkedIds = Array.isArray(pidField)
        ? pidField.flatMap((o: any) => o?.record_ids || [])
        : [];
      return (
        textMatches(tPid, programIdText) ||
        (programRecordId &&
          (linkedIds.includes(programRecordId) ||
            textMatches(tPid, programRecordId)))
      );
    });

    if (allTemplates.length === 0) {
      failedPrograms.push(`${programName}: no workout sessions found`);
      continue;
    }

    // 5. Build unique sessions (deduplicate by week-day-sessionName)
    const sessionMap = new Map<
      string,
      {
        week: number;
        day: number;
        sessionName: string;
        sessionNameCn: string;
        sessionType: string;
        sessionGoal: string;
        estimatedDuration: string;
        intensity: string;
      }
    >();
    for (const item of allTemplates) {
      const f = item.fields || {};
      const week = Number(fieldToText(f["Week"])) || 1;
      const day = Number(fieldToText(f["Day"])) || 1;
      const sessionName = fieldToText(f["Session Name"]) || "Session";
      const sessionNameCn = fieldToText(f["Session Name CN"]) || sessionName;
      const sessionType = fieldToText(f["Session Type"]) || "Strength";
      const sessionGoal = fieldToText(f["Session Goal"]);
      const estimatedDuration = fieldToText(f["Estimated Duration"]);
      const intensity = fieldToText(f["Intensity"]) || "Moderate";
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

    // 6. Schedule workouts starting today
    const scheduledWorkouts = Array.from(sessionMap.values()).map((session) => {
      const offsetDays = (session.week - 1) * 7 + (session.day - 1) * 2;
      const scheduledDate = addDays(today, offsetDays);
      return { ...session, scheduledDate };
    });

    // 7. Batch create assigned workouts
    if (!assignedWorkoutsTableId)
      return { status: 500, body: { error: "FEISHU_ASSIGNED_WORKOUTS_TABLE_ID not set" } };
    const records = scheduledWorkouts.map(({ week, day, sessionName, sessionNameCn, sessionType, sessionGoal, estimatedDuration, intensity, scheduledDate }) => ({
      fields: {
        "Assigned Workout ID": makeId("AW"),
        "Client ID": [clientRecordId],
        "Program ID": [programRecordId],
        Week: week,
        Day: day,
        "Session Name": sessionName,
        "Session Name CN": sessionNameCn,
        "Session Type": sessionType || "Strength",
        "Session Goal": sessionGoal || "",
        // Number field — omit when empty (Feishu rejects "" for Number).
        "Estimated Duration": Number(estimatedDuration) || undefined,
        Intensity: intensity || "Moderate",
        "Scheduled Date": new Date(`${scheduledDate}T00:00:00`).getTime(),
        // Field is "Completion Status" (the assigned-workouts table has no
        // "Status" column — the old name failed the whole write silently).
        "Completion Status": "Scheduled",
      },
    }));

    const batchRes = await fetch(`${base}/${assignedWorkoutsTableId}/records/batch_create`, {
      method: "POST",
      headers,
      body: JSON.stringify({ records }),
    });
    const batchData = await batchRes.json();
    // The whole point of this handler is to create the athlete's workouts — if
    // that write fails it must be reported, not swallowed (a failed load used
    // to look identical to a good one).
    if (!batchRes.ok || batchData.code !== 0) {
      console.error(
        "autoLoadProgram: assigned-workouts batch_create failed",
        JSON.stringify({ larkResponse: batchData })
      );
      failedPrograms.push(`${programName}: workout creation failed`);
      continue;
    }
    totalWorkoutsCreated += batchData?.data?.records?.length || 0;
    loadedPrograms.push(programName);
    loadedProgramRecordIds.add(programRecordId);

    // Mark this order loaded (best-effort — the workouts already exist, so a
    // failure here shouldn't fail the athlete's load, but it must be surfaced
    // rather than swallowed). This is also the dedup guard for repeat intakes.
    const orderUpdateRes = await fetch(`${base}/${ordersTableId}/records/${orderRecordId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        fields: {
          "Fulfillment Status": "Program Loaded",
          "Access Start Date": new Date(`${today}T00:00:00`).getTime(),
        },
      }),
    });
    const orderUpdateData = await orderUpdateRes.json();
    if (!orderUpdateRes.ok || orderUpdateData.code !== 0) {
      anyOrderStatusUpdateFailed = true;
      console.error(
        "autoLoadProgram: order status update failed (non-fatal)",
        JSON.stringify({ larkResponse: orderUpdateData })
      );
    }
  } // end pending-orders loop

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

  // Update client once with everything that loaded. Access End Date comes
  // from the longest purchased program's "Access Length Days" (0 = no expiry).
  // The clients table has no "Program" text column — the program relation is
  // the "Program ID" DuplexLink (what the coach console displays and what
  // clears the "Needs program" flag). Merge with any existing links so a
  // second purchase never unlinks the first program.
  const existingProgramLinks: string[] = (() => {
    const v: any = clientFields["Program ID"];
    if (Array.isArray(v?.link_record_ids)) return v.link_record_ids;
    if (Array.isArray(v)) {
      return v.flatMap((o: any) =>
        Array.isArray(o?.record_ids) ? o.record_ids : typeof o === "string" ? [o] : []
      );
    }
    return [];
  })();
  const clientFieldsUpdate: Record<string, any> = {
    "Program ID": Array.from(
      new Set([...existingProgramLinks, ...loadedProgramRecordIds])
    ),
    "Intake Status": "Reviewed",
    "Access Start Date": new Date(`${today}T00:00:00`).getTime(),
  };
  if (maxAccessLengthDays > 0) {
    const endDate = addDays(today, Math.max(0, maxAccessLengthDays - 1));
    clientFieldsUpdate["Access End Date"] = new Date(
      `${endDate}T00:00:00`
    ).getTime();
  }
  const clientUpdateRes = await fetch(`${base}/${clientsTableId}/records/${clientRecordId}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ fields: clientFieldsUpdate }),
  });
  const clientUpdateData = await clientUpdateRes.json();
  if (!clientUpdateRes.ok || clientUpdateData.code !== 0) {
    console.error(
      "autoLoadProgram: client program update failed (non-fatal)",
      JSON.stringify({ larkResponse: clientUpdateData })
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
// Logic moved verbatim from api/activateDigitalOrder.ts (store purchase:
// find/create client, one order per cart item, assign the intake form).
// notifyCoach strings are returned in `notices` for the handler to fire.

type TableField = { field_name?: string; name?: string };

async function readResponseJson(response: Response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { code: -1, error: "Non-JSON response", status: response.status, body: text };
  }
}

function normalizeFieldName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Resolve a column by any of its aliases (exact match first, then a
// punctuation/case-insensitive match) so a renamed column never silently drops.
function resolveFieldName(fields: TableField[], aliases: string[]): string | "" {
  const names = fields
    .map((field) => field.field_name || field.name)
    .filter(Boolean) as string[];
  const exact = aliases.find((alias) => names.includes(alias));
  if (exact) return exact;
  const normalizedAliases = aliases.map(normalizeFieldName);
  const match = fields.find((field) => {
    const name = field.field_name || field.name || "";
    return normalizedAliases.includes(normalizeFieldName(name));
  });
  return (match?.field_name || match?.name || "") as string;
}

// Write `value` under whichever real column matches `aliases` — but only when
// it both exists and is non-empty. An empty string on a Number/typed column
// (e.g. Amount) makes Feishu reject the WHOLE record, so empties are dropped.
function applyField(
  tableFields: TableField[],
  fields: Record<string, any>,
  aliases: string[],
  value: any
) {
  if (value === undefined || value === null || value === "") return;
  const name = resolveFieldName(tableFields, aliases);
  if (name) fields[name] = value;
}

// Two-way ("Duplex") link columns (e.g. Client ID, Program ID) reject plain
// strings — Feishu requires an array of the *linked* record_ids.
function applyLink(
  tableFields: TableField[],
  fields: Record<string, any>,
  aliases: string[],
  recordId: any
) {
  if (!recordId) return;
  const name = resolveFieldName(tableFields, aliases);
  if (name) fields[name] = [String(recordId)];
}

async function getTableFieldsOrThrow(
  token: string,
  tableId: string
): Promise<TableField[]> {
  const response = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${tableId}/fields?page_size=100`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await readResponseJson(response);
  if (!response.ok || data.code !== 0) {
    throw new Error(`Could not load fields for ${tableId}: ${JSON.stringify(data)}`);
  }
  return (data?.data?.items || []) as TableField[];
}

function makeShortId(prefix: string) {
  return `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function toLarkDateOrNow(dateStr?: string) {
  if (!dateStr) return Date.now();
  return new Date(`${dateStr}T00:00:00`).getTime();
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

  // Full cart: the main program plus any joint/mobility add-ons bought with it.
  // Each item becomes its own order so autoLoadProgram fulfils every purchase.
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
            programRecordId: item.programRecordId
              ? String(item.programRecordId)
              : undefined,
            programName: item.programName ? String(item.programName) : undefined,
            amount: item.amount,
          }))
      : []),
    // Bundle members: an order each so the buyer owns every included program,
    // but with NO amount — the bundle line above carries the single charge.
    ...(Array.isArray(bundleItems)
      ? bundleItems
          .filter((item: any) => item && item.programId)
          .map((item: any) => ({
            programId: String(item.programId),
            programRecordId: item.programRecordId
              ? String(item.programRecordId)
              : undefined,
            programName: item.programName ? String(item.programName) : undefined,
            amount: undefined,
          }))
      : []),
  ];

  const clientsTableId = process.env.FEISHU_CLIENTS_TABLE_ID;
  const ordersTableId = process.env.FEISHU_PRODUCT_ORDERS_TABLE_ID || "tbllinXYFDiUboKX";
  const formsTableId = process.env.FEISHU_FORM_TEMPLATES_TABLE_ID;
  const assignedFormsTableId = process.env.FEISHU_ASSIGNED_FORMS_TABLE_ID;

  // "Today" in China time — the UTC date lags Asia/Shanghai by 8h.
  const today = new Date(Date.now() + 8 * 3600 * 1000).toISOString().split("T")[0];

  const token = await getToken();
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  const base = `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables`;

  // 1. Find the existing client — the logged-in identity (buyerClientCode)
  // wins over the typed phone: a rebuy must land on the SAME client record,
  // both for the athlete's login and for the referral spent-credit ledger.
  let clientRecordId = "";
  let clientCode = "";
  let existingClientNotes = "";

  if (clientsTableId) {
    const buyerCode = String(input.buyerClientCode || "").trim();
    const lookups = [
      ...(buyerCode ? [`CurrentValue.[Client ID]="${encodeURIComponent(buyerCode)}"`] : []),
      `CurrentValue.[Phone/WeChat]="${encodeURIComponent(phone)}"`,
    ];
    for (const filter of lookups) {
      const searchRes = await fetch(
        `${base}/${clientsTableId}/records?page_size=10&filter=${filter}`,
        { headers }
      );
      const searchData = await searchRes.json();
      const existing = searchData?.data?.items?.[0];
      if (existing) {
        clientRecordId = existing.record_id;
        clientCode =
          fieldToText(existing.fields?.["Client ID"]) ||
          fieldToText(existing.fields?.["client id"]) ||
          makeShortId("CL");
        existingClientNotes = fieldToText(existing.fields?.["Notes"]);
        break;
      }
    }
  }

  // 2. Create client if not found
  if (!clientRecordId && clientsTableId) {
    clientCode = makeShortId("CL");
    const createRes = await fetch(`${base}/${clientsTableId}/records`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        fields: {
          "Full Name": clientName,
          "Phone/WeChat": phone,
          ...(email ? { Email: email } : {}),
          "Client ID": clientCode,
          Source: "Store",
          "Payment Status": "Pending",
          "Intake Status": "Not Sent",
          "Subscription Status": "Active",
          "Client Type": "Digital Program",
          "Coach Assigned": "Kent Bastell",
          "Package Type": "Active",
          // Portal opens in the language the buyer shopped in.
          "Language Preference":
            String(languagePreference || "").toLowerCase() === "english"
              ? "English"
              : "Chinese",
          Notes: consentRecord,
        },
      }),
    });
    const createData = await createRes.json();
    clientRecordId = createData?.data?.record?.record_id || "";
  }

  if (!clientRecordId)
    return { status: 500, body: { error: "Could not create or find client" }, notices };

  await fetch(`${base}/${clientsTableId}/records/${clientRecordId}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      fields: {
        Notes: [existingClientNotes, consentRecord].filter(Boolean).join("\n\n"),
      },
    }),
  });

  // 3. Create one product order per cart item — schema-aware so a missing
  // column or an empty value never silently fails the whole write.
  //
  // Payment Status starts at "Pending": the buyer confirms they paid, and the
  // coach one-tap-verifies against the payment code they put in the WeChat
  // transfer note. The intake portal opens immediately, but autoLoadProgram
  // keeps the paid training plan locked until verification.
  const orderIds: string[] = [];
  let orderId = "";
  let orderPersisted = false;
  let orderError: any = null;
  const orderFieldsSchema = await getTableFieldsOrThrow(token, ordersTableId);

  for (const item of cartItems) {
    try {
      const itemOrderId = makeShortId("ORD");
      const fields: Record<string, any> = {};
      applyField(orderFieldsSchema, fields, ["Order ID", "Order Id"], itemOrderId);
      // Client ID / Program ID are two-way link columns — write linked record
      // ids as arrays, not the human-readable codes.
      applyLink(orderFieldsSchema, fields, ["Client ID", "Client Id"], clientRecordId);
      applyLink(
        orderFieldsSchema,
        fields,
        ["Program ID", "Purchased Program ID", "Purchased Program Id"],
        item.programRecordId
      );
      applyField(
        orderFieldsSchema,
        fields,
        ["Client Name", "Athlete Name", "Member Name"],
        clientName
      );
      applyField(
        orderFieldsSchema,
        fields,
        ["Product Name", "Program Name", "Purchased Program"],
        item.programName
      );
      applyField(
        orderFieldsSchema,
        fields,
        ["Product Type", "Order Type", "Type"],
        "Digital Program"
      );
      // Amount is numeric — only include a real value.
      const amountNum = Number(item.amount);
      if (
        item.amount !== undefined &&
        item.amount !== null &&
        String(item.amount).trim() !== "" &&
        Number.isFinite(amountNum)
      ) {
        applyField(orderFieldsSchema, fields, ["Amount", "Price"], amountNum);
      }
      applyField(orderFieldsSchema, fields, ["Currency"], currency || "CNY");
      applyField(orderFieldsSchema, fields, ["Payment Status", "Payment"], "Pending");
      applyField(
        orderFieldsSchema,
        fields,
        ["Payment Reference", "Payment Ref", "Reference"],
        paymentCode ? String(paymentCode) : ""
      );
      applyField(
        orderFieldsSchema,
        fields,
        ["Payment Provider", "Payment Method", "Provider"],
        "WeChat QR"
      );
      // Referral program: validated by the repository wrapper; only the MAIN
      // cart item carries the discount metadata (add-ons stay full price).
      if (item === cartItems[0] && input.referralMeta?.referrerCode) {
        applyField(orderFieldsSchema, fields, ["Referrer Code"], input.referralMeta.referrerCode);
      }
      if (item === cartItems[0] && input.referralMeta && input.referralMeta.rewardsUsed > 0) {
        applyField(
          orderFieldsSchema,
          fields,
          ["Referral Rewards Used"],
          input.referralMeta.rewardsUsed
        );
      }
      applyField(
        orderFieldsSchema,
        fields,
        ["Intake Status", "Intake", "Questionnaire Status"],
        "Not Sent"
      );
      // Marks the order pending until autoLoadProgram flips it to "Program
      // Loaded" (which is also the dedup guard against double-loading).
      applyField(
        orderFieldsSchema,
        fields,
        ["Fulfillment Status", "Onboarding Status"],
        "New Order"
      );
      applyField(
        orderFieldsSchema,
        fields,
        ["Purchased At", "Purchase Date", "Order Date"],
        toLarkDateOrNow(today) || Date.now()
      );
      applyField(
        orderFieldsSchema,
        fields,
        ["Access Start Date", "Start Date", "Program Start Date"],
        toLarkDateOrNow(today)
      );
      applyField(orderFieldsSchema, fields, ["Notes", "Internal Notes"], consentRecord);

      const orderRes = await fetch(`${base}/${ordersTableId}/records`, {
        method: "POST",
        headers,
        body: JSON.stringify({ fields }),
      });
      const orderData = await readResponseJson(orderRes);
      const itemPersisted = orderRes.ok && orderData?.code === 0;
      if (itemPersisted) {
        orderIds.push(itemOrderId);
        if (!orderId) orderId = itemOrderId; // main order = first cart item
        orderPersisted = true;
      } else {
        orderError = orderData;
        console.error(
          "activateDigitalOrder: order write failed",
          JSON.stringify({ larkResponse: orderData, fieldsSent: fields })
        );
      }
    } catch (orderErr: unknown) {
      orderError = orderErr instanceof Error ? orderErr.message : String(orderErr);
      console.error("activateDigitalOrder: order write threw", orderError);
    }
  } // end cart loop

  // 4. Find intake form template
  let assignmentId = "";
  let intakeAssigned = false;
  if (assignedFormsTableId && formsTableId) {
    let intakeTemplateId = defaultIntakeFormId || "";

    if (!intakeTemplateId) {
      const tmplRes = await fetch(`${base}/${formsTableId}/records?page_size=50`, { headers });
      const tmplData = await tmplRes.json();
      const template = (tmplData?.data?.items || []).find((item: any) => {
        const type = fieldToText(item.fields?.["Type"] || item.fields?.["Template Type"]);
        return type.toLowerCase().includes("intake") || type.toLowerCase().includes("questionnaire");
      });
      if (template) {
        intakeTemplateId =
          fieldToText(template.fields?.["Form ID"]) ||
          fieldToText(template.fields?.["Template ID"]) ||
          template.record_id;
      }
    }

    // 5. Create intake assignment — schema-aware against the REAL Assigned
    // Forms columns, and the response is CHECKED.
    if (intakeTemplateId) {
      assignmentId = makeShortId("FA");
      const assignedFormsSchema = await getTableFieldsOrThrow(token, assignedFormsTableId);
      const assignmentFields: Record<string, any> = {};
      applyField(
        assignedFormsSchema,
        assignmentFields,
        ["Assigned Forms ID", "Assigned Form ID", "Assignment ID"],
        assignmentId
      );
      applyField(
        assignedFormsSchema,
        assignmentFields,
        ["Form ID", "Template ID"],
        String(intakeTemplateId)
      );
      applyField(
        assignedFormsSchema,
        assignmentFields,
        ["Client ID", "Client Id"],
        clientCode
      );
      applyField(
        assignedFormsSchema,
        assignmentFields,
        ["Client Code", "Athlete Code"],
        clientCode
      );
      applyField(
        assignedFormsSchema,
        assignmentFields,
        ["Assigned Date", "Created At"],
        toLarkDateOrNow(today)
      );
      applyField(assignedFormsSchema, assignmentFields, ["Status"], "Assigned");

      const assignRes = await fetch(`${base}/${assignedFormsTableId}/records`, {
        method: "POST",
        headers,
        body: JSON.stringify({ fields: assignmentFields }),
      });
      const assignData = await readResponseJson(assignRes);
      intakeAssigned = assignRes.ok && assignData?.code === 0;
      if (!intakeAssigned) {
        assignmentId = "";
        console.error(
          "activateDigitalOrder: intake assignment failed",
          JSON.stringify({ larkResponse: assignData, fieldsSent: assignmentFields })
        );
        notices.push(
          `⚠️ Intake assignment FAILED for ${clientName} (${clientCode}) — assign it manually from the coach app.`
        );
      }

      // Update client intake status. (No "Program" text column exists on the
      // clients table — writing it made Feishu reject this whole PUT silently.)
      const clientStatusRes = await fetch(
        `${base}/${clientsTableId}/records/${clientRecordId}`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify({
            fields: {
              "Intake Status": intakeAssigned ? "Sent" : "Not Sent",
              "Purchased Program ID": programId,
            },
          }),
        }
      );
      const clientStatusData = await readResponseJson(clientStatusRes);
      if (!clientStatusRes.ok || clientStatusData?.code !== 0) {
        console.error(
          "activateDigitalOrder: client intake-status update failed (non-fatal)",
          JSON.stringify({ larkResponse: clientStatusData })
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
      clientRecordId,
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
// Logic moved verbatim from api/coachingSignup.ts. Coaching has NO program:
// the order carries a term (e.g. "6 Months") as a product name. Two stages:
// "order" (create/find client + pending order) and "intake" (append the
// post-payment questionnaire to the client's Notes, best-effort).

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

  const clientsTableId = process.env.FEISHU_CLIENTS_TABLE_ID;
  const ordersTableId = process.env.FEISHU_PRODUCT_ORDERS_TABLE_ID || "tbllinXYFDiUboKX";
  const base = `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables`;
  // "Today" in China time (UTC lags Asia/Shanghai by 8h).
  const today = new Date(Date.now() + 8 * 3600 * 1000).toISOString().split("T")[0];

  const token = await getToken();
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  // ---- stage "intake": append the post-payment questionnaire to the client ----
  if (stage === "intake") {
    const clientRecordId = String(body.clientRecordId || "");

    // Read current notes so we append rather than overwrite the qualifier.
    let existingNotes = "";
    try {
      const readRes = await fetch(`${base}/${clientsTableId}/records/${clientRecordId}`, { headers });
      const readData = await readResponseJson(readRes);
      existingNotes = fieldToText(readData?.data?.record?.fields?.["Notes"]);
    } catch {
      /* best-effort */
    }

    const merged = [existingNotes, buildIntakeNotes(body)].filter(Boolean).join("\n\n");
    const updateRes = await fetch(`${base}/${clientsTableId}/records/${clientRecordId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        fields: { Notes: merged, "Intake Status": "Received" },
      }),
    });
    const updateData = await readResponseJson(updateRes);
    const ok = updateRes.ok && updateData?.code === 0;
    if (ok) {
      notices.push(
        `📝 Coaching questionnaire received\nClient: ${
          body.clientName || body.clientCode || clientRecordId
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

  // 1. Find existing client by phone / WeChat
  let clientRecordId = "";
  let clientCode = "";
  const searchRes = await fetch(
    `${base}/${clientsTableId}/records?page_size=10&filter=CurrentValue.[Phone/WeChat]="${encodeURIComponent(
      phone
    )}"`,
    { headers }
  );
  const searchData = await searchRes.json();
  const existing = searchData?.data?.items?.[0];
  if (existing) {
    clientRecordId = existing.record_id;
    clientCode = fieldToText(existing.fields?.["Client ID"]) || makeShortId("CL");
  }

  const qualifierNotes = buildQualifierNotes(body);

  // 2. Create the client if new, else update the key fields on the existing one
  if (!clientRecordId) {
    clientCode = makeShortId("CL");
    const createRes = await fetch(`${base}/${clientsTableId}/records`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        fields: {
          "Full Name": clientName,
          "Phone/WeChat": phone,
          "Client ID": clientCode,
          Source: "Store",
          "Payment Status": "Pending",
          "Intake Status": "Not Sent",
          "Subscription Status": "Active",
          "Client Type": "Online Coaching",
          "Coach Assigned": "Kent Bastell",
          "Package Type": termLabel,
          "Language Preference": languagePreference,
          "Start Date": toLarkDateOrNow(body.startDate),
          Notes: qualifierNotes,
        },
      }),
    });
    const createData = await readResponseJson(createRes);
    clientRecordId = createData?.data?.record?.record_id || "";
  } else {
    // Returning athlete buying coaching — refresh the coaching fields and
    // append the new qualifier to their notes.
    const existingNotes = fieldToText(existing.fields?.["Notes"]);
    const merged = [existingNotes, qualifierNotes].filter(Boolean).join("\n\n");
    await fetch(`${base}/${clientsTableId}/records/${clientRecordId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        fields: {
          "Subscription Status": "Active",
          "Client Type": "Online Coaching",
          "Package Type": termLabel,
          Notes: merged,
        },
      }),
    });
  }

  if (!clientRecordId)
    return { status: 500, body: { error: "Could not create or find client" }, notices };

  // 3. Create the coaching order (schema-aware; empties dropped). No Program
  // link — the term rides in Product Name.
  let orderId = "";
  let orderPersisted = false;
  let orderError: any = null;
  try {
    const orderFieldsSchema = await getTableFieldsOrThrow(token, ordersTableId);
    const itemOrderId = makeShortId("ORD");
    const fields: Record<string, any> = {};
    applyField(orderFieldsSchema, fields, ["Order ID", "Order Id"], itemOrderId);
    applyLink(orderFieldsSchema, fields, ["Client ID", "Client Id"], clientRecordId);
    applyField(
      orderFieldsSchema,
      fields,
      ["Client Name", "Athlete Name", "Member Name"],
      clientName
    );
    applyField(
      orderFieldsSchema,
      fields,
      ["Product Name", "Program Name", "Purchased Program"],
      `1:1 Online Coaching — ${termLabel}`
    );
    applyField(
      orderFieldsSchema,
      fields,
      ["Product Type", "Order Type", "Type"],
      "Online Coaching"
    );
    if (
      body.amount !== undefined &&
      body.amount !== null &&
      String(body.amount).trim() !== "" &&
      Number.isFinite(amountNum)
    ) {
      applyField(orderFieldsSchema, fields, ["Amount", "Price"], amountNum);
    }
    applyField(orderFieldsSchema, fields, ["Currency"], currency);
    applyField(orderFieldsSchema, fields, ["Payment Status", "Payment"], "Pending");
    applyField(
      orderFieldsSchema,
      fields,
      ["Payment Reference", "Payment Ref", "Reference"],
      paymentCode
    );
    applyField(
      orderFieldsSchema,
      fields,
      ["Payment Provider", "Payment Method", "Provider"],
      "WeChat QR"
    );
    applyField(
      orderFieldsSchema,
      fields,
      ["Fulfillment Status", "Onboarding Status"],
      "New Order"
    );
    applyField(
      orderFieldsSchema,
      fields,
      ["Purchased At", "Purchase Date", "Order Date"],
      toLarkDateOrNow(today)
    );

    const orderRes = await fetch(`${base}/${ordersTableId}/records`, {
      method: "POST",
      headers,
      body: JSON.stringify({ fields }),
    });
    const orderData = await readResponseJson(orderRes);
    orderPersisted = orderRes.ok && orderData?.code === 0;
    if (orderPersisted) {
      orderId = itemOrderId;
    } else {
      orderError = orderData;
      console.error(
        "coachingSignup: order write failed",
        JSON.stringify({ larkResponse: orderData, fieldsSent: fields })
      );
    }
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
      clientRecordId,
      orderId,
      orderPersisted,
      ...(orderError ? { orderError } : {}),
    },
    notices,
  };
}
