// Resolve only unambiguous library names. Keep explicit saved Chinese intact.
const key = (v: unknown) => String(v || "").normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
export function videoExerciseLabels(exercises: { name: string; nameCn: string | null }[]) {
  const labels = new Map<string, Set<string>>();
  for (const e of exercises) {
    if (!e.nameCn?.trim()) continue;
    for (const name of [e.name, e.nameCn]) {
      const k = key(name);
      if (k) labels.set(k, new Set([...(labels.get(k) || []), e.nameCn.trim()]));
    }
  }
  return (name: string, saved?: string | null) => {
    if (saved?.trim()) return saved;
    const matches = labels.get(key(name));
    return matches?.size === 1 ? [...matches][0] : "";
  };
}
