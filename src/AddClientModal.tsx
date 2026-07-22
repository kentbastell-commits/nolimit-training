// Extracted from App.tsx (monolith split) — JSX verbatim; props threaded.
/* eslint-disable @typescript-eslint/no-explicit-any */

export default function AddClientModal({
  t,
  activeCoaches,
  closeClientForm,
  editingClient,
  newClient,
  saveClientForm,
  savingClient,
  setNewClient,
}: { [key: string]: any }) {
  return (
    <>
          <div className="workout-modal-overlay">
            <div className="clientFormModal">
              <div className="modal-header">
                <div>
                  <h2>{editingClient ? "Edit Client" : "Add Client"}</h2>
                  <p>
                    {editingClient
                      ? "Update this client record in Feishu."
                      : "Create a client record in Feishu."}
                  </p>
                </div>

                <button
                  className="drawerClose"
                  onClick={closeClientForm}
                >
                  x
                </button>
              </div>

              <div className="clientFormGrid">
                <label>
                  <span>Name</span>
                  <input
                    value={newClient.name}
                    onChange={(e) =>
                      setNewClient({ ...newClient, name: e.target.value })
                    }
                    placeholder="Client name"
                  />
                </label>

                <label>
                  <span>Client Type</span>
                  <select
                    value={newClient.clientType}
                    onChange={(e) =>
                      setNewClient({ ...newClient, clientType: e.target.value })
                    }
                  >
                    <option>Digital Program</option>
                    <option>Online Coaching</option>
                    <option>In-Person Training</option>
                  </select>
                </label>

                <label>
                  <span>Primary Coach</span>
                  <select
                    value={newClient.primaryCoachId || newClient.coach}
                    onChange={(e) => {
                      const selectedCoach = activeCoaches.find(
                        (coach: any) =>
                          coach.recordId === e.target.value ||
                          coach.name === e.target.value
                      );

                      setNewClient({
                        ...newClient,
                        coach: selectedCoach?.name || e.target.value,
                        primaryCoachId: selectedCoach?.recordId || "",
                      });
                    }}
                  >
                    {/* Phantom-select guard (named mistake 21): without a
                        matching option for the initial "Kent Bastell"/""
                        state, the select DISPLAYED the first coach while
                        save assigned someone else. */}
                    {!activeCoaches.some(
                      (coach: any) =>
                        coach.recordId ===
                          (newClient.primaryCoachId || newClient.coach) ||
                        coach.name === (newClient.primaryCoachId || newClient.coach)
                    ) && (
                      <option value={newClient.primaryCoachId || newClient.coach}>
                        {newClient.coach || "— select coach —"}
                      </option>
                    )}
                    {activeCoaches.map((coach: any) => (
                      <option
                        key={coach.recordId || coach.coachId}
                        value={coach.recordId || coach.name}
                      >
                        {coach.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Secondary Coach</span>
                  <select
                    value={newClient.secondaryCoachId}
                    onChange={(e) =>
                      setNewClient({
                        ...newClient,
                        secondaryCoachId: e.target.value,
                      })
                    }
                  >
                    <option value="">None</option>
                    {activeCoaches.map((coach: any) => (
                      <option
                        key={coach.recordId || coach.coachId}
                        value={coach.recordId}
                      >
                        {coach.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Package Type</span>
                  <select
                    value={newClient.packageType}
                    onChange={(e) =>
                      setNewClient({ ...newClient, packageType: e.target.value })
                    }
                  >
                    <option>Active</option>
                    <option>Premium</option>
                    <option>Online Coaching</option>
                    <option>Paused</option>
                  </select>
                </label>

                <label>
                  <span>Package</span>
                  <input
                    value={newClient.packageName}
                    onChange={(e) =>
                      setNewClient({ ...newClient, packageName: e.target.value })
                    }
                    placeholder="Monthly, 3 months, digital plan..."
                  />
                </label>

                <label>
                  <span>{t("languagePreference")}</span>
                  <select
                    value={
                      /中文|chinese|mandarin/i.test(
                        newClient.languagePreference || ""
                      )
                        ? "中文"
                        : "English"
                    }
                    onChange={(e) =>
                      setNewClient({
                        ...newClient,
                        languagePreference: e.target.value,
                      })
                    }
                  >
                    <option value="English">{t("english")}</option>
                    <option value="中文">{t("mandarin")}</option>
                  </select>
                </label>

                <label>
                  <span>Email</span>
                  <input
                    value={newClient.email}
                    onChange={(e) =>
                      setNewClient({ ...newClient, email: e.target.value })
                    }
                    placeholder="email@example.com"
                  />
                </label>

                <label>
                  <span>Phone/WeChat</span>
                  <input
                    value={newClient.phone}
                    onChange={(e) =>
                      setNewClient({ ...newClient, phone: e.target.value })
                    }
                    placeholder="Phone or WeChat"
                  />
                </label>

                <label>
                  <span>Start Date</span>
                  <input
                    type="date"
                    value={newClient.startDate}
                    onChange={(e) =>
                      setNewClient({ ...newClient, startDate: e.target.value })
                    }
                  />
                </label>

                <label>
                  <span>Subscription Status</span>
                  <select
                    value={newClient.subscriptionStatus}
                    onChange={(e) =>
                      setNewClient({
                        ...newClient,
                        subscriptionStatus: e.target.value,
                      })
                    }
                  >
                    <option>Active</option>
                    <option>Trial</option>
                    <option>Paused</option>
                    <option>Cancelled</option>
                    <option>Expired</option>
                  </select>
                </label>

                <label>
                  <span>Intake Status</span>
                  <select
                    value={newClient.intakeStatus}
                    onChange={(e) =>
                      setNewClient({ ...newClient, intakeStatus: e.target.value })
                    }
                  >
                    <option>Not Sent</option>
                    <option>Sent</option>
                    <option>Submitted</option>
                    <option>Reviewed</option>
                  </select>
                </label>

                <label>
                  <span>Payment Status</span>
                  <select
                    value={newClient.paymentStatus}
                    onChange={(e) =>
                      setNewClient({ ...newClient, paymentStatus: e.target.value })
                    }
                  >
                    <option>Unpaid</option>
                    <option>Paid</option>
                    <option>Failed</option>
                    <option>Refunded</option>
                  </select>
                </label>

                <label>
                  <span>Source</span>
                  <select
                    value={newClient.source}
                    onChange={(e) =>
                      setNewClient({ ...newClient, source: e.target.value })
                    }
                  >
                    <option>Store</option>
                    <option>Coach Invite</option>
                    <option>Manual Entry</option>
                    <option>Referral</option>
                  </select>
                </label>

                <label>
                  <span>Purchased Program ID</span>
                  <input
                    value={newClient.purchasedProgramId}
                    onChange={(e) =>
                      setNewClient({
                        ...newClient,
                        purchasedProgramId: e.target.value,
                      })
                    }
                    placeholder="Program ID"
                  />
                </label>

                <label>
                  <span>Access Start Date</span>
                  <input
                    type="date"
                    value={newClient.accessStartDate}
                    onChange={(e) =>
                      setNewClient({ ...newClient, accessStartDate: e.target.value })
                    }
                  />
                </label>

                <label>
                  <span>Access End Date</span>
                  <input
                    type="date"
                    value={newClient.accessEndDate}
                    onChange={(e) =>
                      setNewClient({ ...newClient, accessEndDate: e.target.value })
                    }
                  />
                </label>

                <label className="clientNotesField">
                  <span>Notes</span>
                  <textarea
                    value={newClient.notes}
                    onChange={(e) =>
                      setNewClient({ ...newClient, notes: e.target.value })
                    }
                    placeholder="Initial coach notes..."
                  />
                </label>
              </div>

              <div className="modalActions">
                <button
                  className="outlineButton"
                  onClick={closeClientForm}
                >
                  Cancel
                </button>

                <button
                  className="goldButton"
                  onClick={saveClientForm}
                  disabled={savingClient}
                >
                  {savingClient
                    ? editingClient
                      ? "Saving..."
                      : "Creating..."
                    : editingClient
                    ? "Save Client"
                    : "Create Client"}
                </button>
              </div>
            </div>
          </div>
    </>
  );
}
