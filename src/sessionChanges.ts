import { exercisePrescription, parseExerciseNotes, type ProgramSession } from "./appCore";
import { normalizeDate } from "./appCore";
import type { SessionSnapshot } from "./SessionSnapshotPreview";

export type SessionChange = { label: string; before: string; after: string; long?: boolean };
export type ExerciseChange = { name: string; kind: "added" | "removed" | "changed"; changes: SessionChange[] };
const value = (v: unknown) => v === null || v === undefined ? "" : String(v).replace(/\r\n/g, "\n").trim();
const labels: Record<string, [string, string]> = {
  sessionName: ["Session name", "训练名称"], sessionNameCn: ["Chinese session name", "中文训练名称"],
  scheduledDate: ["Date", "日期"], sessionType: ["Session type", "训练类型"], sessionGoal: ["Goal", "训练目标"],
  coachNotes: ["Session notes", "训练说明"], coachNotesCn: ["Chinese session notes", "中文训练说明"],
  intensity: ["Intensity", "强度"], estimatedDuration: ["Estimated minutes", "预计分钟数"],
  sets: ["Sets / rounds", "组数 / 轮数"], reps: ["Reps", "次数"], load: ["Load", "负重"],
  rest: ["Rest", "休息"], time: ["Time (sec)", "时间（秒）"], distance: ["Distance", "距离"],
  percent: ["% 1RM", "% 1RM"], percentMas: ["% MAS", "% MAS"], rpe: ["RPE", "RPE"], rir: ["RIR", "RIR"],
  tempo: ["Tempo", "节奏"], intensityMode: ["Intensity measure", "强度指标"], intensityValue: ["Intensity target", "强度目标"],
  isLabelCustom: ["Custom label", "自定义编号"],
  sectionName: ["Section", "训练部分"], exerciseLabel: ["Label", "动作编号"], groupType: ["Grouping", "编排方式"],
  groupName: ["Group", "组别"], groupMode: ["Circuit format", "循环方式"], groupMinutes: ["Circuit minutes", "循环分钟数"],
  isUnilateral: ["Each side", "每侧"], isAccessory: ["Accessory", "辅助动作"], accessoryParentLabel: ["Linked exercise", "关联动作"],
  trackingType: ["Tracking", "记录方式"], trackingFields: ["Fields", "记录项目"], coachingNotes: ["Coaching cues", "教练提示"],
  notesCn: ["Chinese coaching cues", "中文教练提示"], alternateExercises: ["Alternatives", "替代动作"],
  targetSource: ["Target source", "目标来源"], targetMetric: ["Target metric", "目标指标"], targetPercent: ["Target percent", "目标百分比"],
  targetAdjustment: ["Target adjustment", "目标调整"], autoTarget: ["Automatic target", "自动目标"], displayTarget: ["Displayed target", "显示目标"],
};
const rows = (s: SessionSnapshot) => [...s.templates].sort((a, b) => Number(a.order) - Number(b.order));
const name = (row: any, zh: boolean) => (zh && row.exerciseNameCn) || row.exerciseName || row.exerciseId;
function rowFields(row: any) {
  const meta = parseExerciseNotes(row.notes || "");
  const fields: Record<string, unknown> = { ...meta, ...row, sets: exercisePrescription(row).sets,
    groupType: meta.groupType || "Straight", sectionName: meta.sectionName || "Main",
    trackingFields: (meta.trackingFields || []).join(", "),
    alternateExercises: (meta.alternateExercises || []).map(e => e.exerciseName || e.exerciseId).join(", "),
  };
  for (const k of ["isUnilateral", "isAccessory", "autoTarget"]) fields[k] = Boolean(fields[k]);
  return fields;
}
function targets(row: any) {
  const meta = parseExerciseNotes(row.notes || "");
  const explicit = row.setPrescriptions?.length ? row.setPrescriptions : meta.setPrescriptions;
  return Array.from({ length: Math.min(100, exercisePrescription(row).sets) }, (_, i) => ({
    reps: row.reps, tempo: row.tempo, rest: row.rest, load: row.load, ...explicit?.[i],
  }));
}
/** Compare athlete-visible values, never template IDs (every save creates new IDs).
 * Repeated exercises are compared as ordered groups, without inventing occurrence identity. */
