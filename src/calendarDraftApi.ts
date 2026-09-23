// Retain a retry identity until the server acknowledges the calendar write.
// The fingerprint changes when the coach changes the schedule/prescription.
export async function saveCalendarDraft(payload: Record<string, unknown>) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(payload)));
  const key = `nl-calendar-draft-request:${Array.from(new Uint8Array(hash), n => n.toString(16).padStart(2, "0")).join("")}`;
  let requestId: string = crypto.randomUUID();
  try { requestId = sessionStorage.getItem(key) || requestId; sessionStorage.setItem(key, requestId); } catch { /* restricted storage */ }
  const response = await fetch("/api/calendarDrafts", { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, action: "save", requestId }) });
  const data = await response.json();
  if (!response.ok || !data.success) throw new Error(data.error || "Could not save the calendar draft");
  try { sessionStorage.removeItem(key); } catch { /* restricted storage */ }
  return data;
}

export async function assignCalendarProgram(body: { clientRecordId?: string; clientRecordIds?: string[]; programRecordId: string; scheduledWorkouts: unknown[] }, draft = false) {
  if (draft === true) {
    const data = await saveCalendarDraft({ clientIds: body.clientRecordIds || [body.clientRecordId], sourceProgramId: body.programRecordId, scheduledWorkouts: body.scheduledWorkouts });
    return new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } });
  }
  return fetch("/api/assignProgram", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}
