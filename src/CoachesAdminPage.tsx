// Extracted from App.tsx (monolith split) — JSX verbatim; props threaded.
import "./CoachesAdminPage.css";
/* eslint-disable @typescript-eslint/no-explicit-any */

export default function CoachesAdminPage({
  activeCoaches,
  allCoaches,
  clientBelongsToCoach,
  clients,
  openEditCoachForm,
  savingCoach,
  setActivePage,
  setCoachScope,
  updateCoachStatus,
}: { [key: string]: any }) {
  return (
    <>
              <section className="coachManagementPage">
                <div className="coachManagementSummary">
                  <div>
                    <span>Coaches</span>
                    <strong>{allCoaches.length}</strong>
                    <small>Total coaches</small>
                  </div>
                  <div>
                    <span>Active</span>
                    <strong>{activeCoaches.length}</strong>
                    <small>Assignable now</small>
                  </div>
                  <div>
                    <span>Admins</span>
                    <strong>
                      {
                        allCoaches.filter(
                          (coach: any) =>
                            coach.role === "Admin" &&
                            coach.status !== "Inactive"
                        ).length
                      }
                    </strong>
                    <small>Can manage team</small>
                  </div>
                </div>

                <section className="tableCard coachTableCard">
                  <div className="tableHeader coachTableHeader">
                    <span>Coach</span>
                    <span>Role</span>
                    <span>Status</span>
                    <span>Assigned Clients</span>
                    <span>Contact</span>
                    <span>Actions</span>
                  </div>

                  {allCoaches.map((coach: any) => {
                    const assignedClients = clients.filter((client: any) =>
                      clientBelongsToCoach(client, coach)
                    );

                    return (
                      <div
                        className="clientRow coachTableRow"
                        key={coach.recordId || coach.coachId || coach.name}
                      >
                        <div className="clientName">
                          <div className="clientAvatar">
                            {coach.name
                              .split(" ")
                              .map((part: any) => part[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <div>
                            <strong>{coach.name}</strong>
                            <small>{coach.coachId || "Coach record"}</small>
                          </div>
                        </div>
                        <span>{coach.role || "Coach"}</span>
                        <span
                          className={
                            coach.status === "Active"
                              ? "status activeStatus"
                              : "status holdStatus"
                          }
                        >
                          {coach.status || "Active"}
                        </span>
                        <span>{assignedClients.length}</span>
                        <span>{coach.email || coach.phoneWechat || "--"}</span>
                        <div className="coachRowActions">
                          <button
                            className="outlineButton"
                            onClick={() => openEditCoachForm(coach)}
                          >
                            Edit
                          </button>
                          <button
                            className="outlineButton"
                            disabled={savingCoach}
                            onClick={() =>
                              updateCoachStatus(
                                coach,
                                coach.status === "Inactive" ? "Active" : "Inactive"
                              )
                            }
                          >
                            {coach.status === "Inactive" ? "Activate" : "Deactivate"}
                          </button>
                          <button
                            className="outlineButton"
                            onClick={() => {
                              setCoachScope(coach.name);
                              setActivePage("Clients");
                            }}
                          >
                            View Roster
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </section>
              </section>
    </>
  );
}
