// Coach Clients page (roster, Today strip, triage chips, bulk actions).
// Extracted from App.tsx (split phase I) — JSX verbatim; props threaded.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Fragment } from "react";
import { CalendarDays, Link2, UserCircle } from "lucide-react";
import { dateToInputValue, normalizeDate } from "./appCore";
import type { ClientBucket } from "./appCore";

export default function CoachClientsPage({
  loading,
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
  clientSearch,
  clientStatusFilter,
  clientStatusOptions,
  clientTeams,
  clientWeekLoadZone,
  clients,
  coachInviteLink,
  coachReviewCheckIns,
  coachScope,
  copyToClipboard,
  daysSinceLogin,
  goToPage,
  loadClients,
  openAccountModal,
  paceZh,
  programs,
  renderCoachReviews,
  reviewFormVideos,
  rosterAllSelected,
  rosterClients,
  rosterGroupBy,
  rosterGroups,
  rosterSelectedIds,
  rosterSortArrow,
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
  subscriptions,
  teams,
  toggleRosterSelect,
  toggleRosterSelectAll,
  toggleRosterSort,
  triageCounts,
  triageDefs,
  workouts,
}: { [key: string]: any }) {
  return (
    <>
              <>
                {renderCoachReviews()}
                <section className="clientCommandCenter">
                  <section className="clientTableWorkspace">
                    <div className="clientToolbar">
                      <select
                        className="clientBucketSelect"
                        value={clientBucket}
                        onChange={(e: any) => {
                          setClientBucket(e.target.value as ClientBucket);
                          setClientStatusFilter("All");
                        }}
                      >
                        {clientBuckets.map((bucket: any) => (
                          <option key={bucket.name} value={bucket.name}>
                            {bucket.name} ({bucket.count})
                          </option>
                        ))}
                      </select>

                      <input
                        placeholder="Search client"
                        value={clientSearch}
                        onChange={(e: any) => setClientSearch(e.target.value)}
                      />

                      <select
                        value={clientStatusFilter}
                        onChange={(e: any) => setClientStatusFilter(e.target.value)}
                      >
                        <option value="All">All Statuses</option>
                        {clientStatusOptions.map((status: any) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>

                      <select
                        value={coachScope}
                        onChange={(event) => setCoachScope(event.target.value)}
                      >
                        <option>All Coaches</option>
                        {activeCoaches.map((coach: any) => (
                          <option
                            key={coach.recordId || coach.coachId}
                            value={coach.name}
                          >
                            {coach.name}
                          </option>
                        ))}
                      </select>

                      <select
                        value={rosterGroupBy}
                        onChange={(e: any) =>
                          setRosterGroupBy(e.target.value as typeof rosterGroupBy)
                        }
                        title="Group the roster"
                      >
                        <option value="none">No grouping</option>
                        <option value="team">Group by Team</option>
                        <option value="type">Group by Type</option>
                        <option value="tag">Group by Tag</option>
                        <option value="category">Group by Category</option>
                      </select>

                      <button
                        className="outlineButton"
                        onClick={() => void loadClients(true)}
                      >
                        Refresh
                      </button>

                      <button
                        className="outlineButton"
                        onClick={() =>
                          copyToClipboard(coachInviteLink, "Invite link")
                        }
                      >
                        Copy Invite
                      </button>
                    </div>

                    {(() => {
                      // Morning triage: everything that changed since yesterday
                      // in one strip — trained, missed, readiness drops,
                      // renewals due, videos to review.
                      const todayStr = dateToInputValue(new Date());
                      const yestStr = dateToInputValue(
                        new Date(Date.now() - 86400000)
                      );
                      // Show human names, not CL-XXXX codes, in the details.
                      const nameFromCode = (raw: string) => {
                        const key = String(raw || "").trim();
                        const match = clients.find(
                          (c: any) =>
                            c.clientCode === key ||
                            c.id === key ||
                            String(raw || "").includes(c.clientCode)
                        );
                        return match?.name || key;
                      };
                      const trained = workouts.filter(
                        (w: any) =>
                          /complete/i.test(w.completionStatus || "") &&
                          [todayStr, yestStr].includes(
                            normalizeDate(String(w.scheduledDate))
                          )
                      );
                      const missedCount = workouts.filter((w: any) => {
                        const d = normalizeDate(String(w.scheduledDate));
                        return (
                          d &&
                          d < todayStr &&
                          !/complete/i.test(w.completionStatus || "")
                        );
                      }).length;
                      const lowReadiness = coachReviewCheckIns.filter((ci: any) => {
                        const score = Number((ci as any).readinessScore);
                        return Number.isFinite(score) && score > 0 && score <= 55;
                      });
                      const dueSoon = dateToInputValue(
                        new Date(Date.now() + 14 * 86400000)
                      );
                      const renewals = subscriptions.filter((s: any) => {
                        const d = normalizeDate(String((s as any).renewalDate || ""));
                        return d && d <= dueSoon && !/cancel/i.test(String((s as any).status || ""));
                      });
                      const newVideos = reviewFormVideos.filter(
                        (v: any) => v.status !== "Reviewed"
                      ).length;
                      const rows: Array<{
                        key: string;
                        icon: string;
                        label: string;
                        detail: string;
                        onClick: () => void;
                        tone?: string;
                      }> = [];
                      if (trained.length)
                        rows.push({
                          key: "trained",
                          icon: "✅",
                          label: `${trained.length} session${trained.length === 1 ? "" : "s"} completed (today + yesterday)`,
                          detail: Array.from(
                            new Set(trained.map((w: any) => nameFromCode(w.clientId)))
                          )
                            .slice(0, 4)
                            .join(", "),
                          onClick: () => goToPage("Review"),
                        });
                      if (missedCount)
                        rows.push({
                          key: "missed",
                          icon: "⚠️",
                          label: `${missedCount} missed workout${missedCount === 1 ? "" : "s"}`,
                          detail: "Open the review queue",
                          onClick: () => goToPage("Review"),
                          tone: "warn",
                        });
                      if (lowReadiness.length)
                        rows.push({
                          key: "readiness",
                          icon: "🔋",
                          label: `${lowReadiness.length} low readiness check-in${lowReadiness.length === 1 ? "" : "s"} (≤55)`,
                          detail: Array.from(
                            new Set(
                              lowReadiness.map((ci: any) =>
                                nameFromCode(
                                  (ci as any).clientName ||
                                    (ci as any).clientId ||
                                    ""
                                )
                              )
                            )
                          )
                            .filter(Boolean)
                            .slice(0, 4)
                            .join(", "),
                          onClick: () => goToPage("Review"),
                          tone: "warn",
                        });
                      if (renewals.length)
                        rows.push({
                          key: "renewals",
                          icon: "💰",
                          label: `${renewals.length} renewal${renewals.length === 1 ? "" : "s"} due ≤14d`,
                          detail: renewals
                            .map((s: any) => (s as any).clientName || "")
                            .filter(Boolean)
                            .slice(0, 4)
                            .join(", "),
                          onClick: () => goToPage("Revenue"),
                          tone: "warn",
                        });
                      if (newVideos)
                        rows.push({
                          key: "videos",
                          icon: "📹",
                          label: `${newVideos} form video${newVideos === 1 ? "" : "s"} to review`,
                          detail: "Athletes are waiting on feedback",
                          onClick: () => goToPage("Review"),
                        });
                      if (rows.length === 0) return null;
                      return (
                        <div className="coachTodayPanel">
                          <span className="rosterTriageLabel">Today</span>
                          {rows.map((row) => (
                            <button
                              key={row.key}
                              type="button"
                              className={`coachTodayRow${row.tone ? ` ${row.tone}` : ""}`}
                              onClick={row.onClick}
                            >
                              <span>{row.icon}</span>
                              <strong>{row.label}</strong>
                              {row.detail && <em>{row.detail}</em>}
                            </button>
                          ))}
                        </div>
                      );
                    })()}

                    {triageDefs.some((d: any) => triageCounts[d.key] > 0) && (
                      <div className="rosterTriageBar">
                        <span className="rosterTriageLabel">Needs attention</span>
                        {triageDefs
                          .filter((d: any) => triageCounts[d.key] > 0)
                          .map((d: any) => (
                            <button
                              key={d.key}
                              className={`rosterTriageChip${
                                rosterTriage === d.key ? " active" : ""
                              }`}
                              onClick={() =>
                                setRosterTriage((cur: any) =>
                                  cur === d.key ? "" : d.key
                                )
                              }
                            >
                              {d.label}
                              <em>{triageCounts[d.key]}</em>
                            </button>
                          ))}
                        {rosterTriage && (
                          <button
                            className="textButton rosterTriageClear"
                            onClick={() => setRosterTriage("")}
                          >
                            Show all
                          </button>
                        )}
                      </div>
                    )}

                    {rosterSelectedIds.length > 0 && (
                      <div className="rosterBulkBar">
                        <div className="rosterBulkBarMain">
                          <strong>{rosterSelectedIds.length} selected</strong>
                          <button
                            className="outlineButton"
                            onClick={() =>
                              setBulkPanel((p: any) =>
                                p === "program" ? "" : "program"
                              )
                            }
                          >
                            Assign Program
                          </button>
                          <button
                            className="outlineButton"
                            onClick={() =>
                              setBulkPanel((p: any) => (p === "team" ? "" : "team"))
                            }
                          >
                            Add to Team
                          </button>
                          <button
                            className="outlineButton"
                            onClick={() =>
                              setBulkPanel((p: any) => (p === "tag" ? "" : "tag"))
                            }
                          >
                            Add Tag
                          </button>
                          <button
                            className="outlineButton"
                            onClick={bulkCopyLinks}
                          >
                            Copy Links
                          </button>
                          <button
                            className="textButton rosterBulkClear"
                            onClick={clearRosterSelection}
                          >
                            Clear
                          </button>
                        </div>

                        {bulkPanel === "program" && (
                          <div className="rosterBulkPanel">
                            <select
                              value={bulkProgramId}
                              onChange={(e: any) => setBulkProgramId(e.target.value)}
                            >
                              <option value="">Select program…</option>
                              {programs.map((p: any) => (
                                <option key={p.recordId} value={p.programId}>
                                  {p.programName}
                                </option>
                              ))}
                            </select>
                            <input
                              type="date"
                              value={
                                bulkStartDate ||
                                new Date().toISOString().split("T")[0]
                              }
                              onChange={(e: any) => setBulkStartDate(e.target.value)}
                            />
                            <button
                              className="goldButton"
                              disabled={bulkBusy || !bulkProgramId}
                              onClick={() => void bulkAssignProgram()}
                            >
                              {bulkBusy ? "Assigning…" : "Assign to selected"}
                            </button>
                          </div>
                        )}

                        {bulkPanel === "team" && (
                          <div className="rosterBulkPanel">
                            <select
                              value={bulkTeamId}
                              onChange={(e: any) => setBulkTeamId(e.target.value)}
                            >
                              <option value="">Select team…</option>
                              {teams.map((t: any) => (
                                <option key={t.id} value={t.id}>
                                  {t.name}
                                </option>
                              ))}
                            </select>
                            <button
                              className="goldButton"
                              disabled={bulkBusy || !bulkTeamId}
                              onClick={() => void bulkAddToTeam()}
                            >
                              {bulkBusy ? "Adding…" : "Add to team"}
                            </button>
                          </div>
                        )}

                        {bulkPanel === "tag" && (
                          <div className="rosterBulkPanel">
                            <input
                              placeholder="Tag name"
                              value={bulkTag}
                              onChange={(e: any) => setBulkTag(e.target.value)}
                              onKeyDown={(e: any) => {
                                if (e.key === "Enter") void bulkAddTag();
                              }}
                            />
                            <button
                              className="goldButton"
                              disabled={bulkBusy || !bulkTag.trim()}
                              onClick={() => void bulkAddTag()}
                            >
                              {bulkBusy ? "Tagging…" : "Add tag"}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {loading && <p>Loading clients...</p>}

                    <section className="tableCard clientTableCard">
                      <div className="tableHeader clientTableHeader">
                        <span>
                          <input
                            type="checkbox"
                            checked={rosterAllSelected}
                            onChange={toggleRosterSelectAll}
                            title="Select all"
                          />
                        </span>
                        <span
                          className="rosterSortable"
                          onClick={() => toggleRosterSort("name")}
                        >
                          Athlete{rosterSortArrow("name")}
                        </span>
                        <span>Actions</span>
                        <span
                          className="rosterSortable"
                          onClick={() => toggleRosterSort("type")}
                        >
                          Athlete Type{rosterSortArrow("type")}
                        </span>
                        <span
                          className="rosterSortable"
                          onClick={() => toggleRosterSort("teams")}
                        >
                          Teams{rosterSortArrow("teams")}
                        </span>
                        <span>Tags</span>
                        <span
                          className="rosterSortable"
                          onClick={() => toggleRosterSort("lastLogin")}
                        >
                          Last Login{rosterSortArrow("lastLogin")}
                        </span>
                        <span
                          className="rosterSortable"
                          onClick={() => toggleRosterSort("engagement")}
                        >
                          Engagement{rosterSortArrow("engagement")}
                        </span>
                        <span>Attention</span>
                      </div>

                      {!loading && rosterClients.length === 0 && (
                        <p className="emptyTableMessage">
                          No clients match your filters.
                        </p>
                      )}

                      {rosterGroups.map((group: any) => (
                        <Fragment key={group.key}>
                          {rosterGroupBy !== "none" && (
                            <div className="rosterGroupRow">
                              <span>{group.label}</span>
                              <small>{group.clients.length}</small>
                            </div>
                          )}
                          {group.clients.map((client: any) => {
                        const attentionItems = [
                          clientNeedsProgramming(client) ? "Needs program" : "",
                          clientNeedsContact(client) ? "Needs contact" : "",
                        ].filter(Boolean);

                        return (
                          <div
                            className="clientRow clickableRow clientTableRow"
                            key={client.id}
                            onClick={() => {
                              setSelectedClient(client);
                              setClientTab("Home");
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={rosterSelectedIds.includes(client.id)}
                              onChange={() => toggleRosterSelect(client.id)}
                              onClick={(event) => event.stopPropagation()}
                            />

                            <div className="clientName">
                              <div className="clientAvatar">{client.initials}</div>
                              <div>
                                <strong>{client.name}</strong>
                                <small>
                                  {client.email || client.phone || "--"}
                                </small>
                              </div>
                            </div>

                            <span
                              className="clientRowActions"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <button
                                className="iconActionButton"
                                title="Athlete's calendar"
                                onClick={() => {
                                  setSelectedClient(client);
                                  setClientTab("Training");
                                }}
                              >
                                <CalendarDays size={17} aria-hidden="true" />
                              </button>
                              <button
                                className="iconActionButton"
                                title="Account info"
                                onClick={() => openAccountModal(client)}
                              >
                                <UserCircle size={17} aria-hidden="true" />
                              </button>
                              <button
                                className="iconActionButton"
                                title="Copy portal link"
                                onClick={() =>
                                  void copyToClipboard(
                                    buildClientPortalLink(client),
                                    "Portal link"
                                  )
                                }
                              >
                                <Link2 size={17} aria-hidden="true" />
                              </button>
                            </span>

                            <span>{client.clientType || "--"}</span>

                            <span className="rosterChips">
                              {clientTeams(client.id).length === 0
                                ? "--"
                                : clientTeams(client.id).map((t: any) => (
                                    <span className="teamChip" key={t.id}>
                                      {t.name}
                                    </span>
                                  ))}
                            </span>

                            <span className="rosterChips">
                              {(client.tags || []).length === 0
                                ? "--"
                                : (client.tags || []).map((t: any) => (
                                    <span className="tagChip" key={t}>
                                      {t}
                                    </span>
                                  ))}
                            </span>

                            <span className="lastLoginCell">
                              {(() => {
                                const d = daysSinceLogin(client.lastLogin);
                                if (d === null) return "—";
                                if (d === 0) return "Today";
                                return `${d}d`;
                              })()}
                            </span>

                            <span className="engagementCell">
                              {(() => {
                                const e = clientEngagement(client);
                                if (e.compliance === null && !e.lastCompleted)
                                  return "—";
                                const tone =
                                  e.compliance === null
                                    ? "engNeutral"
                                    : e.compliance >= 80
                                    ? "engGood"
                                    : e.compliance >= 50
                                    ? "engOk"
                                    : "engLow";
                                const lcDays = e.lastCompleted
                                  ? Math.round(
                                      (Date.parse(`${todayValue}T00:00:00`) -
                                        Date.parse(`${e.lastCompleted}T00:00:00`)) /
                                        86400000
                                    )
                                  : null;
                                const lcLabel =
                                  lcDays === null
                                    ? "no sessions yet"
                                    : lcDays <= 0
                                    ? "trained today"
                                    : lcDays === 1
                                    ? "1d ago"
                                    : `${lcDays}d ago`;
                                return (
                                  <>
                                    <strong className={`engPct ${tone}`}>
                                      {e.compliance === null
                                        ? "—"
                                        : `${e.compliance}%`}
                                    </strong>
                                    <small>{lcLabel}</small>
                                  </>
                                );
                              })()}
                            </span>

                            <span className="attentionCell">
                              {(() => {
                                const lz = clientWeekLoadZone(client);
                                const showLoad =
                                  lz &&
                                  (lz.cls === "loadZoneWarn" ||
                                    lz.cls === "loadZoneRisk");
                                if (attentionItems.length === 0 && !showLoad)
                                  return "--";
                                return (
                                  <>
                                    {showLoad && (
                                      <span
                                        className={`attentionChip loadRiskChip ${lz!.cls}`}
                                        title={
                                          paceZh
                                            ? "本周训练单调性偏高"
                                            : "High training monotony this week"
                                        }
                                      >
                                        {paceZh ? "负荷" : "Load"} · {lz!.label}
                                      </span>
                                    )}
                                    {attentionItems.map((item) => (
                                      <span className="attentionChip" key={item}>
                                        {item}
                                      </span>
                                    ))}
                                  </>
                                );
                              })()}
                            </span>
                          </div>
                        );
                          })}
                        </Fragment>
                      ))}
                    </section>
                  </section>
                </section>
              </>
    </>
  );
}
