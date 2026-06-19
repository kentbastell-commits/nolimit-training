import { listClients } from "./clients.ts";
import { listWorkouts } from "./workouts.ts";
import type { AnalyticsResult } from "../dto.ts";

// Analytics is a pure aggregation over the clients + workouts repositories, so
// it is automatically backend-agnostic (no separate Feishu/Postgres impl).

function normalizeDate(text: string) {
  if (!text) return "";
  if (/^\d+$/.test(text)) return new Date(Number(text)).toISOString().split("T")[0];
  return text.split("T")[0].split(" ")[0];
}

function normalizeTaskStatus(status?: string) {
  const c = String(status || "").toLowerCase();
  if (c.includes("complete")) return "Completed";
  if (c.includes("miss")) return "Missed";
  return "Scheduled";
}

function getDisplayTaskStatus(status: string, scheduledDate: string, today: string) {
  const n = normalizeTaskStatus(status);
  if (n === "Scheduled" && scheduledDate && scheduledDate < today) return "Missed";
  return n;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export async function getAnalytics(): Promise<AnalyticsResult> {
  const [clientDtos, workoutDtos] = await Promise.all([listClients(), listWorkouts()]);

  const clients = clientDtos.map((c) => ({
    recordId: c.id,
    clientId: c.clientCode,
    name: c.name,
    status: c.status,
    email: c.email,
    phone: c.phone,
    program: c.program,
  }));
  const workouts = workoutDtos.map((w) => ({
    recordId: w.id,
    clientId: w.clientId,
    scheduledDate: normalizeDate(w.scheduledDate),
    status: w.completionStatus || "Scheduled",
  }));

  const today = new Date();
  const todayString = today.toISOString().split("T")[0];
  const nextWeekString = addDays(today, 7).toISOString().split("T")[0];
  const weekAgoString = addDays(today, -6).toISOString().split("T")[0];

  const withStatus = workouts.map((w) => ({
    ...w,
    displayStatus: getDisplayTaskStatus(w.status, w.scheduledDate, todayString),
  }));
  const completed = withStatus.filter((w) => w.displayStatus === "Completed");
  const missed = withStatus.filter((w) => w.displayStatus === "Missed");
  const scheduled = withStatus.filter((w) => w.displayStatus === "Scheduled");
  const upcoming = workouts.filter(
    (w) =>
      w.scheduledDate >= todayString &&
      w.scheduledDate <= nextWeekString &&
      normalizeTaskStatus(w.status) !== "Completed"
  );
  const needsProgramming = clients.filter((c) => !c.program || c.program === "--");
  const needsContact = clients.filter((c) => !c.email && !c.phone);

  const attentionClients = clients
    .map((client) => {
      const cw = withStatus.filter((w) => client.clientId && w.clientId.includes(client.clientId));
      const overdue = missed.filter(
        (w) => client.clientId && w.clientId.includes(client.clientId)
      ).length;
      return {
        clientId: client.clientId,
        name: client.name,
        status: client.status,
        overdueWorkouts: overdue,
        completedWorkouts: cw.filter((w) => w.displayStatus === "Completed").length,
        totalWorkouts: cw.length,
        needsProgram: !client.program || client.program === "--",
        needsContact: !client.email && !client.phone,
      };
    })
    .filter((c) => c.overdueWorkouts > 0 || c.needsProgram || c.needsContact)
    .sort((a, b) => b.overdueWorkouts - a.overdueWorkouts)
    .slice(0, 8);

  const inWeek = (date: string) => Boolean(date) && date >= weekAgoString && date <= todayString;
  const clientActivity = clients.map((client) => {
    const cw = withStatus.filter((w) => client.clientId && w.clientId.includes(client.clientId));
    return {
      recordId: client.recordId,
      clientId: client.clientId,
      completed7d: cw.filter((w) => w.displayStatus === "Completed" && inWeek(w.scheduledDate)).length,
      scheduled7d: cw.filter((w) => inWeek(w.scheduledDate)).length,
    };
  });

  return {
    clientActivity,
    summary: {
      totalClients: clients.length,
      activeClients: clients.filter((c) => c.status.toLowerCase().includes("active")).length,
      premiumClients: clients.filter((c) => c.status.toLowerCase().includes("premium")).length,
      needsProgramming: needsProgramming.length,
      needsContact: needsContact.length,
      totalWorkouts: workouts.length,
      completedWorkouts: completed.length,
      missedWorkouts: missed.length,
      inProgressWorkouts: 0,
      scheduledWorkouts: scheduled.length,
      upcomingWorkouts: upcoming.length,
      overdueWorkouts: missed.length,
      completionRate:
        workouts.length > 0 ? Math.round((completed.length / workouts.length) * 100) : 0,
    },
    attentionClients,
  };
}
