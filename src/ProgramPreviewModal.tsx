// Extracted from App.tsx (monolith split) — JSX verbatim; props threaded.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Copy, Pencil, X } from "lucide-react";
import "./ProgramPreviewModal.css";
import { getWorkoutColorClass } from "./appCore";

export default function ProgramPreviewModal({
  buildGlanceChain,
  loadSavedProgramIntoBuilder,
  previewLoading,
  previewProgram,
  setPreviewProgram,
  setSelectedSavedProgramId,
}: { [key: string]: any }) {
  return (
    <>
        <div
          className="createProgramOverlay"
          onClick={() => setPreviewProgram(null)}
        >
          <div
            className="previewModal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="createProgramHeader">
              <div>
                <span className="eyebrow">Preview</span>
                <h3>{previewProgram.program.programName}</h3>
              </div>
              <button
                type="button"
                className="iconActionButton"
                title="Close"
                onClick={() => setPreviewProgram(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="previewBody">
              {previewLoading ? (
                <p className="programTableEmpty">Loading…</p>
              ) : previewProgram.sessions.length === 0 ? (
                <p className="programTableEmpty">No sessions in this program.</p>
              ) : (
                (() => {
                  const maxWeek = previewProgram.sessions.reduce(
                    (m: any, s: any) => Math.max(m, Number(s.week) || 1),
                    1
                  );
                  const weeks = Array.from(
                    { length: maxWeek },
                    (_, i) => i + 1
                  );
                  return weeks.map((w) => {
                    const days = previewProgram.sessions
                      .filter((s: any) => s.week === String(w))
                      .sort((a: any, b: any) => Number(a.day) - Number(b.day));
                    if (days.length === 0) return null;
                    return (
                      <div className="previewWeek" key={w}>
                        <div className="previewWeekLabel">Week {w}</div>
                        <div className="previewDays">
                          {days.map((s: any) => (
                            <div
                              key={s.localId}
                              className={`programGridCard ${getWorkoutColorClass(
                                s.sessionName,
                                s.sessionType
                              )}`}
                            >
                              <div className="programGridCardHead">
                                <strong className="programGridCardName">
                                  Day {s.day} ·{" "}
                                  {s.sessionName || `Week ${w} Day ${s.day}`}
                                </strong>
                              </div>
                              <div className="glanceChain">
                                {buildGlanceChain(s.exercises).map((it: any, gi: any) => (
                                  <div
                                    className="glanceRow"
                                    key={`${it.ex.exerciseRecordId}-${gi}`}
                                  >
                                    <div className="glanceBadgeWrap">
                                      {it.linked && !it.isFirst && (
                                        <span
                                          className={`glanceLineUp line-${it.lineUpColor}`}
                                        />
                                      )}
                                      {it.linked && !it.isLast && (
                                        <span
                                          className={`glanceLineDown line-${it.lineDownColor}`}
                                        />
                                      )}
                                      <span
                                        className={`exerciseLabelBadge glanceBadge ${it.colorClass}`}
                                      >
                                        {it.display}
                                      </span>
                                    </div>
                                    <div className="glanceText">
                                      <strong>{it.ex.exerciseName}</strong>
                                      {(it.ex.sets || it.ex.reps) && (
                                        <span>
                                          {it.ex.sets && it.ex.reps
                                            ? `${it.ex.sets} x ${it.ex.reps}`
                                            : it.ex.sets || it.ex.reps}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  });
                })()
              )}
            </div>

            <div className="createProgramFooter">
              <button
                type="button"
                className="outlineButton"
                onClick={() => setPreviewProgram(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="outlineButton"
                onClick={() => {
                  const pr = previewProgram.program;
                  setPreviewProgram(null);
                  setSelectedSavedProgramId(pr.programId);
                  void loadSavedProgramIntoBuilder(pr, { asCopy: true });
                }}
              >
                <Copy size={15} /> Duplicate
              </button>
              <button
                type="button"
                className="goldButton"
                onClick={() => {
                  const pr = previewProgram.program;
                  setPreviewProgram(null);
                  setSelectedSavedProgramId(pr.programId);
                  void loadSavedProgramIntoBuilder(pr, { edit: true });
                }}
              >
                <Pencil size={15} /> Edit
              </button>
            </div>
          </div>
        </div>
    </>
  );
}
