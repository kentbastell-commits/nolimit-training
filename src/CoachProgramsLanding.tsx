// Digital > Program Builder landing (library). Same visual language as the
// redesigned Store page — dark library board, segmented filters, grouped-by-
// sport rows with type badges, and a program detail slide-over. It is a restyle
// of the saved-programs list only; the Program Builder itself is untouched and
// all handlers are threaded in from CoachBuilderPage.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import "./CoachProgramsLanding.css";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  ChevronRight,
  Copy,
  Dumbbell,
  Layers,
  Plus,
  PlusCircle,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";

type Kind = "program" | "bundle" | "addon";
const TYPE_META: Record<Kind, { label: string; bg: string; color: string; Icon: any }> =
  {
    program: { label: "Program", bg: "#e8f0ff", color: "#1f5fd6", Icon: Dumbbell },
    bundle: { label: "Bundle", bg: "#f3ecfb", color: "#6a2f9e", Icon: Layers },
    addon: { label: "Add-on", bg: "#e6f6f7", color: "#0c7382", Icon: PlusCircle },
  };
const EASE = [0.16, 1, 0.3, 1] as const;

export default function CoachProgramsLanding(props: { [key: string]: any }) {
  const {
    programs,
    visibleProgramsOnly,
    programsLoading,
    savedProgramProductFilter,
    setSavedProgramProductFilter,
    savedProgramSearch,
    setSavedProgramSearch,
    loadPrograms,
    setCreateProgramOpen,
    setSelectedSavedProgramId,
    setSavedAssignableWorkouts,
    setShowProgramDetail,
    showProgramDetail,
    selectedSavedProgram,
    loadSavedProgramIntoBuilder,
    duplicateSavedProgram,
    duplicatingProgramId,
    deleteSavedProgram,
    deletingSavedProgramId,
    savedProgramSessions,
    savedTemplatesLoading,
    clientNameForCode,
    teams,
    coachVisibleClients,
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
  } = props;

  const reduce = useReducedMotion();

  const isAddon = (p: any) =>
    (p.storeListingType || "").toLowerCase() === "add-on" ||
    p.productType === "Digital Add-on";
  const isBundle = (p: any) =>
    (p.storeListingType || "").toLowerCase() === "bundle" ||
    p.productType === "Digital Bundle";
  const kindOf = (p: any): Kind =>
    isAddon(p) ? "addon" : isBundle(p) ? "bundle" : "program";
  const isDigital = (p: any) =>
    ["Digital Program", "Digital Add-on", "Digital Bundle"].includes(
      p.productType || ""
    ) || Boolean(p.publicStoreVisible);
  // No saved-template count in the props — planned session count is the honest
  // real-data proxy (weeks x sessions/week).
  const workoutsOf = (p: any) =>
    (parseInt(p.durationWeeks || "", 10) || 0) *
    (parseInt(p.sessionsPerWeek || "", 10) || 0);
  const bundleMembers = (p: any) =>
    (p.bundleProgramIds || "").split(",").map((s: string) => s.trim()).filter(Boolean);

  // ---- board counts (all digital products, unfiltered) ----
  const digitalAll = (programs || []).filter(isDigital);
  const sumTotal = digitalAll.length;
  const sumPrograms = digitalAll.filter((p: any) => kindOf(p) === "program").length;
  const sumBundles = digitalAll.filter((p: any) => kindOf(p) === "bundle").length;
  const sumAddons = digitalAll.filter((p: any) => kindOf(p) === "addon").length;
  const sumWorkouts = digitalAll.reduce((a: number, p: any) => a + workoutsOf(p), 0);
  const needWork = digitalAll.filter(
    (p: any) => kindOf(p) === "program" && p.publicStoreVisible && workoutsOf(p) === 0
  ).length;

  // ---- filtered + grouped list (visibleProgramsOnly already filtered) ----
  const list = visibleProgramsOnly || [];
  const addonItems = list.filter((p: any) => kindOf(p) === "addon");
  const mainItems = list.filter((p: any) => kindOf(p) !== "addon");
  const groupMap = new Map<string, any[]>();
  for (const p of mainItems) {
    const key = (p.storeCategory || p.sport || "").trim() || "Uncategorised";
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key)!.push(p);
  }
  const groups: Array<{ title: string; items: any[] }> = Array.from(
    groupMap.entries()
  )
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([title, items]) => ({ title, items }));
  if (addonItems.length) groups.push({ title: "Add-ons", items: addonItems });
  const empty = !programsLoading && groups.length === 0;

  // secondary team/client filter value
  const secondaryValue = /^(team|client):/.test(savedProgramProductFilter || "")
    ? savedProgramProductFilter
    : "";

  const openDetail = (p: any) => {
    // Setting the selected id triggers the session-templates load (App effect);
    // no separate preview modal is opened — the slide-over shows everything.
    setSelectedSavedProgramId(p.programId);
    setSavedAssignableWorkouts([]);
    setShowProgramDetail(true);
  };

  const fade = reduce
    ? {}
    : { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } };

  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const metaLine = (p: any) => {
    const k = kindOf(p);
    if (k === "bundle") return `${bundleMembers(p).length} programs`;
    if (k === "addon") return p.goal || p.phase || "Add-on";
    const bits: string[] = [];
    if (p.level) bits.push(p.level);
    if (p.durationWeeks) {
      bits.push(
        `${p.durationWeeks} wk${p.sessionsPerWeek ? ` · ${p.sessionsPerWeek}/wk` : ""}`
      );
    }
    const w = workoutsOf(p);
    if (w) bits.push(`${w} workouts`);
    return bits.join(" · ");
  };

  const Row = (p: any) => {
    const k = kindOf(p);
    const meta = TYPE_META[k];
    const needsWork = k === "program" && workoutsOf(p) === 0;
    const dupPending = duplicatingProgramId === p.recordId;
    const delPending = deletingSavedProgramId === p.recordId;
    return (
      <div className="cplRow" key={p.recordId} onClick={() => openDetail(p)}>
        <div className="cplBadge" style={{ background: meta.bg, color: meta.color }}>
          <meta.Icon size={21} />
        </div>
        <div className="cplRowMain">
          <div className="cplRowName">
            <strong>{p.programName}</strong>
            {p.season && <span className="cplSeasonTag">S{p.season}</span>}
            {p.publicStoreVisible && (
              <span className="cplOnStore">
                <span className="cplDotGreen" /> On store
              </span>
            )}
          </div>
          <div className="cplRowMeta">
            <span>{metaLine(p)}</span>
            {needsWork && p.publicStoreVisible && (
              <>
                <span className="cplDot">·</span>
                <span className="cplNoWork">
                  <AlertTriangle size={12} /> No workouts yet
                </span>
              </>
            )}
          </div>
        </div>
        <div className="cplRowActions" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="cplIconBtn"
            title="Duplicate"
            disabled={dupPending}
            onClick={() => duplicateSavedProgram(p)}
          >
            <Copy size={15} />
          </button>
          <button
            type="button"
            className="cplIconBtn cplIconDanger"
            title="Delete"
            disabled={delPending}
            onClick={() =>
              confirmingId === p.recordId
                ? (deleteSavedProgram(p), setConfirmingId(null))
                : setConfirmingId(p.recordId)
            }
          >
            <Trash2 size={15} />
          </button>
          <button type="button" className="cplOpenBtn" onClick={() => openDetail(p)}>
            Open <ChevronRight size={14} />
          </button>
        </div>
      </div>
    );
  };

  const d = showProgramDetail ? selectedSavedProgram : null;

  return (
    <div className="coachProgramsLanding">
      {/* header */}
      <div className="cplHead">
        <div>
          <span className="cplEyebrow">
            <Dumbbell size={14} /> Digital Program
          </span>
          <h1>Programs</h1>
          <p>Build and manage every digital program, bundle, and add-on — grouped by sport.</p>
        </div>
        <button type="button" className="cplNewBtn" onClick={() => setCreateProgramOpen(true)}>
          <Plus size={17} /> New program
        </button>
      </div>

      {/* library board */}
      <div className="cplBoard">
        <div className="cplBoardLib">
          <div className="cplBoardGlow" />
          <span className="cplBoardEyebrow">Your digital library</span>
          <div className="cplBoardBig">
            <span>{sumTotal}</span>
            <small>programs, bundles &amp; add-ons</small>
          </div>
          <div className="cplBoardBreak">
            <span>
              <strong>{sumPrograms}</strong> programs
            </span>
            <span>
              <strong>{sumBundles}</strong> bundles
            </span>
            <span>
              <strong>{sumAddons}</strong> add-ons
            </span>
          </div>
        </div>
        <div className="cplBoardStat">
          <span className="cplBoardEyebrowLight">Total workouts</span>
          <div className="cplBoardBig">
            <span className="cplBoardBigDark">{sumWorkouts}</span>
            <small>built across all</small>
          </div>
          <p>
            <strong>{needWork}</strong> need workouts before selling.
          </p>
        </div>
      </div>

      {/* filter bar */}
      <div className="cplFilters">
        <div className="cplTypeTabs">
          {([
            ["All", "All"],
            ["type:Digital Program", "Programs"],
            ["type:Digital Bundle", "Bundles"],
            ["type:Digital Add-on", "Add-ons"],
          ] as const).map(([val, label]) => (
            <button
              key={val}
              type="button"
              className={savedProgramProductFilter === val ? "active" : ""}
              onClick={() => setSavedProgramProductFilter(val)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="cplFilterRight">
          {(teams?.length > 0 || coachVisibleClients?.length > 0) && (
            <select
              className="cplSecondary"
              value={secondaryValue}
              onChange={(e) =>
                setSavedProgramProductFilter(e.target.value || "All")
              }
            >
              <option value="">Everyone</option>
              {teams?.length > 0 && (
                <optgroup label="By team">
                  {teams.map((tm: any) => (
                    <option key={tm.id} value={`team:${tm.name}`}>
                      {tm.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {coachVisibleClients?.length > 0 && (
                <optgroup label="By client">
                  {coachVisibleClients.map((c: any) => (
                    <option key={c.id} value={`client:${c.clientCode || c.id}`}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          )}
          <div className="cplSearch">
            <Search size={16} />
            <input
              value={savedProgramSearch}
              onChange={(e) => setSavedProgramSearch(e.target.value)}
              placeholder="Search programs…"
            />
          </div>
          <button
            type="button"
            className="cplRefresh"
            title="Refresh"
            onClick={() => loadPrograms(true)}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* groups */}
      {programsLoading && (programs || []).length === 0 ? (
        <p className="cplLoading">Loading…</p>
      ) : empty ? (
        <div className="cplEmpty">
          <p className="cplEmptyTitle">No programs match</p>
          <p className="cplEmptySub">
            Try a different filter or search, or create a new program.
          </p>
        </div>
      ) : (
        groups.map((g) => (
          <div className="cplGroup" key={g.title}>
            <div className="cplGroupHead">
              <h2>{g.title}</h2>
              <span>{g.items.length}</span>
            </div>
            {g.items.map(Row)}
          </div>
        ))
      )}

      {/* ===== detail slide-over ===== */}
      <AnimatePresence>
        {d && (
          <motion.div
            className="cplSlideScrim"
            onClick={() => setShowProgramDetail(false)}
            {...fade}
            transition={{ duration: 0.16 }}
          >
            {(() => {
              const k = kindOf(d);
              const live = Boolean(d.publicStoreVisible);
              const builtFor =
                [clientNameForCode(d.builtForClient), d.builtForTeam]
                  .filter(Boolean)
                  .join(" · ") || "";
              const overview: Array<[string, string]> =
                k === "bundle"
                  ? [
                      ["Sport", d.storeCategory || d.sport || "—"],
                      ["Type", "Bundle"],
                      ["Programs", String(bundleMembers(d).length)],
                      ["Listed", live ? "On store" : "Draft"],
                    ]
                  : k === "addon"
                    ? [
                        ["Type", "Add-on"],
                        ["Focus", d.goal || "—"],
                        ["Attaches to", "Any program"],
                        ["Listed", live ? "On store" : "Draft"],
                      ]
                    : [
                        ["Sport", d.storeCategory || d.sport || "—"],
                        ["Level", d.level || "—"],
                        ["Focus", d.goal || "—"],
                        ["Duration", d.durationWeeks ? `${d.durationWeeks} weeks` : "—"],
                        ["Per week", d.sessionsPerWeek ? `${d.sessionsPerWeek} sessions` : "—"],
                        [
                          "Workouts",
                          workoutsOf(d) ? `${workoutsOf(d)} built` : "None yet",
                        ],
                      ];
              if (builtFor) overview.push(["Built for", builtFor]);
              const members =
                k === "bundle"
                  ? bundleMembers(d)
                      .map((pid: string) =>
                        (programs || []).find((x: any) => x.programId === pid)
                      )
                      .filter(Boolean)
                  : [];
              return (
                <motion.div
                  className="cplSlide"
                  onClick={(e) => e.stopPropagation()}
                  initial={reduce ? { opacity: 0 } : { x: "100%" }}
                  animate={reduce ? { opacity: 1 } : { x: 0 }}
                  exit={reduce ? { opacity: 0 } : { x: "100%" }}
                  transition={{ duration: 0.26, ease: EASE }}
                >
                  <div className="cplSlideHead">
                    <div>
                      <span className="cplEyebrow2">{TYPE_META[k].label}</span>
                      <h2>{d.programName}</h2>
                      <div className="cplSlidePills">
                        {live ? (
                          <span className="cplPillLive">
                            <span className="cplDotGreen" /> Live on store
                          </span>
                        ) : (
                          <span className="cplPillDraft">Draft</span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="cplSlideClose"
                      onClick={() => setShowProgramDetail(false)}
                    >
                      <X size={17} />
                    </button>
                  </div>

                  <div className="cplSlideBody">
                    <button
                      type="button"
                      className="cplOpenBuilder"
                      disabled={savedTemplatesLoading}
                      onClick={() => loadSavedProgramIntoBuilder()}
                    >
                      <Dumbbell size={17} /> Open in the builder
                    </button>

                    <div className="cplSectionLabel">Overview</div>
                    <div className="cplOverviewGrid">
                      {overview.map(([kk, vv], i) => (
                        <div className="cplOverviewCell" key={i}>
                          <span>{kk}</span>
                          <strong>{vv}</strong>
                        </div>
                      ))}
                    </div>

                    {k === "bundle" && members.length > 0 && (
                      <>
                        <div className="cplSectionLabel">Included programs</div>
                        <div className="cplList">
                          {members.map((m: any) => (
                            <div className="cplMiniRow" key={m.recordId}>
                              <span
                                className="cplMiniBadge"
                                style={{ background: "#e8f0ff", color: "#1f5fd6" }}
                              >
                                <Dumbbell size={15} />
                              </span>
                              <span className="cplMiniName">{m.programName}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {k === "program" && (
                      <>
                        <div className="cplSectionLabel">
                          Sessions
                          {savedProgramSessions?.length > 0 && (
                            <span className="cplSectionCount">
                              {" "}
                              · {savedProgramSessions.length}
                            </span>
                          )}
                        </div>
                        {savedTemplatesLoading ? (
                          <p className="cplHint">Loading sessions…</p>
                        ) : (savedProgramSessions || []).length === 0 ? (
                          <p className="cplHint">
                            No sessions built for this program yet.
                          </p>
                        ) : (
                          <div className="cplList">
                            {savedProgramSessions.map((s: any) => (
                              <div className="cplMiniRow" key={s.localId}>
                                <span className="cplMiniTag">
                                  W{s.week}·D{s.day}
                                </span>
                                <span className="cplMiniName">
                                  {s.sessionName || "Untitled"}
                                </span>
                                <span className="cplMiniDetail">
                                  {(s.exercises || []).length} exercises
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}

                    {/* assign */}
                    <div className="cplSectionLabel">Assign to client</div>
                    <div className="cplAssign">
                      <div className="cplAssignRow">
                        <label className="cplField cplFieldGrow">
                          <span>Client</span>
                          <select
                            value={savedAssignClientId}
                            onChange={(e) => setSavedAssignClientId(e.target.value)}
                          >
                            <option value="">Select client</option>
                            {(clients || []).map((c: any) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="cplField cplFieldDate">
                          <span>Start date</span>
                          <input
                            type="date"
                            value={savedAssignStartDate}
                            onChange={(e) => setSavedAssignStartDate(e.target.value)}
                          />
                        </label>
                      </div>
                      <div className="cplAssignActions">
                        <button
                          type="button"
                          className="cplBtnGhost"
                          disabled={savedAssignLoading}
                          onClick={loadSavedProgramSessionsForAssignment}
                        >
                          {savedAssignLoading ? "Loading…" : "Load sessions"}
                        </button>
                        <button
                          type="button"
                          className="cplBtnGold"
                          disabled={savedAssigningProgram}
                          onClick={assignSavedProgramToClient}
                        >
                          {savedAssigningProgram ? "Assigning…" : "Assign program"}
                        </button>
                      </div>
                      {(savedAssignableWorkouts || []).length > 0 && (
                        <div className="cplAssignWorkouts">
                          {savedAssignableWorkouts.map((w: any) => (
                            <div className="cplAssignWorkout" key={w.localId}>
                              <span>
                                W{w.week}·D{w.day}
                              </span>
                              <strong>{w.sessionName}</strong>
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
                      )}
                    </div>

                    <div className="cplSlideActions">
                      <button
                        type="button"
                        className="cplBtnGhost cplBtnHalf"
                        disabled={duplicatingProgramId === d.recordId}
                        onClick={() => duplicateSavedProgram(d)}
                      >
                        <Copy size={15} /> Duplicate
                      </button>
                      <button
                        type="button"
                        className="cplBtnDanger cplBtnHalf"
                        disabled={deletingSavedProgramId === d.recordId}
                        onClick={() => deleteSavedProgram(d)}
                      >
                        <Trash2 size={15} />{" "}
                        {deletingSavedProgramId === d.recordId
                          ? "Deleting…"
                          : "Delete"}
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