export function sessionChanges(before: SessionSnapshot, after: SessionSnapshot, zh = false) {
  const changes: SessionChange[] = [], exercises: ExerciseChange[] = [];
  const display = (v: unknown) => typeof v === "boolean" ? (v ? (zh ? "是" : "Yes") : (zh ? "否" : "No")) : value(v);
  const add = (out: SessionChange[], key: string, a: unknown, b: unknown, prefix = "") => {
    if (value(a) !== value(b)) out.push({ label: prefix + (labels[key]?.[zh ? 1 : 0] || key), before: display(a), after: display(b), long: /notes/i.test(key) });
  };
  const sessionFields = (s: SessionSnapshot): Record<string, unknown> => {
    const first = rows(s)[0] || {}, w = s.workout;
    return { ...first, ...w, coachNotes: w.coachNotes || first.sessionNotes || "", coachNotesCn: w.coachNotesCn || first.sessionNotesCn || "",
      scheduledDate: w.scheduledDate ? normalizeDate(String(w.scheduledDate)) : "" };
  };
  const a = sessionFields(before), b = sessionFields(after);
  for (const key of ["sessionName", "sessionNameCn", "scheduledDate", "sessionType", "sessionGoal", "intensity", "estimatedDuration", "coachNotes", "coachNotesCn"]) add(changes, key, a[key], b[key]);
  const ar = rows(before), br = rows(after), identity = (r: any) => r.exerciseId || r.exerciseName;
  const ids = [...new Set([...ar.map(identity), ...br.map(identity)])];
  const shared = new Set(ids.filter(id => ar.some(r => identity(r) === id) && br.some(r => identity(r) === id)));
  const order = (list: any[]) => list.filter(r => shared.has(identity(r))).map(identity);
  if (JSON.stringify(order(ar)) !== JSON.stringify(order(br))) changes.push({ label: zh ? "动作顺序" : "Exercise order", before: ar.map(r => name(r, zh)).join(" → "), after: br.map(r => name(r, zh)).join(" → ") });
  for (const id of ids) {
    const old = ar.filter(r => identity(r) === id), next = br.filter(r => identity(r) === id);
    const entry: ExerciseChange = { name: name(next[0] || old[0], zh), kind: !old.length ? "added" : !next.length ? "removed" : "changed", changes: [] };
    if (!old.length || !next.length) {
      exercises.push(entry); continue;
    }
    if (old.length > 1 || next.length > 1) {
      // Show each occurrence in sequence; do not label a deletion as an edit to another occurrence.
      const describe = (list: any[]) => list.map((r, i) => `${i + 1}. ${exercisePrescription(r, zh).summary}\n${Object.entries(rowFields(r)).filter(([k]) => k in labels && !["sets", "reps", "rest", "tempo"].includes(k)).map(([k, v]) => value(v) ? `${labels[k][zh ? 1 : 0]}: ${display(v)}` : "").filter(Boolean).join(" · ")}\n${targets(r).map((s, j) => `${zh ? "组" : "Set"} ${j + 1}: ${Object.entries(s).filter(([k, v]) => k in labels && value(v)).map(([k, v]) => `${labels[k][zh ? 1 : 0]} ${v}`).join(" · ")}`).join("\n")}`).join("\n\n");
      add(entry.changes, zh ? "重复动作（按顺序）" : "Repeated exercise (in order)", describe(old), describe(next));
    } else {
      const x = rowFields(old[0]), y = rowFields(next[0]);
      for (const key of ["sets", "sectionName", "exerciseLabel", "isLabelCustom", "groupType", "groupName", "groupMode", "groupMinutes", "isUnilateral", "isAccessory", "accessoryParentLabel", "trackingType", "trackingFields", "coachingNotes", "notesCn", "alternateExercises", "targetSource", "targetMetric", "targetPercent", "targetAdjustment", "autoTarget", "displayTarget"]) add(entry.changes, key, x[key], y[key]);
      const xs = targets(old[0]), ys = targets(next[0]);
      for (let i = 0; i < Math.max(xs.length, ys.length); i++) {
        if (!xs[i] || !ys[i]) continue; // Added/removed sets are already explained by the set-count change and full preview.
        for (const key of ["reps", "load", "time", "distance", "percent", "percentMas", "intensityMode", "intensityValue", "rpe", "rir", "tempo", "rest"]) add(entry.changes, key, xs[i][key], ys[i][key], zh ? `第 ${i + 1} 组 · ` : `Set ${i + 1} · `);
      }
    }
    if (entry.changes.length) exercises.push(entry);
  }
  return { changes, exercises };
}

export function snapshotFromSession(session: ProgramSession, source: SessionSnapshot, encodeNotes: (exercise: ProgramSession["exercises"][number]) => string): SessionSnapshot {
  const first = source.templates[0] || {};
  return { workout: { ...source.workout, sessionName: session.sessionName, sessionNameCn: session.sessionNameCn,
    sessionType: session.sessionType, sessionGoal: session.sessionGoal, intensity: session.intensity, estimatedDuration: session.estimatedDuration,
    coachNotes: session.sessionNotes, coachNotesCn: value(session.sessionNotes) === value(source.workout.coachNotes || first.sessionNotes) ? source.workout.coachNotesCn : "" },
    templates: session.exercises.map((e, i) => ({ ...e, order: i + 1, notes: encodeNotes(e), notesCn: e.coachingNotesCn })) };
}
