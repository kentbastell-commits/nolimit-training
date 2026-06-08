import type { VercelRequest, VercelResponse } from "@vercel/node";

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
        return JSON.stringify(item);
      })
      .join(", ");
  }

  if (value?.text) return value.text;
  if (value?.name) return value.name;
  if (value?.record_ids) return value.record_ids.join(", ");
  if (value?.link_record_ids) return value.link_record_ids.join(", ");

  return JSON.stringify(value);
}

function normalizeDate(value: any) {
  const text = fieldToText(value);

  if (!text) return "";
  if (/^\d+$/.test(text)) return new Date(Number(text)).toISOString().split("T")[0];

  return text.split("T")[0].split(" ")[0];
}

async function getTenantToken() {
  const response = await fetch(
    "https://open.larksuite.com/open-apis/auth/v3/tenant_access_token/internal",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_id: process.env.LARK_APP_ID,
        app_secret: process.env.LARK_APP_SECRET,
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
  const response = await fetch(
    `https://open.larksuite.com/open-apis/bitable/v1/apps/${process.env.LARK_BASE_APP_TOKEN}/tables/${tableId}/records?page_size=500`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  const data = await response.json();

  if (!data?.data?.items) {
    throw new Error(`Could not load records: ${JSON.stringify(data)}`);
  }

  return data.data.items;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const token = await getTenantToken();
    const [clientRecords, workoutRecords] = await Promise.all([
      getRecords(process.env.LARK_CLIENTS_TABLE_ID as string, token),
      getRecords(process.env.LARK_ASSIGNED_WORKOUTS_TABLE_ID as string, token),
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

      return {
        recordId: item.record_id,
        clientId: fieldToText(fields["Client ID"]),
        sessionName: fieldToText(fields["Session Name"]),
        scheduledDate: normalizeDate(fields["Scheduled Date"]),
        status: fieldToText(fields["Completion Status"]) || "Scheduled",
      };
    });

    const today = new Date();
    const todayString = today.toISOString().split("T")[0];
    const nextWeekString = addDays(today, 7).toISOString().split("T")[0];
    const completedWorkouts = workouts.filter((workout) =>
      workout.status.toLowerCase().includes("complete")
    );
    const missedWorkouts = workouts.filter((workout) =>
      workout.status.toLowerCase().includes("miss")
    );
    const inProgressWorkouts = workouts.filter((workout) =>
      workout.status.toLowerCase().includes("progress")
    );
    const scheduledWorkouts = workouts.filter((workout) =>
      workout.status.toLowerCase().includes("scheduled")
    );
    const upcomingWorkouts = workouts.filter(
      (workout) =>
        workout.scheduledDate >= todayString &&
        workout.scheduledDate <= nextWeekString &&
        !workout.status.toLowerCase().includes("complete")
    );
    const overdueWorkouts = workouts.filter(
      (workout) =>
        workout.scheduledDate &&
        workout.scheduledDate < todayString &&
        !workout.status.toLowerCase().includes("complete")
    );
    const clientsNeedingProgramming = clients.filter(
      (client) => !client.program || client.program === "--"
    );
    const clientsNeedingContact = clients.filter(
      (client) => !client.email && !client.phone
    );
    const attentionClients = clients
      .map((client) => {
        const clientWorkouts = workouts.filter((workout) =>
          workout.clientId.includes(client.clientId)
        );
        const overdue = overdueWorkouts.filter((workout) =>
          workout.clientId.includes(client.clientId)
        ).length;
        const completed = clientWorkouts.filter((workout) =>
          workout.status.toLowerCase().includes("complete")
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

    return res.status(200).json({
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
        inProgressWorkouts: inProgressWorkouts.length,
        scheduledWorkouts: scheduledWorkouts.length,
        upcomingWorkouts: upcomingWorkouts.length,
        overdueWorkouts: overdueWorkouts.length,
        completionRate:
          workouts.length > 0
            ? Math.round((completedWorkouts.length / workouts.length) * 100)
            : 0,
      },
      attentionClients,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Could not build analytics",
      message: error.message,
    });
  }
}
