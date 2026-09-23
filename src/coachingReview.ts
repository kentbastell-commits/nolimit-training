// Shared coaching facts and queue identity. No login-derived training signals.
/* eslint-disable @typescript-eslint/no-explicit-any */
export type ReviewKind = "message" | "comment" | "checkin" | "video" | "submission" | "workout" | "coverage" | "missed" | "order" | "enquiry";
export type CoachingItem = { key: string; revision: string; kind: ReviewKind; clientId: string; clientName: string; title: string; date: string; source: any; priority: number; sourceDone?: boolean };
export type ReviewDecision = { key: string; revision: string; status: "open" | "resolved" | "snoozed"; until: number | null; version: number; updatedAt: number; item: Omit<CoachingItem, "source">; note: string };
export function coachingDate(value: unknown): string {
  if (!value) return "";
  const str = String(value);
  const date = /^\d{10,}$/.test(str) ? new Date(Number(str)) : /^\d{4}-\d{2}-\d{2}$/.test(str) ? null : new Date(str);
  if (!date) return str;
  if (!Number.isFinite(date.getTime())) return "";
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
}
export const coachingToday = () => coachingDate(Date.now());
export const daysBetween = (a: string, b: string) => Math.floor((Date.parse(b) - Date.parse(a)) / 86400000);
export const belongsTo = (row: any, client: any) => [client.clientCode, client.id].filter(Boolean).some(id => String(row.clientId || "").split(/[,\s[\]"']+/).includes(id));
export const coachingPaused = (c: any) => /paused|archived|inactive/i.test(c.status || "");
export const completed = (w: any) => /^completed$/i.test(w.completionStatus || "");
export const cancelled = (w: any) => /cancelled|canceled|archived/i.test(w.completionStatus || "");

export function athleteFacts(client: any, workouts: any[], checkIns: any[] = [], today = coachingToday()) {
  const own = workouts.filter(w => belongsTo(w, client) && !cancelled(w));
  const done = own.filter(w => completed(w) && coachingDate(w.scheduledDate) <= today)
    .sort((a, b) => coachingDate(b.scheduledDate).localeCompare(coachingDate(a.scheduledDate)));
  const future = own.filter(w => !completed(w) && coachingDate(w.scheduledDate) >= today)
    .sort((a, b) => coachingDate(a.scheduledDate).localeCompare(coachingDate(b.scheduledDate)));
  const checks = checkIns.filter(c => belongsTo(c, client)).sort((a, b) => coachingDate(b.submittedDate).localeCompare(coachingDate(a.submittedDate)));
  const lastCompleted = done[0] ? coachingDate(done[0].scheduledDate) : null;
  const lastActivity = [lastCompleted, ...checks.map(c => coachingDate(c.submittedDate)).filter(d => d <= today)].filter(Boolean).sort().at(-1) || null;
  const end = future.length ? coachingDate(future.at(-1).scheduledDate) : null;
  const monday = new Date(`${today}T12:00:00Z`); monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7);
  const due = own.filter(w => coachingDate(w.scheduledDate) >= monday.toISOString().slice(0, 10) && coachingDate(w.scheduledDate) <= today);
  const paused = coachingPaused(client);
  return { done, checks, latest: done[0], checkIn: checks[0], previousCheckIn: checks[1], next: future[0], future, end, lastCompleted, lastActivity,
    compliance: !paused && due.length ? Math.round(due.filter(completed).length / due.length * 100) : null,
    inactive: !paused && !!lastActivity && daysBetween(lastActivity, today) >= 7,
    needsProgramming: !paused && !future.length && !/digital/i.test(client.clientType || ""),
    ending: !paused && !!end && daysBetween(today, end) <= 7 && !/digital/i.test(client.clientType || "") };
}

export function buildCoachingItems(input: { clients: any[]; workouts?: any[]; checkIns?: any[]; comments?: any[]; messages?: any[]; videos?: any[]; submissions?: any[]; orders?: any[]; enquiries?: any[]; today?: string }): CoachingItem[] {
  const { clients, workouts = [], checkIns = [], comments = [], messages = [], videos = [], submissions = [], orders = [], enquiries = [], today = coachingToday() } = input;
  const items: CoachingItem[] = [];
  const add = (kind: ReviewKind, source: any, id: string, date: any, title: string, priority: number, revision: any = source, clientId = source.clientId) => {
    if (!id) return;
    const client = clients.find(c => belongsTo({ clientId }, c));
    // Unmatched admin enquiries can still be handled; athlete data follows the roster scope.
    if (!client && !["order", "enquiry"].includes(kind)) return;
    if (client && coachingPaused(client) && ["coverage", "missed"].includes(kind)) return;
    items.push({ key: `${kind}:${id}`, kind, clientId: client?.clientCode || clientId || "", clientName: client?.name || source.clientName || "", title: title || "", date: coachingDate(date), priority,
      revision: JSON.stringify(revision), source });
  };
  messages.forEach(m => add("message", m, m.messageId, m.createdAt, m.bodyEn || m.body, 0, [m.body, m.createdAt]));
  comments.forEach(c => add("comment", c, c.key, c.date, c.noteEn || c.note, 0, [c.note, c.date]));
  checkIns.forEach(c => add("checkin", c, c.recordId, c.submittedDate, c.trainingNotesEn || c.trainingNotes || c.problemsPainEn || c.problemsPain, 1,
    [c.submittedDate, c.bodyWeight, c.sleepHours, c.sleepQuality, c.energy, c.mood, c.stress, c.soreness, c.readinessScore, c.trainingNotes, c.wins, c.problemsPain, c.clientNotes, c.nutritionNotes]));
  videos.forEach(v => add("video", v, v.recordId, v.submittedAt || v.createdAt, v.exerciseName, 1, [v.videoUrl, v.clientNote]));
  submissions.forEach(s => add("submission", s, s.key, s.submittedAt, s.title, 1, [s.submittedAt, s.answers?.map((a: any) => [a.responseId, a.answerText, a.answerNumber])], s.answers?.[0]?.clientId));
  workouts.forEach(w => {
    const date = coachingDate(w.scheduledDate), id = w.assignedWorkoutId || w.id;
    if (completed(w)) add("workout", w, id, date, w.sessionName, 1, [date, w.clientNotes, w.sessionRpe, w.sessionDuration, w.completionStatus]);
    else if (date && date < today && !completed(w) && !cancelled(w)) add("missed", w, id, date, w.sessionName, 3, [date, w.completionStatus]);
  });
  clients.forEach(c => {
    const facts = athleteFacts(c, workouts, checkIns, today);
    if (facts.needsProgramming || facts.ending) add("coverage", facts, c.clientCode, facts.end || today, facts.end || "", 2,
      facts.future.map(w => [w.assignedWorkoutId || w.id, coachingDate(w.scheduledDate)]), c.clientCode);
  });
  orders.forEach(o => add("order", o, o.recordId || o.orderId, o.createdAt || o.orderDate, o.productName || o.productType, 4, [o.fulfillmentStatus, o.intakeStatus]));
  enquiries.forEach(e => add("enquiry", e, e.recordId, e.submittedDate, e.organization || e.contactPerson, 4, [e.status, e.notes]));
  items.forEach(item => {
    const s = item.source;
    if (item.priority === 1 && item.date && daysBetween(item.date, today) > 7) item.priority = 3;
    item.sourceDone = Boolean(item.kind === "message" ? s.coachReply || s.status === "Replied" : item.kind === "comment" ? s.reviewed : item.kind === "checkin" || item.kind === "workout" ? s.coachReviewed : item.kind === "video" ? s.status === "Reviewed" : item.kind === "submission" ? s.answers?.[0]?.reviewedAt : false);
  });
  return items.sort((a, b) => a.priority - b.priority || (a.priority === 0 ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)) || a.key.localeCompare(b.key));
}
export function decisionStatus(item: CoachingItem, decisions: ReviewDecision[], now = Date.now()) {
  if (item.sourceDone) return "resolved";
  const state = decisions.find(s => s.key === item.key);
  if (!state || state.revision !== item.revision) return item.sourceDone ? "resolved" : "open";
  if (state.status === "snoozed" && (state.until || 0) <= now) return item.sourceDone ? "resolved" : "open";
  return state.status;
}
export const isAdminItem = (item: CoachingItem) => item.kind === "order" || item.kind === "enquiry";
