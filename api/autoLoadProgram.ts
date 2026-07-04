import type { VercelRequest, VercelResponse } from "@vercel/node";
import { invalidateCache } from "./_cache.ts";
import { notifyCoach } from "./_notify.ts";

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { clientRecordId, startDate } = req.body;
  if (!clientRecordId)
    return res.status(400).json({ error: "clientRecordId required" });

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

  try {
    const token = await getToken();
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
    const base = `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables`;

    // 1. Get client to find clientCode/clientId text
    if (!clientsTableId) return res.status(500).json({ error: "FEISHU_CLIENTS_TABLE_ID not set" });
    const clientRes = await fetch(`${base}/${clientsTableId}/records/${clientRecordId}`, { headers });
    const clientData = await clientRes.json();
    const clientFields = clientData?.data?.record?.fields || {};
    const clientCode = fieldToText(clientFields["Client ID"]);
    const clientName = fieldToText(clientFields["Name"]);

    if (!clientCode) return res.status(404).json({ error: "Client not found" });

    // 2. Fetch all orders and find pending ones for this client
    const ordersRes = await fetch(`${base}/${ordersTableId}/records?page_size=500`, { headers });
    const ordersData = await ordersRes.json();
    const allOrders = (ordersData?.data?.items || []) as any[];

    // ALL unloaded orders for this client — a purchase with add-ons creates
    // one order per program, and every one of them must be fulfilled here
    // (previously only the first pending order was loaded).
    const pendingOrders = allOrders.filter((item) => {
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

    if (pendingOrders.length === 0) {
      return res.status(200).json({ success: true, alreadyLoaded: true, message: "No pending program orders found" });
    }

    // 3. Load lookup tables once for all pending orders
    if (!programsTableId) return res.status(500).json({ error: "FEISHU_PROGRAMS_TABLE_ID not set" });
    const progsRes = await fetch(`${base}/${programsTableId}/records?page_size=200`, { headers });
    const progsData = await progsRes.json();
    const allPrograms = (progsData?.data?.items || []) as any[];

    // 4. Fetch program workout templates
    if (!templatesTableId) return res.status(500).json({ error: "FEISHU_WORKOUT_TEMPLATES_TABLE_ID not set" });
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
    if (!assignedWorkoutsTableId) return res.status(500).json({ error: "FEISHU_ASSIGNED_WORKOUTS_TABLE_ID not set" });
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
      void notifyCoach(
        `⚠️ Program load FAILED for ${clientName || clientCode}\n${failedPrograms.join("\n")}`
      );
      return res.status(500).json({
        error: "Could not load program workouts",
        failures: failedPrograms,
      });
    }

    // Update client once with everything that loaded. Access End Date comes
    // from the longest purchased program's "Access Length Days" (0 = no expiry).
    const clientFieldsUpdate: Record<string, any> = {
      Program: loadedPrograms.join(" + "),
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

    invalidateCache("workouts");
    invalidateCache("productOrders");
    invalidateCache("clients");
    invalidateCache("contentAssignments");

    void notifyCoach(
      `📦 Program loaded for ${clientName || clientCode}\n` +
        `Programs: ${loadedPrograms.join(" + ")}\n` +
        `Workouts created: ${totalWorkoutsCreated}` +
        (failedPrograms.length
          ? `\n⚠️ Failed: ${failedPrograms.join("; ")}`
          : "")
    );

    return res.status(200).json({
      success: true,
      programName: loadedPrograms.join(" + "),
      programsLoaded: loadedPrograms,
      ...(failedPrograms.length ? { failures: failedPrograms } : {}),
      workoutsCreated: totalWorkoutsCreated,
      orderStatusUpdated: !anyOrderStatusUpdateFailed,
      startDate: today,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    void notifyCoach(`⚠️ Program auto-load crashed: ${message}`);
    return res.status(500).json({ error: "Auto-load failed", message });
  }
}
