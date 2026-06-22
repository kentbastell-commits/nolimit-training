import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fetchAllBitableRecords } from "./_pagination.ts";
import { getCached, setCached } from "./_cache.ts";

function fieldToText(value: any): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        if (item?.text) return item.text;
        if (item?.name) return item.name;
        if (item?.record_ids) return item.record_ids.join(", ");
        if (item?.link_record_ids) return item.link_record_ids.join(", ");
        return "";
      })
      .join(", ");
  }

  if (value?.text) return value.text;
  if (value?.name) return value.name;
  if (value?.record_ids) return value.record_ids.join(", ");
  if (value?.link_record_ids) return value.link_record_ids.join(", ");

  return "";
}

function normalizeDate(value: any) {
  const text = fieldToText(value);

  if (!text) return "";
  if (/^\d+$/.test(text)) return new Date(Number(text)).toISOString().split("T")[0];

  return text.split("T")[0].split(" ")[0];
}

function normalizeTaskStatus(status?: string) {
  const clean = String(status || "").toLowerCase();

  if (clean.includes("complete")) return "Completed";
  if (clean.includes("miss")) return "Missed";

  return "Scheduled";
}

function getDisplayTaskStatus(status: string, scheduledDate: string, today: string) {
  const normalized = normalizeTaskStatus(status);

  if (normalized === "Scheduled" && scheduledDate && scheduledDate < today) {
    return "Missed";
  }

  return normalized;
}

