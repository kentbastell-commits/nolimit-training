// Extracted from App.tsx (monolith split) — JSX verbatim; props threaded.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChevronDown } from "lucide-react";

export default function ExerciseHistoryModal({
  t,
  expandedHistoryDates,
  historyExerciseName,
  paceZh,
  setExpandedHistoryDates,
  setHistoryExerciseName,
  workoutHistoryLogs,
}: { [key: string]: any }) {
  return (
    <>
          <div className="workout-modal-overlay">
            <div className="clientFormModal historyModal">
              <div className="modal-header">
                <div>
                  <h2>{historyExerciseName}</h2>
                  <p>{t("recentLoggedSets")}</p>
                </div>

                <button
                  className="drawerClose"
                  onClick={() => setHistoryExerciseName("")}
                >
                  x
                </button>
              </div>

              <div className="historyLogList">
                {(() => {
                  const logs = workoutHistoryLogs.filter((log: any) =>
                    log.exerciseName
                      .toLowerCase()
                      .startsWith(historyExerciseName.toLowerCase())
                  );
                  if (logs.length === 0) return <p>{t("noHistoryLogged")}</p>;

                  // Group by date; show newest first, collapsed by default.
                  const byDate = new Map<string, typeof logs>();
                  for (const log of logs) {
                    const d = log.date || "--";
                    if (!byDate.has(d)) byDate.set(d, []);
                    byDate.get(d)!.push(log);
                  }
                  const sideOf = (name: string) => {
                    const m = name.match(/\s*-\s*(left|right)\s*$/i);
                    return m ? (m[1].toLowerCase() === "left" ? "L" : "R") : "";
                  };
                  const dates = [...byDate.keys()].sort((a: any, b: any) =>
                    b.localeCompare(a)
                  );

                  return dates.map((date) => {
                    const sets = byDate
                      .get(date)!
                      .slice()
                      .sort(
                        (a: any, b: any) =>
                          (Number(a.setNumber) || 0) - (Number(b.setNumber) || 0)
                      );
                    const open = expandedHistoryDates.has(date);
                    return (
                      <div className="historyDateGroup" key={date}>
                        <button
                          type="button"
                          className={`historyDateToggle${open ? " open" : ""}`}
                          onClick={() =>
                            setExpandedHistoryDates((prev: any) => {
                              const next = new Set(prev);
                              if (next.has(date)) next.delete(date);
                              else next.add(date);
                              return next;
                            })
                          }
                        >
                          <ChevronDown
                            size={16}
                            className="historyDateCaret"
                            aria-hidden="true"
                          />
                          <span className="historyDate">{date}</span>
                          <span className="historyDateMeta">
                            {sets.length}{" "}
                            {paceZh
                              ? "组"
                              : sets.length === 1
                                ? "set"
                                : "sets"}
                          </span>
                        </button>
                        {open && (
                          <div className="historySetLines">
                            {sets.map((s: any, i: any) => {
                              const side = sideOf(s.exerciseName);
                              const metrics = [
                                s.actualReps
                                  ? `${s.actualReps} ${paceZh ? "次" : "reps"}`
                                  : "",
                                s.actualWeight ? `${s.actualWeight} kg` : "",
                                s.actualTime ? `${s.actualTime}s` : "",
                                s.actualDistance ? `${s.actualDistance} m` : "",
                              ].filter(Boolean);
                              return (
                                <div
                                  className="historySetLine"
                                  key={s.recordId || i}
                                >
                                  <span className="hsSet">
                                    {paceZh
                                      ? `第 ${s.setNumber || i + 1} 组`
                                      : `Set ${s.setNumber || i + 1}`}
                                    {side ? ` · ${side}` : ""}
                                  </span>
                                  <span className="hsMetrics">
                                    {metrics.join("   ") || "--"}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>

              <div className="modalActions">
                <button
                  className="goldButton"
                  onClick={() => setHistoryExerciseName("")}
                >
                  {t("done")}
                </button>
              </div>
            </div>
          </div>
    </>
  );
}
