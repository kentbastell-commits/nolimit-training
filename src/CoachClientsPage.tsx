// Coach Clients roster — redesigned to match the Store / Digital Program pages
// (dark board, segmented filters, grouped rows, optional quick-view slide-over).
// Row click opens the full client workspace; the eye action opens quick view.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useState } from "react";
import { clientTags, tagStyle } from "./clientIdentity";
import ClientActionMenu from "./ClientActionMenu";
import type { Client } from "./appCore";
import { primaryCoachValue } from "./coachAssignment";
import { useTranslation } from "react-i18next";
import { coachingToday } from "./coachingCalendar";
import "./CoachClientsPage.css";
import {
  CalendarDays,
  Check,
  ChevronRight,
  MoreHorizontal,
  Link2,
  Plus,
  RefreshCw,
  Search,
  UserCircle,
  Users,
} from "lucide-react";

const AVATAR_PALETTE = [
  { bg: "#e8f0ff", fg: "#1f5fd6" },
  { bg: "#fdeaee", fg: "#a32f3e" },
  { bg: "#e9f6ee", fg: "#237a30" },
  { bg: "#f3ecfb", fg: "#6a2f9e" },
  { bg: "#fdf0e1", fg: "#9a6a12" },
  { bg: "#e6f6f7", fg: "#0c7382" },
  { bg: "#ecedf6", fg: "#3a4a8a" },
  { bg: "#fbe9f6", fg: "#97287f" },
];
const avatarColor = (name: string) => {
  let h = 0;
  for (let i = 0; i < (name || "").length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
};
const ringColorOf = (pct: number | null) =>
  pct == null ? "#a8a091" : pct >= 80 ? "#1f7a43" : pct >= 50 ? "#9a7b1f" : "#8b1e2d";
const CIRC = 94.2;

export default function CoachClientsPage(props: { [key: string]: any }) {
  const { t } = useTranslation();
  const {
    loading,
    activityState = "ready",
    todayValue,
    activeCoaches,
    buildClientPortalLink,
    bulkAddTag,
    bulkAddToTeam,
    bulkAssignProgram,
    bulkBusy,
    bulkCopyLinks,
    bulkPanel,
    bulkProgramId,
    bulkStartDate,
    bulkTag,
    bulkTeamId,
    clearRosterSelection,
    clientBucket,
    clientBuckets,
    clientEngagement,
    clientNeedsContact,
    clientNeedsProgramming,
    clients,
    clientSearch,
    clientStatusFilter,
    clientStatusOptions,
    clientTeams,
    clientWeekLoadZone,
    coachInviteLink,
    coachScope,
    copyToClipboard,
    loadClients,
    openAccountModal,
    openNewClientForm,
    openCoachAssignment,
    getCoachDisplayName,
    paceZh,
    programs,

    rosterClients,
    rosterGroupBy,
    rosterGroups,
    rosterSelectedIds,
    rosterTriage,
    setBulkPanel,
    setBulkProgramId,
    setBulkStartDate,
    setBulkTag,
    setBulkTeamId,
    setClientBucket,
    setClientSearch,
    setClientStatusFilter,
    setClientTab,
    setCoachScope,
    setRosterGroupBy,
    setRosterTriage,
    setSelectedClient,
    setCoachDashTab,
    teams,
    toggleRosterSelect,
    triageCounts,
    triageDefs,
  } = props;

  const [groupView, setGroupView] = useState<
    "none" | "online" | "inperson" | "team"
  >(rosterGroupBy === "team" ? "team" : "none");
  const [inviteCopied, setInviteCopied] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [rowMenu, setRowMenu] = useState<{ client: Client; x: number; y: number } | null>(null);
  const closeRowMenu = useCallback(() => setRowMenu(null), []);
  const navigateClient = (client: Client, view: string) => {
    setSelectedClient(client);
    setClientTab(view === "Progress" ? "Home" : view);
    setCoachDashTab(view === "Progress" ? "science" : "activity");
  };

  // ---- board (from the full clients list, stable across filters) ----
  const all = (clients as any[]) || [];
  const isActive = (c: any) => (c.status || "Active") === "Active";
  const isOnline = (c: any) => /online/i.test(c.clientType || "");
  const isInPerson = (c: any) => /in.?person/i.test(c.clientType || "");
  const hasAttention = (c: any) => {
    const lz = clientWeekLoadZone(c);
    return (
      clientNeedsProgramming(c) ||
      (activityState === "ready" && clientEngagement(c).ending) ||
      (lz && (lz.cls === "loadZoneWarn" || lz.cls === "loadZoneRisk"))
    );
  };
  const activeAll = all.filter(isActive);
  const sumActive = activeAll.length;
  const sumOnline = activeAll.filter(isOnline).length;
  const sumInPerson = activeAll.filter(isInPerson).length;
  const sumTeams = (teams as any[])?.length || 0;
  // Active roster only, like every sibling tile above. Counting `all` meant
  // paused/archived athletes kept the number red forever — it read "5 flagged"
  // against a roster of 5 and could never reach zero, so it stopped being a
  // signal. The triage chips below already count the visible roster.
  const sumAttention = activeAll.filter(hasAttention).length;
  const withPct = all
    .map((c) => clientEngagement(c).compliance)
    .filter((p: any) => p != null) as number[];
  const sumAvg = withPct.length
    ? Math.round(withPct.reduce((a, b) => a + b, 0) / withPct.length)
    : null;

  // ---- bucket segmented (All / Active / Paused only) ----
  const bucketCount = (name: string) =>
    (clientBuckets as any[]).find((b) => b.name === name)?.count ?? 0;
  const BUCKETS: Array<[string, string]> = [
    ["All Clients", "All"],
    ["Active", "Active"],
    ["Paused", "Paused"],
  ];

  const onGroupChange = (v: any) => {
    setGroupView(v);
    setRosterGroupBy(v === "team" ? "team" : "none");
  };

  // ---- rows to render ----
  const flatFor = () => {
    let list = (rosterClients as any[]) || [];
    if (groupView === "online") list = list.filter(isOnline);
    else if (groupView === "inperson") list = list.filter(isInPerson);
    return list;
  };
  const renderGroups: Array<{ showTitle: boolean; label: string; clients: any[] }> =
    groupView === "team"
      ? (rosterGroups as any[]).map((g) => ({
          showTitle: rosterGroupBy !== "none",
          label: g.label,
          clients: g.clients,
        }))
      : [{ showTitle: false, label: "", clients: flatFor() }];
  const totalShown = renderGroups.reduce((a, g) => a + g.clients.length, 0);

  const copyInvite = () => {
    void copyToClipboard(coachInviteLink, "Invite link");
    setInviteCopied(true);
    window.setTimeout(() => setInviteCopied(false), 1800);
  };

  const flagsFor = (c: any) => {
    const out: Array<{ label: string; cls: string }> = [];
    if (clientNeedsProgramming(c)) out.push({ label: t("noScheduledPlan"), cls: "crpFlagProgram" });
    if (clientNeedsContact(c)) out.push({ label: t("dailyAccountSetup"), cls: "crpFlagContact" });
    const activity = clientEngagement(c);
    if (activityState === "ready" && activity.ending) out.push({ label: t("dailyEnds", { date: activity.end }), cls: "crpFlagProgram" });
    const lz = clientWeekLoadZone(c);
    if (lz && (lz.cls === "loadZoneWarn" || lz.cls === "loadZoneRisk")) {
      out.push({
        label: `${paceZh ? "负荷" : "Load"} · ${lz.label}`,
        cls: "crpFlagLoad",
      });
    }
    return out;
  };

  const seenLabel = (c: any) => {
    const eng = clientEngagement(c);
    if (activityState !== "ready" || eng.activityReady === false) return t(activityState === "loading" ? "loading" : "dailyActivityUnavailable");
    return eng.lastActivity || eng.lastCompleted ? t("dailyActivity", { date: eng.lastActivity || eng.lastCompleted }) : t("dailyNoActivity");
  };

  const Row = (c: any) => {
    const col = avatarColor(c.name || "");
    const eng = clientEngagement(c);
    const pct = eng.compliance as number | null;
    const ringColor = ringColorOf(pct);
    const lcDays = eng.lastCompleted
      ? Math.round(
          (Date.parse(`${todayValue}T00:00:00`) -
            Date.parse(`${eng.lastCompleted}T00:00:00`)) /
            86400000
        )
      : null;
    const trained =
      lcDays === null
        ? "no sessions"
        : lcDays <= 0
          ? "trained today"
          : lcDays === 1
            ? "trained 1d ago"
            : `trained ${lcDays}d ago`;
    const noEng = pct == null && !eng.lastCompleted;
    const teamsOf = clientTeams(c.id) || [];
    const selected = rosterSelectedIds.includes(c.id);
    const flags = flagsFor(c);
    return (
      <div
        className="crpRow"
        key={c.id}
        data-client-id={c.id}
        tabIndex={0}
        role="group"
        aria-label={c.name}
        onClick={() => openAccountModal(c)}
        onContextMenu={e => { e.preventDefault(); setRowMenu({ client: c, x: e.clientX, y: e.clientY }); }}
        onKeyDown={e => {
          if (e.target !== e.currentTarget) return;
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openAccountModal(c); }
          if (e.key === "ContextMenu" || e.key === "F10" && e.shiftKey) { e.preventDefault(); const r = e.currentTarget.getBoundingClientRect(); setRowMenu({ client: c, x: r.left + 60, y: r.top + 40 }); }
        }}
      >
        <button
          type="button"
          className={`crpCheck${selected ? " on" : ""}`}
          title={t("polishSelect8598")}
          onClick={(e) => {
            e.stopPropagation();
            toggleRosterSelect(c.id);
          }}
        >
          {selected && <Check size={12} />}
        </button>
        <div className="crpAvatar" style={{ background: col.bg, color: col.fg }}>
          {c.initials}
        </div>
        <div className="crpRowMain">
          <div className="crpRowName">
            <strong>{c.name}</strong>{c.coachAlias && <span className="crpAlias">{c.coachAlias}</span>}
            {teamsOf.map((t: any) => (
              <span className="crpTeamChip" key={t.id}>
                {t.name}
              </span>
            ))}
            {clientTags(c).map((t: string) => (
              <span className="crpTagChip" key={t} style={tagStyle(c.tagColors?.[t])}>
                {t}
              </span>
            ))}
          </div>
          <div className="crpRowSub">
            {c.clientType || "Client"} · {seenLabel(c)}
          </div>
          <button type="button" className={`crpCoachAssignment${primaryCoachValue(c) ? "" : " unassigned"}`}
            aria-label={`${paceZh ? "分配教练" : "Assign coaches"}: ${c.name}`}
            onClick={e => { e.stopPropagation(); openCoachAssignment(c); }}>
            <Users size={14} aria-hidden="true" />
            {primaryCoachValue(c) ? getCoachDisplayName(primaryCoachValue(c)) : paceZh ? "待分配" : "Unassigned"}
            {c.secondaryCoach ? ` + ${getCoachDisplayName(c.secondaryCoach)}` : ""}
            <ChevronRight size={13} aria-hidden="true" />
          </button>
        </div>
        <div className="crpEng">
          {activityState !== "ready" ? (
            <span className="crpNoEng">{t(activityState === "loading" ? "loading" : "coachActivityUnavailable")}</span>
          ) : noEng ? (
            <span className="crpNoEng">{t("polishNoSessionsYet9d77")}</span>
          ) : (
            <>
              {/* No compliance % yet but trained recently: an empty ring with a
                  dash reads as broken — show a full soft-green ring + check. */}
              <svg width="34" height="34" viewBox="0 0 36 36" className="crpRing">
                <circle cx="18" cy="18" r="15" fill="none" stroke="#eee7d8" strokeWidth="4" />
                <circle
                  cx="18"
                  cy="18"
                  r="15"
                  fill="none"
                  stroke={pct != null ? ringColor : "#8fc9a0"}
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={CIRC}
                  strokeDashoffset={pct != null ? (CIRC * (1 - pct / 100)).toFixed(1) : 0}
                  transform="rotate(-90 18 18)"
                />
              </svg>
              <div className="crpEngText">
                <strong style={{ color: pct != null ? ringColor : "#2f8a43" }}>
                  {pct != null ? `${pct}%` : <Check size={15} strokeWidth={3} />}
                </strong>
                <span>{trained}</span>
              </div>
            </>
          )}
        </div>
        <div className="crpFlags">
          {flags.map((f, i) => (
            <span className={`crpFlag ${f.cls}`} key={i}>
              {f.label}
            </span>
          ))}
        </div>
        <div className="crpRowActions" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="crpIconBtn" aria-label={`${paceZh ? "\u65e5\u5386" : "Calendar"}: ${c.name}`}
            onClick={() => navigateClient(c, "Training")}><CalendarDays size={17} /></button>
          <button type="button" className="crpIconBtn" aria-label={`${paceZh ? "\u8fd0\u52a8\u5458\u64cd\u4f5c" : "Client actions"}: ${c.name}`} aria-haspopup="menu" aria-expanded={rowMenu?.client.id === c.id}
            onClick={e => { const r = e.currentTarget.getBoundingClientRect(); setRowMenu({ client: c, x: r.right - 252, y: r.bottom + 6 }); }}><MoreHorizontal size={19} /></button>
        </div>
      </div>
    );
  };


  return (
    <div className={`coachClientsPage${selectMode || rosterSelectedIds.length ? " crpSelectMode" : ""}`}>
      {/* header */}
      <div className="crpHead">
        <div>
          <span className="crpEyebrow">
            <Users size={14} />{t("polishRostere551")} </span>
          <h1>{t("polishClients28e2")}</h1>
          <p>{t("polishYourAthletesAtAGlanceEngagementAttentionFlagsAndQuickActions01af")}</p>
        </div>
        <div className="crpHeadActions">
          <button type="button" className="crpMobileSelect" onClick={() => { setSelectMode(!selectMode); if (selectMode) clearRosterSelection(); }}>{t(selectMode ? "redesignDone" : "redesignSelect")}</button>
          <button type="button" className="crpInviteBtn" onClick={copyInvite}>
            <Link2 size={16} /> {inviteCopied ? "Copied ✓" : "Copy invite"}
          </button>
          {openNewClientForm && (
            <button type="button" className="crpAddBtn" onClick={openNewClientForm}>
              <Plus size={17} />{t("polishAddClient4b57")} </button>
          )}
        </div>
      </div>

      {/* board */}
      <div className="crpBoard">
        <div className="crpBoardActive">
          <div className="crpBoardGlow" />
          <span className="crpBoardEyebrow">{t("polishActiveAthletes78e2")}</span>
          <div className="crpBoardBig">
            <span>{sumActive}</span>
            <small>{t("polishTrainingWithYouNow24ed")}</small>
          </div>
          <div className="crpBoardBreak">
            <span>
              <strong>{sumOnline}</strong>{t("polishOnline2dbc")} </span>
            <span>
              <strong>{sumInPerson}</strong>{t("polishInPerson2883")} </span>
            <span>
              <strong>{sumTeams}</strong>{t("polishTeams4629")} </span>
          </div>
        </div>
        <div className="crpBoardAttn">
          <span className="crpBoardEyebrowRed">{t("polishNeedAttention46d0")}</span>
          <div className="crpBoardBig">
            <span className="crpBoardBigDark">{sumAttention}</span>
            <small>{t("polishAthletesFlagged3386")}</small>
          </div>
          <p>
            {activityState !== "ready" ? t(activityState === "loading" ? "loading" : "coachActivityUnavailable") : sumAvg == null ? (
              "No compliance data this week."
            ) : (
              <>
                <strong>{sumAvg}%</strong>{t("polishAverageComplianceThisWeekee2a")} </>
            )}
          </p>
        </div>
      </div>

      {/* filter bar */}
      <div className={`crpFilters${filtersOpen ? " crpFiltersExpanded" : ""}`}>
        <div
          className="crpBucketTabs"
          role="group"
          aria-label={t("polishClientStatusFiltersae1f")}
        >
          {BUCKETS.map(([name, label]) => (
            <button
              key={name}
              type="button"
              className={clientBucket === name ? "active" : ""}
              aria-pressed={clientBucket === name}
              onClick={() => {
                setClientBucket(name);
                setClientStatusFilter("All");
              }}
            >
              {label} · {bucketCount(name)}
            </button>
          ))}
        </div>
        <div className="crpFilterRight">
          <div className="crpSearch">
            <Search size={15} />
            <input
              aria-label={t("polishSearchClientsb50b")}
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              placeholder={t("polishSearchClient11f1")}
            />
          </div>
          <button type="button" className="crpMobileFiltersButton" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(!filtersOpen)}>{t("mobileRosterFilters")}</button>
          <select
            className="crpSelect"
            aria-label={t("polishGroupClientsc8ff")}
            value={groupView}
            onChange={(e) => onGroupChange(e.target.value)}
          >
            <option value="none">{t("polishNoGroupinga0d0")}</option>
            <option value="online">{t("polishOnlinec3e8")}</option>
            <option value="inperson">{t("polishInPersone1d7")}</option>
            <option value="team">{t("polishTeam2188")}</option>
          </select>
          <select
            className="crpSelect"
            aria-label={t("polishFilterClientStatusc123")}
            value={clientStatusFilter}
            onChange={(e) => setClientStatusFilter(e.target.value)}
          >
            <option value="All">{t("polishAllStatuses6405")}</option>
            {clientStatusOptions.map((s: any) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {activeCoaches?.length > 0 && (
            <select
              className="crpSelect crpCoachSelect"
              aria-label={t("polishFilterByCoach589a")}
              value={coachScope}
              onChange={(e) => setCoachScope(e.target.value)}
            >
              <option value="All Coaches">{t("polishAllCoaches4f5b")}</option>
              <option value="Unassigned">{paceZh ? "待分配" : "Unassigned"}</option>
              {activeCoaches.map((coach: any) => (
                <option key={coach.recordId || coach.coachId} value={coach.name}>
                  {coach.name}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            className="crpRefresh"
            title={t("polishRefresh56e3")}
            onClick={() => void loadClients(true)}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* triage chips */}
      {triageDefs.some((d: any) => triageCounts[d.key] > 0) && (
        <div className="crpTriage" role="group" aria-label={t("polishAttentionFilters00f6")}>
          <span className="crpTriageLabel">{t("polishNeedsAttentiona126")}</span>
          {triageDefs
            .filter((d: any) => triageCounts[d.key] > 0)
            .map((d: any) => (
              <button
                key={d.key}
                type="button"
                className={`crpTriageChip${rosterTriage === d.key ? " active" : ""}`}
                aria-pressed={rosterTriage === d.key}
                onClick={() =>
                  setRosterTriage((cur: any) => (cur === d.key ? "" : d.key))
                }
              >
                {d.label} <em>{triageCounts[d.key]}</em>
              </button>
            ))}
          {rosterTriage && (
            <button
              type="button"
              className="crpTriageClear"
              onClick={() => setRosterTriage("")}
            >{t("polishShowAll50a2")} </button>
          )}
        </div>
      )}

      {/* bulk bar */}
      {rosterSelectedIds.length > 0 && (
        <div className="crpBulk">
          <div className="crpBulkMain">
            <strong>{rosterSelectedIds.length}{t("polishSelected835f")}</strong>
            <span className="crpBulkDivider" />
            <button type="button" onClick={() => setBulkPanel((p: any) => (p === "program" ? "" : "program"))}>{t("polishAssignProgram52dc")} </button>
            <button type="button" onClick={() => setBulkPanel((p: any) => (p === "team" ? "" : "team"))}>{t("polishAddToTeamb445")} </button>
            <button type="button" onClick={() => setBulkPanel((p: any) => (p === "tag" ? "" : "tag"))}>{t("polishAddTage0db")} </button>
            <button type="button" onClick={bulkCopyLinks}>{t("polishCopyLinksd68a")} </button>
            <button type="button" className="crpBulkClear" onClick={clearRosterSelection}>{t("polishClear719e")} </button>
          </div>
          {bulkPanel === "program" && (
            <div className="crpBulkPanel">
              <select value={bulkProgramId} onChange={(e) => setBulkProgramId(e.target.value)}>
                <option value="">{t("polishSelectProgramb398")}</option>
                {programs.map((p: any) => (
                  <option key={p.recordId} value={p.programId}>
                    {p.programName}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={bulkStartDate || coachingToday()}
                onChange={(e) => setBulkStartDate(e.target.value)}
              />
              <button
                type="button"
                className="crpBulkGold"
                disabled={bulkBusy || !bulkProgramId}
                onClick={() => void bulkAssignProgram()}
              >
                {bulkBusy ? "Assigning…" : "Assign to selected"}
              </button>
            </div>
          )}
          {bulkPanel === "team" && (
            <div className="crpBulkPanel">
              <select value={bulkTeamId} onChange={(e) => setBulkTeamId(e.target.value)}>
                <option value="">{t("polishSelectTeam5c98")}</option>
                {teams.map((t: any) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="crpBulkGold"
                disabled={bulkBusy || !bulkTeamId}
                onClick={() => void bulkAddToTeam()}
              >
                {bulkBusy ? "Adding…" : "Add to team"}
              </button>
            </div>
          )}
          {bulkPanel === "tag" && (
            <div className="crpBulkPanel">
              <input
                placeholder={t("polishTagNamefcf2")}
                value={bulkTag}
                onChange={(e) => setBulkTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void bulkAddTag();
                }}
              />
              <button
                type="button"
                className="crpBulkGold"
                disabled={bulkBusy || !bulkTag.trim()}
                onClick={() => void bulkAddTag()}
              >
                {bulkBusy ? "Tagging…" : "Add tag"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* roster */}
      {loading && totalShown === 0 ? (
        <p className="crpLoading" role="status">{t("polishLoadingClients527e")} </p>
      ) : totalShown === 0 ? (
        <div className="crpEmpty">
          <UserCircle className="crpEmptyIcon" size={28} aria-hidden="true" />
          <p className="crpEmptyTitle">{t("polishNoClientsMatch7494")}</p>
          <p className="crpEmptySub">{t("polishTryADifferentBucketFilterOrSearch71dd")}</p>
        </div>
      ) : (
        <>
          {groupView !== "team" && (
            <div className="crpRosterHead" aria-hidden="true">
              <span />
              <span />
              <span>{t("polishAthleteaa86")}</span>
              <span>{t("polishEngagement4b1f")}</span>
              <span>{t("polishAttention74e0")}</span>
              <span>{t("polishActionsc3cd")}</span>
            </div>
          )}
          {renderGroups.map((g, gi) => (
            <div key={g.label || gi}>
              {g.showTitle && (
                <div className="crpGroupHead">
                  <h2>{g.label}</h2>
                  <span>{g.clients.length}</span>
                </div>
              )}
              {g.clients.map(Row)}
            </div>
          ))}
        </>
      )}

      {rowMenu && <ClientActionMenu {...rowMenu} zh={paceZh} close={closeRowMenu}
        profile={() => openAccountModal(rowMenu.client)} navigate={view => navigateClient(rowMenu.client, view)}
        assign={() => openCoachAssignment(rowMenu.client)} copy={() => void copyToClipboard(buildClientPortalLink(rowMenu.client), "Portal link")} />}

    </div>
  );
}
