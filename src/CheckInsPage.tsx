// Extracted from App.tsx (monolith split) — JSX verbatim; props threaded.
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { CheckInFilter } from "./appCore";

export default function CheckInsPage({
  checkInFilter,
  checkInSearch,
  checkInStats,
  clientNeedsCheckIn,
  filteredCheckInClients,
  getCheckInAgeDays,
  loadClients,
  loading,
  markClientCheckedInToday,
  openCheckInQuestionnaire,
  savingCheckInClientId,
  setCheckInFilter,
  setCheckInSearch,
  setClientTab,
  setSelectedClient,
}: { [key: string]: any }) {
  return (
    <>
              <section className="checkInsPage">
                <div className="checkInStatsGrid">
                  <div className="clientStat">
                    <span>Due Now</span>
                    <strong>{checkInStats.due}</strong>
                  </div>
                  <div className="clientStat">
                    <span>Recent</span>
                    <strong>{checkInStats.recent}</strong>
                  </div>
                  <div className="clientStat">
                    <span>No Check-in</span>
                    <strong>{checkInStats.missing}</strong>
                  </div>
                </div>

                <div className="clientToolbar checkInToolbar">
                  <input
                    placeholder="Search check-ins"
                    value={checkInSearch}
                    onChange={(e) => setCheckInSearch(e.target.value)}
                  />

                  <select
                    value={checkInFilter}
                    onChange={(e) =>
                      setCheckInFilter(e.target.value as CheckInFilter)
                    }
                  >
                    <option value="Due">Due</option>
                    <option value="Recent">Recent</option>
                    <option value="No Check-in">No Check-in</option>
                    <option value="All">All</option>
                  </select>

                  <button
                    className="outlineButton"
                    onClick={() => void loadClients(true)}
                  >
                    Refresh
                  </button>
                </div>

                <section className="checkInList">
                  {!loading && filteredCheckInClients.length === 0 && (
                    <p className="emptyTableMessage">
                      No clients match this check-in view.
                    </p>
                  )}

                  {filteredCheckInClients.map((client: any) => {
                    const ageDays = getCheckInAgeDays(client);
                    const isDue = clientNeedsCheckIn(client);
                    const lastCheckIn =
                      ageDays === null
                        ? "No check-in recorded"
                        : ageDays === 0
                        ? "Checked in today"
                        : `${ageDays} days since check-in`;

                    return (
                      <article
                        className={`checkInCard ${isDue ? "checkInDueCard" : ""}`}
                        key={client.id}
                      >
                        <div className="clientName">
                          <div className="clientAvatar">{client.initials}</div>
                          <div>
                            <strong>{client.name}</strong>
                            <p>{client.status || "Active"}</p>
                          </div>
                        </div>

                        <div className="checkInMeta">
                          <span>Last Check-in</span>
                          <strong>{client.activity || "--"}</strong>
                          <p>{lastCheckIn}</p>
                        </div>

                        <div className="checkInMeta">
                          <span>Program</span>
                          <strong>{client.program || "--"}</strong>
                          <p>{client.email || client.phone || "No contact saved"}</p>
                        </div>

                        <div className="checkInActions">
                          <button
                            className={isDue ? "goldButton" : "outlineButton"}
                            onClick={() => markClientCheckedInToday(client)}
                            disabled={savingCheckInClientId === client.id}
                          >
                            {savingCheckInClientId === client.id
                              ? "Saving..."
                              : "Mark Today"}
                          </button>
                          <button
                            className="outlineButton"
                            onClick={() => openCheckInQuestionnaire(client)}
                          >
                            Questionnaire
                          </button>
                          <button
                            className="outlineButton"
                            onClick={() => {
                              setSelectedClient(client);
                              setClientTab("Overview");
                            }}
                          >
                            Open Client
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </section>
              </section>
    </>
  );
}
