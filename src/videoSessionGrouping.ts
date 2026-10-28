// Pure grouping shared by the review queue and athlete archive.
export type WorkoutVideo = {
  recordId: string; clientId?: string; clientName?: string; exerciseName?: string;
  workoutName?: string; workoutNameCn?: string; assignedWorkoutId?: string;
  workoutDate?: string; submittedAt?: number; reviewedAt?: number;
  status?: string; coachReply?: string; coachReplyCn?: string;
  videoUrl?: string; clientNote?: string; clientNoteEn?: string;
};
export function videoDay(value: unknown): string {
  const s = String(value ?? "");
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const ms = Number(value);
  if (!Number.isFinite(ms) || ms <= 0) return "";
  return new Date(ms + 8 * 3600000).toISOString().slice(0, 10);
}
const normalName = (value: unknown) => String(value || "").normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
type Assignment = { assignedWorkoutId: string; clientId: string | null; sessionName: string | null; sessionNameCn: string | null; scheduledDate: unknown };
export function resolveVideoSession<T extends WorkoutVideo>(video: T, assignments: Assignment[]): T {
  const own = assignments.filter(w => w.clientId === video.clientId);
  const matches = video.assignedWorkoutId
    ? own.filter(w => w.assignedWorkoutId === video.assignedWorkoutId)
    : own.filter(w => videoDay(w.scheduledDate) === videoDay(video.submittedAt) && normalName(video.workoutName) &&
      [w.sessionName, w.sessionNameCn].some(n => normalName(n) === normalName(video.workoutName)));
  if (matches.length !== 1) return video;
  const w = matches[0];
  return { ...video, assignedWorkoutId: w.assignedWorkoutId,
    workoutDate: video.workoutDate || videoDay(w.scheduledDate),
    workoutName: video.assignedWorkoutId && video.workoutName ? video.workoutName : w.sessionName || video.workoutName,
    workoutNameCn: video.workoutNameCn || w.sessionNameCn || "" };
}
export function groupWorkoutVideos<T extends WorkoutVideo>(videos: readonly T[]) {
  const groups = new Map<string, { key: string; clientId: string; clientName: string; workoutName: string; workoutNameCn: string; date: string; dateBasis: "session" | "upload"; videos: T[]; pending: number; latest: number }>();
  for (const video of [...videos].sort((a, b) => (a.submittedAt || 0) - (b.submittedAt || 0) || a.recordId.localeCompare(b.recordId))) {
    const date = video.workoutDate || videoDay(video.submittedAt);
    const key = JSON.stringify([video.clientId || video.clientName || "", video.assignedWorkoutId || [normalName(video.workoutName), date]]);
    let group = groups.get(key);
    if (!group) {
      group = { key, clientId: video.clientId || "", clientName: video.clientName || "", workoutName: video.workoutName || "", workoutNameCn: video.workoutNameCn || "", date,
        dateBasis: video.workoutDate ? "session" : "upload", videos: [], pending: 0, latest: 0 };
      groups.set(key, group);
    }
    group.videos.push(video);
    if (video.status !== "Reviewed") group.pending++;
    group.latest = Math.max(group.latest, video.reviewedAt || 0, video.submittedAt || 0);
  }
  return [...groups.values()].sort((a, b) => b.date.localeCompare(a.date) || b.latest - a.latest || a.key.localeCompare(b.key));
}
