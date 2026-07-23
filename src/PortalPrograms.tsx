// Client "My Programs" flow. A sport-grouped card list routes by derived
// status: in-progress -> dashboard (the existing renderProgramHome), not-started
// -> overview -> schedule (the existing scheduler, restyled), completed -> recap.
// View-layer only: all data/handlers arrive via props and are reused as-is.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Grid3x3,
  MoreVertical,
  RotateCcw,
  Store,
  X,
} from "lucide-react";
import type { ClientProgramScheduleMode } from "./appCore";
import { addDays } from "./appCore";
import "./PortalPrograms.css";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

type FlowView =
  | "list"
  | "overview"
  | "schedule"
  | "dashboard"
  | "completed"
  | "store";

export default function PortalPrograms(props: { [key: string]: any }) {
  const {
    t,
    paceZh,
    uniqueClientPurchasedPrograms,
    clientProgramStatuses,
    selectedClientProgram,
    setSelectedClientProgramId,
    localizedProgramName,
    localizedProductType,
    localizedAssignableWorkoutName,
    localizedCalendarLabel,
    // dashboard (in-progress)
    clientProgramDashboard,
    openWorkout,
    rescheduleClientWorkout,
    restartClientProgram,
    renderProgramHome,
    // scheduler
    clientProgramScheduleMode,
    setClientProgramScheduleMode,
    clientProgramStartDate,
    setClientProgramStartDate,
    clientProgramWeekNumbers,
    clientProgramWeekStarts,
    setClientProgramWeekStarts,
    clientProgramSessions,
    setClientProgramSessions,
    clientProgramScheduledWorkouts,
    setClientProgramDayDates,
    loadClientProgramSessions,
    loadingClientProgramSessions,
    populateClientProgramCalendar,
    populatingClientProgram,
    // progress / dashboard
    renderProgramStore,
    selectedClientProgramAlreadyLoaded,
    setClientTab,
  } = props;

  const reduce = useReducedMotion();
  const [view, setView] = useState<FlowView>("list");
  const [overviewSeg, setOverviewSeg] = useState<"overview" | "sessions">(
    "overview"
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const screen = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.4, ease: EASE },
      };

  const statusOf = (program: any) =>
    (program && clientProgramStatuses?.[program.recordId]) || {
      status: "not-started" as const,
      done: 0,
      total: 0,
      currentWeek: 0,
      totalWeeks: Number(program?.durationWeeks) || 0,
    };

  const sportAbbr = (sport?: string, name?: string) => {
    const src = (sport || name || "NL").trim();
    const parts = src.split(/\s+/).filter(Boolean);
    const letters =
      parts.length >= 2
        ? parts[0][0] + parts[1][0]
        : src.replace(/[^A-Za-z㐀-鿿]/g, "").slice(0, 2);
    return (letters || "NL").toUpperCase();
  };

  const programMeta = (program: any) => {
    const wk = program?.durationWeeks || "--";
    const per = program?.sessionsPerWeek || "--";
    return paceZh
      ? `${program?.sport || "训练"} · ${wk} 周 · 每周 ${per} 次`
      : `${program?.sport || "Training"} · ${wk} wks · ${per}×/wk`;
  };

  const goToProgram = (program: any) => {
    setSelectedClientProgramId(program.recordId);
    setClientProgramSessions([]);
    setClientProgramDayDates({});
    setClientProgramWeekStarts({});
    const st = statusOf(program).status;
    if (st === "in-progress") setView("dashboard");
    else if (st === "completed") setView("completed");
    else {
      setOverviewSeg("overview");
      setView("overview");
      void loadClientProgramSessions(program);
    }
  };

  const backToList = () => setView("list");

  // ---------------- empty state ----------------
  if (uniqueClientPurchasedPrograms.length === 0) {
    return (
      <div className="ppFlow">
        <div className="ppEmpty">
          <BookOpen size={34} strokeWidth={1.8} />
          <h3>{t("noPurchasedPrograms")}</h3>
          <p>
            {paceZh
              ? "购买或由教练配置后，你的数字训练计划会显示在这里。"
              : "Your purchased digital programs will appear here after checkout or coach setup."}
          </p>
        </div>
      </div>
    );
  }

  // ---------------- LIST ----------------
  if (view === "list") {
    const bySport = new Map<string, any[]>();
    for (const program of uniqueClientPurchasedPrograms) {
      const sport = program.sport || (paceZh ? "训练" : "Training");
      if (!bySport.has(sport)) bySport.set(sport, []);
      bySport.get(sport)!.push(program);
    }
    // Groups with an in-progress program float to the top.
    const groups = [...bySport.entries()].sort((a, b) => {
      const aActive = a[1].some((p) => statusOf(p).status === "in-progress");
      const bActive = b[1].some((p) => statusOf(p).status === "in-progress");
      return aActive === bActive ? 0 : aActive ? -1 : 1;
    });

    const statusPill = (program: any) => {
      const st = statusOf(program);
      if (st.status === "in-progress") {
        return (
          <span className="ppTag ppTagActive">
            {paceZh
              ? `● 进行中 · 第 ${st.currentWeek} 周`
              : `● In progress · Week ${st.currentWeek}`}
          </span>
        );
      }
      if (st.status === "completed") {
        return (
          <span className="ppTag ppTagDone">
            {paceZh ? "✓ 已完成" : "✓ Completed"}
          </span>
        );
      }
      return (
        <span className="ppTag ppTagNew">
          {paceZh ? "○ 未开始" : "○ Not started"}
        </span>
      );
    };

    return (
      <motion.div className="ppFlow" {...screen}>
        <div className="ppListHead">
          <div>
            <span className="ppKicker">{paceZh ? "你的训练" : "Your training"}</span>
            <h2>{t("myPrograms")}</h2>
          </div>
          <button
            type="button"
            className="ppStoreBtn"
            onClick={() => setView("store")}
          >
            <Store size={15} /> {paceZh ? "商店" : "Store"}
          </button>
        </div>

        {groups.map(([sport, items]) => (
          <div className="ppGroup" key={sport}>
            <div className="ppGroupHead">
              <span>{sport}</span>
              <i />
            </div>
            {items.map((program) => {
              const st = statusOf(program);
              return (
                <button
                  type="button"
                  className={`ppCard${st.status === "completed" ? " ppCardDim" : ""}`}
                  key={program.recordId}
                  onClick={() => goToProgram(program)}
                >
                  <span className="ppCardAbbr">
                    {sportAbbr(program.sport, program.programName)}
                  </span>
                  <span className="ppCardBody">
                    <strong>{localizedProgramName(program)}</strong>
                    <small>{programMeta(program)}</small>
                    <span className="ppCardTagRow">{statusPill(program)}</span>
                  </span>
                  <ChevronRight size={20} className="ppCardChevron" />
                </button>
              );
            })}
          </div>
        ))}

        {/* Ghost CTA to the store — gives short/empty lists a next step. */}
        <button
          type="button"
          className="ppBrowseStoreBtn"
          onClick={() => setView("store")}
        >
          <Store size={16} />
          {paceZh ? "浏览商店，发现更多训练计划" : "Browse the store for more programs"}
          <ChevronRight size={16} />
        </button>
      </motion.div>
    );
  }

  // ---------------- STORE (upsell) ----------------
  if (view === "store") {
    return (
      <motion.div className="ppFlow" {...screen}>
        <button type="button" className="ppBack" onClick={backToList}>
          <ChevronLeft size={16} /> {t("myPrograms")}
        </button>
        {renderProgramStore()}
      </motion.div>
    );
  }

  const program = selectedClientProgram;
  const st = statusOf(program);

  // ---------------- DASHBOARD (in-progress) — compact design ----------------
  if (view === "dashboard") {
    const d = clientProgramDashboard;
    const ring = 339;
    const encouragement = d
      ? d.done === 0
        ? paceZh
          ? "先完成第一节训练。"
          : "Let's get the first one in."
        : paceZh
          ? "干得漂亮 —— 保持连胜。"
          : "Strong work — keep the streak alive."
      : "";
    const handleRestart = async () => {
      setMenuOpen(false);
      const proceed = window.confirm(
        paceZh
          ? "重新开始将删除这个计划已排的训练数据，确定继续吗？"
          : "Your data will be deleted if you restart. Do you want to proceed?"
      );
      if (!proceed) return;
      const ok = await restartClientProgram(program);
      if (ok) setView("schedule");
    };

    return (
      <motion.div className="ppFlow ppDash" {...screen}>
        <div className="ppDashTopRow">
          <button type="button" className="ppBack" onClick={backToList}>
            <ChevronLeft size={16} /> {t("myPrograms")}
          </button>
          <div className="ppDashActions">
            {d && (
              <span className="ppWeekPill">
                {t("week")} {d.currentWeek}/{d.maxWeek}
              </span>
            )}
            <div className="ppMenuWrap">
              <button
                type="button"
                className="ppMenuBtn"
                aria-label={paceZh ? "菜单" : "Menu"}
                onClick={() => setMenuOpen((o) => !o)}
              >
                <MoreVertical size={18} />
              </button>
              {menuOpen && (
                <>
                  <div className="ppMenuScrim" onClick={() => setMenuOpen(false)} />
                  <div className="ppMenu" role="menu">
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        setOverviewSeg("overview");
                        setView("overview");
                      }}
                    >
                      <BookOpen size={15} />
                      {paceZh ? "计划指南" : "Program guide"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        setEditOpen(true);
                      }}
                    >
                      <CalendarDays size={15} />
                      {paceZh ? "编辑训练日期" : "Edit workouts"}
                    </button>
                    <button
                      type="button"
                      className="ppMenuDanger"
                      onClick={handleRestart}
                    >
                      <RotateCcw size={15} />
                      {paceZh ? "重新开始计划" : "Restart program"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="ppDashTitle">
          <span className="ppKicker">
            {program?.sport || (paceZh ? "训练" : "Training")}
          </span>
          <h2>{localizedProgramName(program)}</h2>
        </div>

        {!selectedClientProgramAlreadyLoaded || !d ? (
          <div className="ppEmpty">
            <BookOpen size={30} strokeWidth={1.8} />
            <p>
              {paceZh
                ? "先把计划加入日历，这里会显示你的进度。"
                : "Load this program into your calendar to see your progress here."}
            </p>
            <button
              type="button"
              className="ppPrimary"
              onClick={() => setView("schedule")}
            >
              {paceZh ? "加入日历" : "Load into calendar"} <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          <>
            <div className="ppHero">
              <div className="ppRing">
                <svg viewBox="0 0 120 120">
                  <circle
                    cx="60"
                    cy="60"
                    r="54"
                    fill="none"
                    stroke="rgba(255,255,255,.14)"
                    strokeWidth="11"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="54"
                    fill="none"
                    stroke="#d4af37"
                    strokeWidth="11"
                    strokeLinecap="round"
                    strokeDasharray={ring}
                    strokeDashoffset={ring - (ring * d.pct) / 100}
                    transform="rotate(-90 60 60)"
                  />
                </svg>
                <span className="ppRingPct">{d.pct}%</span>
              </div>
              <div className="ppHeroText">
                <span>
                  {paceZh
                    ? `你已完成这个计划的 ${d.pct}%`
                    : `You're ${d.pct}% through this program`}
                </span>
                <strong>
                  {d.done} {paceZh ? "/" : "of"} {d.total}{" "}
                  {paceZh ? "节训练" : "sessions"}
                </strong>
                <em>{encouragement}</em>
              </div>
            </div>

            {d.next && (
              <>
                <div className="ppSectionLabel">
                  {paceZh ? "下一节" : "Up next"}
                </div>
                <div className="ppNextCard">
                  <div className="ppNextTop">
                    <span className="ppNextDay">D{d.next.day}</span>
                    <div>
                      <strong>{localizedAssignableWorkoutName(d.next)}</strong>
                      <small>
                        {t("week")} {d.next.week} · {t("day")} {d.next.day}
                        {(() => {
                          const dt = new Date(
                            `${String(d.next.scheduledDate || "")}T00:00:00`
                          );
                          return isNaN(dt.getTime())
                            ? ""
                            : ` · ${localizedCalendarLabel(d.next.scheduledDate)}`;
                        })()}
                      </small>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="ppPrimary ppWide"
                    onClick={() => openWorkout(d.next)}
                  >
                    {paceZh ? "开始训练" : "Start session"} <ArrowRight size={16} />
                  </button>
                </div>
              </>
            )}

            <div className="ppSectionRow">
              <span className="ppSectionLabel">
                {paceZh ? "本周" : "This week"}
              </span>
              <button
                type="button"
                className="ppLink"
                onClick={() => setClientTab("Training")}
              >
                {paceZh ? "完整日历 ›" : "Full calendar ›"}
              </button>
            </div>
            <div className="ppWeekStrip">
              {d.weekChips.length === 0 ? (
                <span className="ppMuted">
                  {paceZh ? "本周暂无训练。" : "Nothing scheduled this week."}
                </span>
              ) : (
                d.weekChips.map((c: any, i: number) => (
                  <div className={`ppDayChip ${c.state}`} key={c.id || i}>
                    <span className="ppDayLabel">{c.label}</span>
                    <span className="ppDayMark">
                      {c.state === "done" ? "✓" : c.state === "today" ? "●" : "○"}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="ppDashStats">
              <div>
                <strong>{d.adherence}%</strong>
                <span>{paceZh ? "完成度" : "Adherence"}</span>
              </div>
              <div>
                <strong>{d.dayStreak}</strong>
                <span>{paceZh ? "连续天数" : "Day streak"}</span>
              </div>
              <div>
                <strong>{d.prCount}</strong>
                <span>{paceZh ? "个人纪录" : "PRs"}</span>
              </div>
            </div>
          </>
        )}

        {editOpen && (
          <div className="ppModalScrim" onClick={() => setEditOpen(false)}>
            <div
              className="ppModal"
              role="dialog"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="ppModalHead">
                <h3>{paceZh ? "编辑训练日期" : "Edit workout dates"}</h3>
                <button
                  type="button"
                  className="ppModalClose"
                  onClick={() => setEditOpen(false)}
                  aria-label={paceZh ? "关闭" : "Close"}
                >
                  <X size={18} />
                </button>
              </div>
              <p className="ppModalSub">
                {paceZh
                  ? "调整还未完成的训练日期。"
                  : "Move the dates of the sessions you have left."}
              </p>
              <div className="ppModalList">
                {(d?.remaining || []).length === 0 ? (
                  <p className="ppMuted">
                    {paceZh ? "没有待完成的训练。" : "No sessions left to move."}
                  </p>
                ) : (
                  (d?.remaining || []).map((w: any) => (
                    <label className="ppDateRow" key={w.id}>
                      <span>
                        <b>{localizedAssignableWorkoutName(w)}</b>
                        <small>
                          {t("week")} {w.week} · {t("day")} {w.day}
                        </small>
                      </span>
                      <input
                        type="date"
                        defaultValue={w.scheduledDate}
                        onChange={(e) =>
                          rescheduleClientWorkout(w.id, e.target.value)
                        }
                      />
                    </label>
                  ))
                )}
              </div>
              <button
                type="button"
                className="ppPrimary ppWide"
                onClick={() => setEditOpen(false)}
              >
                {paceZh ? "完成" : "Done"}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    );
  }

  // ---------------- COMPLETED recap ----------------
  if (view === "completed") {
    return (
      <motion.div className="ppFlow ppRecap" {...screen}>
        <button type="button" className="ppBack" onClick={backToList}>
          <ChevronLeft size={16} /> {t("myPrograms")}
        </button>
        <div className="ppRecapKicker">
          {paceZh ? "计划完成" : "PROGRAM COMPLETE"}
        </div>
        <h2 className="ppRecapName">{localizedProgramName(program)}</h2>
        {renderProgramHome?.()}
      </motion.div>
    );
  }

  // ---------------- OVERVIEW (not-started) ----------------
  if (view === "overview") {
    const desc =
      (paceZh &&
        (program?.storeDescriptionCn || program?.salesDescriptionCn)) ||
      program?.storeDescription ||
      program?.salesDescription ||
      (paceZh
        ? "专业、循证、可执行的训练周期。"
        : "Professional, evidence-based training you can schedule around real life.");
    const goal = paceZh ? program?.goalCn || program?.goal : program?.goal;

    return (
      <motion.div className="ppFlow" {...screen}>
        <button type="button" className="ppBack" onClick={backToList}>
          <ChevronLeft size={16} /> {t("myPrograms")}
        </button>
        <div className="ppOvHead">
          <span className="ppKicker">
            {localizedProductType
              ? localizedProductType(program?.productType)
              : program?.sport}
          </span>
          <h2>{localizedProgramName(program)}</h2>
          <p>{programMeta(program)}</p>
        </div>

        <div className="ppSeg">
          <span
            className="ppSegThumb"
            style={{
              transform:
                overviewSeg === "overview" ? "translateX(0)" : "translateX(100%)",
            }}
          />
          <button
            type="button"
            className={overviewSeg === "overview" ? "active" : ""}
            onClick={() => setOverviewSeg("overview")}
          >
            {paceZh ? "概览" : "Overview"}
          </button>
          <button
            type="button"
            className={overviewSeg === "sessions" ? "active" : ""}
            onClick={() => setOverviewSeg("sessions")}
          >
            {paceZh ? "训练节次" : "Sessions"}
          </button>
        </div>

        {overviewSeg === "overview" ? (
          <div className="ppOvBody">
            <div className="ppStatTiles">
              <div>
                <strong>{program?.durationWeeks || "--"}</strong>
                <span>{paceZh ? "周" : "Weeks"}</span>
              </div>
              <div>
                <strong>{program?.sessionsPerWeek || "--"}</strong>
                <span>{paceZh ? "每周" : "Per week"}</span>
              </div>
              <div>
                <strong>{program?.level || (paceZh ? "多水平" : "All")}</strong>
                <span>{paceZh ? "水平" : "Level"}</span>
              </div>
            </div>
            <p className="ppOvDesc">{desc}</p>
            {goal && (
              <div className="ppOvBuild">
                <div className="ppOvBuildTitle">
                  {paceZh ? "你将获得" : "What you'll build"}
                </div>
                <p>{goal}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="ppSessionList">
            {loadingClientProgramSessions && clientProgramSessions.length === 0 ? (
              <p className="ppMuted">{t("loadingWorkouts")}</p>
            ) : clientProgramScheduledWorkouts.length === 0 ? (
              <p className="ppMuted">
                {paceZh ? "暂无课表预览。" : "No sample sessions yet."}
              </p>
            ) : (
              clientProgramScheduledWorkouts.map((w: any) => (
                <div className="ppSessionRow" key={w.localId}>
                  <span className="ppSessionDay">D{w.day}</span>
                  <div>
                    <strong>{localizedAssignableWorkoutName(w)}</strong>
                    <small>
                      {t("week")} {w.week} · {t("day")} {w.day}
                    </small>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        <div className="ppStickyBar">
          <button
            type="button"
            className="ppPrimary ppWide"
            onClick={() => setView("schedule")}
          >
            {paceZh ? "加入我的日历" : "Load into your calendar"}{" "}
            <ArrowRight size={16} />
          </button>
        </div>
      </motion.div>
    );
  }

  // ---------------- SCHEDULE (reuses the existing scheduler) ----------------
  const modeCards: Array<{
    mode: ClientProgramScheduleMode;
    icon: any;
    title: string;
    body: string;
  }> = [
    {
      mode: "Month",
      icon: Calendar,
      title: paceZh ? "按月" : "By month",
      body: paceZh
        ? "按顺序自动排入每一周。"
        : "Auto-fill each week in order, month by month.",
    },
    {
      mode: "Week",
      icon: CalendarDays,
      title: paceZh ? "按周" : "By week",
      body: paceZh
        ? "为每个训练周选择开始日。"
        : "Pick the start day for each training week.",
    },
    {
      mode: "Day",
      icon: Grid3x3,
      title: paceZh ? "逐日" : "Day by day",
      body: paceZh
        ? "自己安排每一节训练。"
        : "Place every single session yourself.",
    },
  ];

  return (
    <motion.div className="ppFlow ppSchedule" {...screen}>
      <button
        type="button"
        className="ppBack"
        onClick={() => setView(st.status === "completed" ? "completed" : "overview")}
      >
        <ChevronLeft size={16} /> {localizedProgramName(program)}
      </button>
      <div className="ppSchedHead">
        <span className="ppKicker">
          {paceZh ? "排程" : "Schedule"} {localizedProgramName(program)}
        </span>
        <h2>{paceZh ? "如何安排这个计划？" : "How should we place it?"}</h2>
      </div>

      <div className="ppModeCards">
        {modeCards.map(({ mode, icon: Icon, title, body }) => {
          const active = clientProgramScheduleMode === mode;
          return (
            <button
              type="button"
              className={`ppModeCard${active ? " active" : ""}`}
              key={mode}
              onClick={() => setClientProgramScheduleMode(mode)}
            >
              <span className="ppModeIcon">
                <Icon size={22} />
              </span>
              <span className="ppModeText">
                <strong>{title}</strong>
                <small>{body}</small>
              </span>
              <span className={`ppRadio${active ? " on" : ""}`} />
            </button>
          );
        })}
      </div>

      <label className="ppField">
        <span>{t("programStartDate")}</span>
        <input
          type="date"
          value={clientProgramStartDate}
          onChange={(e) => setClientProgramStartDate(e.target.value)}
        />
      </label>

      {clientProgramSessions.length === 0 && (
        <button
          type="button"
          className="ppSecondary ppWide"
          onClick={() => loadClientProgramSessions(program)}
          disabled={loadingClientProgramSessions || !program}
        >
          {loadingClientProgramSessions ? t("loadingWorkouts") : t("previewDates")}
        </button>
      )}

      {clientProgramScheduleMode === "Week" &&
        clientProgramWeekNumbers.length > 0 && (
          <div className="ppDateBlock">
            <span className="ppBlockLabel">
              {paceZh ? "设置每周开始日" : "Set each week's start day"}
            </span>
            {clientProgramWeekNumbers.map((week: any) => (
              <label className="ppDateRow" key={week}>
                <span>{t("weekStarts", { week })}</span>
                <input
                  type="date"
                  value={
                    clientProgramWeekStarts[String(week)] ||
                    addDays(clientProgramStartDate, (Number(week) - 1) * 7)
                  }
                  onChange={(e) =>
                    setClientProgramWeekStarts((current: any) => ({
                      ...current,
                      [String(week)]: e.target.value,
                    }))
                  }
                />
              </label>
            ))}
          </div>
        )}

      {clientProgramScheduleMode === "Day" &&
        clientProgramSessions.length > 0 && (
          <div className="ppDateBlock">
            <span className="ppBlockLabel">
              {paceZh ? "安排每一节训练" : "Place each session"}
            </span>
            {clientProgramScheduledWorkouts.map((w: any) => (
              <label className="ppDateRow" key={w.localId}>
                <span>
                  <b>{localizedAssignableWorkoutName(w)}</b>
                  <small>
                    {t("week")} {w.week} · {t("day")} {w.day}
                  </small>
                </span>
                <input
                  type="date"
                  value={w.scheduledDate}
                  onChange={(e) =>
                    setClientProgramDayDates((current: any) => ({
                      ...current,
                      [w.localId]: e.target.value,
                    }))
                  }
                />
              </label>
            ))}
          </div>
        )}

      {clientProgramScheduleMode === "Month" &&
        clientProgramScheduledWorkouts.length > 0 && (
          <div className="ppPreviewCard">
            <div className="ppPreviewHead">
              <span>{t("atAGlance")}</span>
            </div>
            {clientProgramScheduledWorkouts.slice(0, 6).map((w: any) => (
              <div className="ppPreviewRow" key={w.localId}>
                <span>
                  <b>{localizedAssignableWorkoutName(w)}</b> · {t("week")} {w.week} D
                  {w.day}
                </span>
                <time>{localizedCalendarLabel(w.scheduledDate)}</time>
              </div>
            ))}
          </div>
        )}

      <div className="ppStickyBar">
        <button
          type="button"
          className="ppPrimary ppWide"
          onClick={populateClientProgramCalendar}
          disabled={
            populatingClientProgram ||
            selectedClientProgramAlreadyLoaded ||
            clientProgramScheduledWorkouts.length === 0
          }
        >
          {selectedClientProgramAlreadyLoaded
            ? paceZh
              ? "已加入日历"
              : "Already loaded"
            : populatingClientProgram
              ? t("submitting")
              : paceZh
                ? "添加到我的日历"
                : "Add to my calendar"}
        </button>
      </div>
    </motion.div>
  );
}