async function getTenantToken() {
  const response = await fetch(
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
  const data = await response.json();

  if (!data.tenant_access_token) {
    throw new Error(`Could not get tenant token: ${JSON.stringify(data)}`);
  }

  return data.tenant_access_token;
}

async function getRecords(tableId: string, token: string) {
  return fetchAllBitableRecords(
    process.env.FEISHU_BASE_APP_TOKEN as string,
    tableId,
    token
  );
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Derived dashboard over two large table scans; a short TTL keeps the
    // Dashboard snappy without needing to invalidate on every workout write.
    const cachedAnalytics = getCached("analytics");
    if (cachedAnalytics) return res.status(200).json(cachedAnalytics);

    const token = await getTenantToken();
    const [clientRecords, workoutRecords] = await Promise.all([
      getRecords(process.env.FEISHU_CLIENTS_TABLE_ID as string, token),
      getRecords(process.env.FEISHU_ASSIGNED_WORKOUTS_TABLE_ID as string, token),
    ]);

    const clients = clientRecords.map((item: any) => {
      const fields = item.fields || {};
      const name = fieldToText(fields["Full Name"]) || "Unnamed Client";

      return {
        recordId: item.record_id,
        clientId: fieldToText(fields["Client ID"]),
        name,
        status: fieldToText(fields["Package Type"]) || "Active",
        email: fieldToText(fields["Email"]),
        phone: fieldToText(fields["Phone/WeChat"]),
        program: fieldToText(fields["Program ID"]),
        lastCheckIn: normalizeDate(fields["Last Check-in Date"]),
      };
    });

    const workouts = workoutRecords.map((item: any) => {
      const fields = item.fields || {};
      const clientField = fields["Client ID"];

      return {
        recordId: item.record_id,
        clientId: fieldToText(clientField),
        clientRecordIds: Array.isArray(clientField)
          ? clientField.flatMap(
              (x: any) => x?.record_ids || x?.link_record_ids || []
            )
          : [],
        sessionName: fieldToText(fields["Session Name"]),
        scheduledDate: normalizeDate(fields["Scheduled Date"]),
        status: fieldToText(fields["Completion Status"]) || "Scheduled",
      };
    });

    const today = new Date();
    const todayString = today.toISOString().split("T")[0];
    const nextWeekString = addDays(today, 7).toISOString().split("T")[0];
    const weekAgoString = addDays(today, -6).toISOString().split("T")[0];
    const workoutsWithDisplayStatus = workouts.map((workout) => ({
      ...workout,
      displayStatus: getDisplayTaskStatus(
        workout.status,
        workout.scheduledDate,
        todayString
      ),
    }));
    const completedWorkouts = workoutsWithDisplayStatus.filter(
      (workout) => workout.displayStatus === "Completed"
    );
    const missedWorkouts = workoutsWithDisplayStatus.filter(
      (workout) => workout.displayStatus === "Missed"
    );
    const scheduledWorkouts = workoutsWithDisplayStatus.filter(
      (workout) => workout.displayStatus === "Scheduled"
    );
    const upcomingWorkouts = workouts.filter(
      (workout) =>
        workout.scheduledDate >= todayString &&
        workout.scheduledDate <= nextWeekString &&
        normalizeTaskStatus(workout.status) !== "Completed"
    );
    const overdueWorkouts = missedWorkouts;
    const clientsNeedingProgramming = clients.filter(
      (client) => !client.program || client.program === "--"
    );
    const clientsNeedingContact = clients.filter(
      (client) => !client.email && !client.phone
    );
    const attentionClients = clients
      .map((client) => {
        const clientWorkouts = workoutsWithDisplayStatus.filter((workout) =>
          workout.clientId.includes(client.clientId)
        );
        const overdue = overdueWorkouts.filter((workout) =>
          workout.clientId.includes(client.clientId)
        ).length;
        const completed = clientWorkouts.filter(
          (workout) => workout.displayStatus === "Completed"
        ).length;

        return {
          clientId: client.clientId,
          name: client.name,
          status: client.status,
          overdueWorkouts: overdue,
          completedWorkouts: completed,
          totalWorkouts: clientWorkouts.length,
          needsProgram: !client.program || client.program === "--",
          needsContact: !client.email && !client.phone,
        };
      })
      .filter(
        (client) =>
          client.overdueWorkouts > 0 || client.needsProgram || client.needsContact
      )
      .sort((a, b) => b.overdueWorkouts - a.overdueWorkouts)
      .slice(0, 8);

    // Per-client training activity over the last 7 days, for the cross-client
    // Clients list. Match workouts to a client by record-id link (reliable) or
    // by the resolved Client ID code; never match on an empty code.
    const clientActivity = clients.map((client) => {
      const clientWorkouts = workoutsWithDisplayStatus.filter(
        (workout) =>
          workout.clientRecordIds.includes(client.recordId) ||
          (client.clientId && workout.clientId.includes(client.clientId))
      );
      const inWeek = (date: string) =>
        Boolean(date) && date >= weekAgoString && date <= todayString;

      return {
        recordId: client.recordId,
        clientId: client.clientId,
        completed7d: clientWorkouts.filter(
          (workout) =>
            workout.displayStatus === "Completed" && inWeek(workout.scheduledDate)
        ).length,
        scheduled7d: clientWorkouts.filter((workout) =>
          inWeek(workout.scheduledDate)
        ).length,
      };
    });

    const payload = {
      clientActivity,
      summary: {
        totalClients: clients.length,
        activeClients: clients.filter((client) =>
          client.status.toLowerCase().includes("active")
        ).length,
        premiumClients: clients.filter((client) =>
          client.status.toLowerCase().includes("premium")
        ).length,
        needsProgramming: clientsNeedingProgramming.length,
        needsContact: clientsNeedingContact.length,
        totalWorkouts: workouts.length,
        completedWorkouts: completedWorkouts.length,
        missedWorkouts: missedWorkouts.length,
        inProgressWorkouts: 0,
        scheduledWorkouts: scheduledWorkouts.length,
        upcomingWorkouts: upcomingWorkouts.length,
        overdueWorkouts: overdueWorkouts.length,
        completionRate:
          workouts.length > 0
            ? Math.round((completedWorkouts.length / workouts.length) * 100)
            : 0,
      },
      attentionClients,
    };

    setCached("analytics", payload, 3 * 60 * 1000);

    return res.status(200).json(payload);
  } catch (error: any) {
    return res.status(500).json({
      error: "Could not build analytics",
      message: error.message,
    });
  }
}
