import type { ProgramExercise } from "./appCore";

export type ProgrammingBlock = { id: string; name: string; nameCn: string; exercises: ProgramExercise[]; favorite: boolean; updatedAt: number; lastUsedAt: number | null; version: number };

// Inserted blocks are independent prescriptions. New group identities prevent
// two copies of the same circuit from silently becoming one large circuit.
export function insertBlock(existing: ProgramExercise[], block: ProgramExercise[]): ProgramExercise[] {
  const copies = structuredClone(block);
  const groups = new Map<string, string>();
  const used = new Set(existing.filter(e => e.groupType !== "Straight").map(e => `${e.groupType}:${e.groupName.trim().toLowerCase()}`));
  for (const ex of copies) {
    if (ex.groupType !== "Straight" && ex.groupName) {
      const key = `${ex.groupType}:${ex.groupName.trim().toLowerCase()}`;
      if (!groups.has(key)) {
        let name = ex.groupName.trim(), number = 2;
        while (used.has(`${ex.groupType}:${name.toLowerCase()}`)) name = `${ex.groupName.trim()} (${number++})`;
        groups.set(key, name); used.add(`${ex.groupType}:${name.toLowerCase()}`);
      }
      ex.groupName = groups.get(key)!;
    }
  }
  return [...existing, ...copies];
}

// Only literal loads are progressed. Never strip units or interpret 80% as kg.
export const progressionKey = (sessionId: string, index: number) => `${sessionId}:${index}`;
export function canProgressLoad(ex: ProgramExercise): boolean {
  return !ex.autoTarget && [ex.load, ...(ex.setPrescriptions || []).map(s => s.load)].some(v => /^\d+(?:\.\d+)?$/.test(String(v || "").trim()));
}

export function progressExerciseLoad(ex: ProgramExercise, pct: number): ProgramExercise {
  const copy = structuredClone(ex);
  if (copy.autoTarget) return copy;
  const adjust = (value: string) => /^\d+(?:\.\d+)?$/.test(String(value).trim())
    ? String(Math.round(Number(value) * (1 + pct / 100) * 100) / 100) : value;
  copy.load = adjust(copy.load);
  copy.setPrescriptions = copy.setPrescriptions?.map(set => ({ ...set, load: adjust(set.load) }));
  return copy;
}
