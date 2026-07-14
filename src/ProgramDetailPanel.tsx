// Program/Session detail + assign redesign (design-refs handoff bundle).
// Full-screen overlay page: header + meta tiles + dark assign hero (with the
// dates modal) + the at-a-glance exercise chains. Replaces the old slide-over
// in CoachBuilderPage; all data/handlers are threaded in as props.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import "./ProgramDetailPanel.css";
import {
  Check,
  Clock3,
  Copy,
  Dumbbell,
  Feather,
  Gem,
  HeartPulse,
  Pencil,
  RefreshCw,
  Target,
  TrendingUp,
  Users,
  X,
  Zap,
} from "lucide-react";

// Focus (session type) → icon, matching the session library / client-mobile set.
const focusIcon = (focus?: string) => {
  const f = (focus || "").toLowerCase();
  if (f.includes("mobil")) return Feather;
  if (f.includes("cardio") || f.includes("condition")) return HeartPulse;
  if (f.includes("skill") || f.includes("technique")) return Target;
  return Dumbbell;
};

// Section color key from the design (matches the app's label-badge hues).
const SECTION_HEX: Record<string, { bg: string; text: string }> = {
  labelMobility: { bg: "#2e8b3d", text: "#f1fbf2" },
  labelPower: { bg: "#b5731a", text: "#fff7e8" },
  labelStrength: { bg: "#5b6770", text: "#ffffff" },
  labelAccessory: { bg: "#15897a", text: "#effaf8" },
  labelWarmup: { bg: "#c2671c", text: "#fff7e8" },
  labelCardio: { bg: "#3a86ff", text: "#f0f6ff" },
  labelSkill: { bg: "#6a4bc9", text: "#f2edff" },
  exerciseLabelBadgeWarmup: { bg: "#c2671c", text: "#fff7e8" },
  labelAlt1: { bg: "#a63d57", text: "#fdf1f4" },
  labelAlt2: { bg: "#3f5b94", text: "#f0f4fb" },
  labelAlt3: { bg: "#2f7f9e", text: "#eff8fc" },
  labelAlt4: { bg: "#7d4a78", text: "#faf1f9" },
  labelDefault: { bg: "#4f5258", text: "#ffffff" },
};
const sectionHex = (colorClass?: string) =>
  SECTION_HEX[colorClass || ""] || SECTION_HEX.labelDefault;

// Focus (session type) → hex, per the design's focus map.
const focusHex = (focus?: string) => {
  const f = (focus || "").toLowerCase();
  if (f.includes("mobil")) return "#2e8b3d";
  if (f.includes("power")) return "#b5731a";
  if (f.includes("plyo") || f.includes("accessor")) return "#15897a";
  if (f.includes("cardio") || f.includes("condition")) return "#3a86ff";
  if (f.includes("skill") || f.includes("technique")) return "#6a4bc9";
  return "#5b6770";
};

// Same cascade the loader uses: week → +7 days, day → +2 days.
const cascadeOffset = (week: number, day: number) =>
  ((Number(week) || 1) - 1) * 7 + ((Number(day) || 1) - 1) * 2;

const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  d.setDate(d.getDate() + n);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
};

const fmtShort = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const META_TILES = [
  { key: "goal", label: "Goal", Icon: Target, hue: "#b5731a", tint: "#f8efda", border: "#ecdcb6" },
  { key: "sport", label: "Sport", Icon: Zap, hue: "#3f6390", tint: "#eef1f6", border: "#dde4ee" },
  { key: "level", label: "Level", Icon: TrendingUp, hue: "#0b7d64", tint: "#e7f4f0", border: "#d3ebe3" },
  { key: "duration", label: "Duration", Icon: Clock3, hue: "#2a2e6e", tint: "#eaebf3", border: "#d8dae9" },
  { key: "phase", label: "Phase", Icon: Gem, hue: "#6a4a90", tint: "#f1ebf7", border: "#e4d9f0" },
  { key: "perWeek", label: "Sessions / Week", Icon: RefreshCw, hue: "#b5361f", tint: "#fbecea", border: "#f3d6d1" },
];

export default function ProgramDetailPanel({
  isSession,
  selectedSavedProgram,
  setShowProgramDetail,
  loadSavedProgramIntoBuilder,
  savedTemplatesLoading,
  deleteSavedProgram,
  deletingSavedProgramId,
  clients,
  savedAssignClientId,
  setSavedAssignClientId,
  savedAssignStartDate,
  setSavedAssignStartDate,
  savedAssignLoading,
  savedAssignableWorkouts,
  savedAssigningProgram,
  assignSavedProgramToClient,
  loadSavedProgramSessionsForAssignment,
  updateSavedAssignableWorkoutDate,
  savedProgramSessions,
  buildGlanceChain,
}: { [key: string]: any }) {
  const p = selectedSavedProgram;
  const [modalOpen, setModalOpen] = useState(false);
  const [assigned, setAssigned] = useState(false);
  const [assignedRange, setAssignedRange] = useState("");

  const clientName =
    (clients || []).find((c: any) => c.id === savedAssignClientId)?.name || "";

  // Close modal on Esc.
  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalOpen]);

  // Build the per-session chains once; group consecutive same-section runs so
  // program mode gets section sub-headers and session mode one continuous
  // multicolor chain.
  const weeks = useMemo(() => {
    const sessions = savedProgramSessions || [];
    const maxWeek = sessions.reduce(
      (m: number, s: any) => Math.max(m, Number(s.week) || 1),
      1
    );
    return Array.from({ length: maxWeek }, (_, i) => i + 1)
      .map((w) => ({
        week: w,
        days: sessions
          .filter((s: any) => Number(s.week) === w)
          .sort((a: any, b: any) => Number(a.day) - Number(b.day))
          .map((s: any) => {
            const items = buildGlanceChain(s.exercises || []);
            const groups: Array<{
              name: string;
              colorClass: string;
              items: any[];
            }> = [];
            items.forEach((it: any) => {
              const name = (it.ex.sectionName || "Main").trim() || "Main";
              const last = groups[groups.length - 1];
              if (last && last.colorClass === it.colorClass && last.name === name) {
                last.items.push(it);
              } else {
                groups.push({ name, colorClass: it.colorClass, items: [it] });
              }
            });
            return { session: s, items, groups };
          }),
      }))
      .filter((w) => w.days.length > 0);
  }, [savedProgramSessions, buildGlanceChain]);

  const totalExercises = weeks.reduce(
    (a, w) => a + w.days.reduce((b: number, d: any) => b + d.items.length, 0),
    0
  );
  const totalSections = isSession
    ? 1
    : weeks.reduce(
        (a, w) => a + w.days.reduce((b: number, d: any) => b + d.groups.length, 0),
        0
      );

  // The session builder's "Focus" dropdown value (stored as sessionType on
  // the record; fall back to the built day's own type).
  const focus =
    p.sessionType || weeks[0]?.days[0]?.session?.sessionType || "Strength";

  const openAssign = () => {
    if (!savedAssignClientId) return;
    setAssigned(false);
    setModalOpen(true);
    void loadSavedProgramSessionsForAssignment();
  };

  const onStartDate = (v: string) => {
    setSavedAssignStartDate(v);
    (savedAssignableWorkouts || []).forEach((w: any) =>
      updateSavedAssignableWorkoutDate(
        w.localId,
        addDays(v, cascadeOffset(w.week, w.day))
      )
    );
  };

  const confirmAssign = async () => {
    const dates = (savedAssignableWorkouts || [])
      .map((w: any) => w.scheduledDate)
      .filter(Boolean)
      .sort();
    const range =
      dates.length > 1
        ? `${fmtShort(dates[0])} – ${fmtShort(dates[dates.length - 1])}`
        : `starts ${fmtShort(dates[0] || savedAssignStartDate)}`;
    const ok = await assignSavedProgramToClient();
    if (ok) {
      setModalOpen(false);
      setAssigned(true);
      setAssignedRange(range);
    }
  };

  const deleting = deletingSavedProgramId === p.recordId;
  const metaValues: Record<string, string> = {
    goal: p.goal || "—",
    sport: p.sport || "—",
    level: p.level || "—",
    duration: p.durationWeeks
      ? `${p.durationWeeks} week${Number(p.durationWeeks) > 1 ? "s" : ""}`
      : "—",
    phase: p.phase || "—",
    perWeek: p.sessionsPerWeek || "—",
  };

  const renderRow = (it: any, linked: boolean) => {
    const hex = sectionHex(it.colorClass);
    const sets =
      it.ex.sets && it.ex.reps
        ? `${it.ex.sets} × ${it.ex.reps}`
        : it.ex.sets || it.ex.reps || "";
    return (
      <div className="pdpRow" key={`${it.ex.exerciseRecordId || it.display}-${it.ex.exerciseName}`}>
        <span
          className={`pdpBadge${linked ? " pdpLinked" : ""}`}
          style={
            {
              background: hex.bg,
              color: hex.text,
              "--pdp-link": hex.bg,
            } as any
          }
        >
          {it.display}
        </span>
        <div className="pdpRowText">
          <strong>{it.ex.exerciseName}</strong>
          {sets && <span>{sets}</span>}
        </div>
      </div>
    );
  };

  return (
    <div className="pdpScrim" role="dialog" aria-modal="true" aria-label={p.programName}>
      <div className="pdpWrap">
        {/* header */}
        <div className="pdpHead pdpRise">
          <div className="pdpHeadLeft">
            <span className="pdpEyebrow">
              <span className="pdpDot" />
              {p.productType || (isSession ? "Single Workout" : "Program")}
              {p.status ? ` · ${p.status}` : ""}
            </span>
            <h1 className="pdpTitle">{p.programName}</h1>
          </div>
          <div className="pdpActions">
            <button
              type="button"
              className="pdpBtnDark"
              disabled={savedTemplatesLoading}
              onClick={() => loadSavedProgramIntoBuilder(p, { edit: true })}
            >
              <Pencil size={15} /> Edit
            </button>
            <button
              type="button"
              className="pdpBtnGhost"
              disabled={savedTemplatesLoading}
              onClick={() => loadSavedProgramIntoBuilder(p, { asCopy: true })}
            >
              <Copy size={15} /> Duplicate
            </button>
            <button
              type="button"
              className="pdpBtnGhost"
              onClick={() => setShowProgramDetail(false)}
            >
              Close
            </button>
            <button
              type="button"
              className="pdpBtnDanger"
              disabled={deleting}
              onClick={() => deleteSavedProgram(p)}
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>

        {/* meta tiles — a single workout gets ONE card (its Focus); the six
            program facts are all constants for sessions and just add noise. */}
        <div
          className={`pdpMeta${isSession ? " pdpMetaSession" : ""} pdpRise`}
          style={{ animationDelay: ".04s" }}
        >
          {isSession ? (
            <div
              className="pdpTile"
              style={{
                background: `${focusHex(focus)}14`,
                borderColor: `${focusHex(focus)}40`,
              }}
            >
              <span className="pdpTileIcon" style={{ color: focusHex(focus) }}>
                {(() => {
                  const FI = focusIcon(focus);
                  return <FI size={18} strokeWidth={2.4} />;
                })()}
              </span>
              <div className="pdpTileText">
                <span>Focus</span>
                <strong>{focus}</strong>
              </div>
            </div>
          ) : (
            META_TILES.map((m) => (
              <div
                className="pdpTile"
                key={m.key}
                style={{ background: m.tint, borderColor: m.border }}
              >
                <span className="pdpTileIcon" style={{ color: m.hue }}>
                  <m.Icon size={18} strokeWidth={2.4} />
                </span>
                <div className="pdpTileText">
                  <span>{m.label}</span>
                  <strong>{metaValues[m.key]}</strong>
                </div>
              </div>
            ))
          )}
        </div>

        {/* assign hero */}
        <div className="pdpHero pdpRise" style={{ animationDelay: ".08s" }}>
          <div className="pdpHeroGlow" />
          <div className="pdpHeroInner">
            <span className="pdpHeroEyebrow">
              <Users size={14} strokeWidth={2.2} /> Assign to Client
            </span>
            <h2 className="pdpHeroTitle">
              {isSession ? "Schedule this workout" : "Schedule this program"}
            </h2>
            <div className="pdpAssignGrid">
              <label className="pdpField">
                <span>Client</span>
                <select
                  className="pdpSelect"
                  value={savedAssignClientId}
                  onChange={(e) => {
                    setSavedAssignClientId(e.target.value);
                    setAssigned(false);
                  }}
                >
                  <option value="">Select client…</option>
                  {(clients || []).map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="pdpAssignBtn"
                disabled={!savedAssignClientId}
                onClick={openAssign}
              >
                {assigned ? "Assigned ✓" : "Assign Program"}
              </button>
            </div>
            {assigned && (
              <div className="pdpChip">
                <Check size={16} strokeWidth={2.6} />
                <span>
                  Assigned to {clientName} — {assignedRange}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* program sessions */}
        <div className="pdpRise" style={{ animationDelay: ".12s" }}>
          <div className="pdpSectionsHead">
            <span className="pdpSectionsEyebrow">Program Sessions</span>
            <span className="pdpSectionsCount">
              {totalExercises} {totalExercises === 1 ? "exercise" : "exercises"}{" "}
              · {totalSections} {totalSections === 1 ? "section" : "sections"}
            </span>
          </div>

          {savedTemplatesLoading && weeks.length === 0 && (
            <p className="pdpHint">Loading sessions…</p>
          )}
          {!savedTemplatesLoading && weeks.length === 0 && (
            <p className="pdpHint">No sessions built yet — open it in the builder to add days.</p>
          )}

          {weeks.map((w) => (
            <div key={w.week}>
              <h2 className="pdpWeekTitle">Week {w.week}</h2>
              <div className="pdpCard">
                {w.days.map((d: any) => (
                  <div key={d.session.localId}>
                    <div className="pdpDayHead">
                      <span className="pdpDayChip">D{d.session.day}</span>
                      <div className="pdpDayText">
                        <span>Day {d.session.day}</span>
                        <strong>
                          {d.session.sessionName ||
                            `Week ${w.week} Day ${d.session.day}`}
                        </strong>
                      </div>
                    </div>

                    {isSession ? (
                      <div className="pdpGroup">
                        <div className="pdpGroupHead">
                          <span
                            className="pdpSwatch"
                            style={{ background: focusHex(focus) }}
                          />
                          <span className="pdpGroupKicker">Focus</span>
                          <span
                            className="pdpGroupName"
                            style={{ color: focusHex(focus) }}
                          >
                            {focus}
                          </span>
                          <span className="pdpGroupMeta">
                            {d.items.length}{" "}
                            {d.items.length === 1 ? "exercise" : "exercises"}
                          </span>
                        </div>
                        {d.items.map((it: any, i: number) =>
                          renderRow(it, i < d.items.length - 1)
                        )}
                      </div>
                    ) : (
                      d.groups.map((g: any, gi: number) => (
                        <div className="pdpGroup" key={`${d.session.localId}-${gi}`}>
                          <div className="pdpGroupHead">
                            <span
                              className="pdpSwatch"
                              style={{ background: sectionHex(g.colorClass).bg }}
                            />
                            <span
                              className="pdpGroupName"
                              style={{ color: sectionHex(g.colorClass).bg }}
                            >
                              {g.name}
                            </span>
                            <span className="pdpGroupMeta">
                              {g.items.length}{" "}
                              {g.items.length === 1 ? "exercise" : "exercises"}
                            </span>
                          </div>
                          {g.items.map((it: any, i: number) =>
                            renderRow(it, i < g.items.length - 1)
                          )}
                        </div>
                      ))
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* assign dates modal */}
      {modalOpen && (
        <div className="pdpModalScrim" onClick={() => setModalOpen(false)}>
          <div
            className="pdpModal"
            role="dialog"
            aria-modal="true"
            aria-label={isSession ? "Set the start date" : "Schedule every day"}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pdpModalHead">
              <div className="pdpHeroGlow" />
              <div className="pdpModalHeadInner">
                <div>
                  <span className="pdpModalEyebrow">Assign · {clientName}</span>
                  <h3>{isSession ? "Set the start date" : "Schedule every day"}</h3>
                </div>
                <button
                  type="button"
                  className="pdpModalClose"
                  aria-label="Close"
                  onClick={() => setModalOpen(false)}
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            <div className="pdpModalBody">
              <label className="pdpModalField">
                <span>Program start date</span>
                <input
                  type="date"
                  autoFocus
                  value={savedAssignStartDate}
                  onChange={(e) => onStartDate(e.target.value)}
                />
                <em>
                  {isSession
                    ? "The workout will be scheduled on this day for the client."
                    : "Sets the first day — later days auto-fill and stay editable below."}
                </em>
              </label>

              {savedAssignLoading && <p className="pdpHint">Loading days…</p>}
              {!savedAssignLoading &&
                (savedAssignableWorkouts || []).length === 0 && (
                  <p className="pdpHint">No sessions to schedule in this program.</p>
                )}

              {!isSession && (savedAssignableWorkouts || []).length > 0 && (
                <>
                  <span className="pdpModalDaysLabel">
                    Days · {savedAssignableWorkouts.length}
                  </span>
                  <div className="pdpModalDays">
                    {savedAssignableWorkouts.map((w: any) => (
                      <div className="pdpDayCard" key={w.localId}>
                        <div className="pdpDayCardText">
                          <span>
                            Week {w.week} · Day {w.day}
                          </span>
                          <strong>{w.sessionName || "Untitled"}</strong>
                        </div>
                        <input
                          type="date"
                          value={w.scheduledDate}
                          onChange={(e) =>
                            updateSavedAssignableWorkoutDate(
                              w.localId,
                              e.target.value
                            )
                          }
                        />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="pdpModalFoot">
              <button
                type="button"
                className="pdpBtnCancel"
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="pdpBtnConfirm"
                disabled={
                  savedAssigningProgram ||
                  savedAssignLoading ||
                  (savedAssignableWorkouts || []).length === 0
                }
                onClick={() => void confirmAssign()}
              >
                {savedAssigningProgram ? "Assigning…" : "Confirm assignment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
