// Extracted from App.tsx (monolith split) — JSX verbatim; props threaded.
/* eslint-disable @typescript-eslint/no-explicit-any */

export default function CoachEditModal({
  closeCoachForm,
  coachForm,
  editingCoach,
  saveCoachForm,
  savingCoach,
  setCoachForm,
}: { [key: string]: any }) {
  return (
    <>
          <div className="workout-modal-overlay">
            <div className="clientFormModal">
              <div className="modal-header">
                <div>
                  <h2>{editingCoach ? "Edit Coach" : "Add Coach"}</h2>
                  <p>
                    {editingCoach
                      ? "Update coach access and assignment details."
                      : "Create a coach record for client ownership."}
                  </p>
                </div>

                <button className="drawerClose" onClick={closeCoachForm}>
                  x
                </button>
              </div>

              <div className="clientFormGrid">
                <label>
                  <span>Name</span>
                  <input
                    value={coachForm.name}
                    onChange={(e) =>
                      setCoachForm({ ...coachForm, name: e.target.value })
                    }
                    placeholder="Coach name"
                  />
                </label>

                <label>
                  <span>Role</span>
                  <select
                    value={coachForm.role}
                    onChange={(e) =>
                      setCoachForm({ ...coachForm, role: e.target.value })
                    }
                  >
                    <option>Coach</option>
                    <option>Admin</option>
                  </select>
                </label>

                <label>
                  <span>Status</span>
                  <select
                    value={coachForm.status}
                    onChange={(e) =>
                      setCoachForm({ ...coachForm, status: e.target.value })
                    }
                  >
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
                </label>

                <label>
                  <span>Email</span>
                  <input
                    value={coachForm.email}
                    onChange={(e) =>
                      setCoachForm({ ...coachForm, email: e.target.value })
                    }
                    placeholder="coach@example.com"
                  />
                </label>

                <label>
                  <span>Phone/WeChat</span>
                  <input
                    value={coachForm.phoneWechat}
                    onChange={(e) =>
                      setCoachForm({
                        ...coachForm,
                        phoneWechat: e.target.value,
                      })
                    }
                    placeholder="Phone or WeChat"
                  />
                </label>

                <label className="clientNotesField">
                  <span>Bio / Notes</span>
                  <textarea
                    value={coachForm.bio}
                    onChange={(e) =>
                      setCoachForm({ ...coachForm, bio: e.target.value })
                    }
                    placeholder="Specialty, schedule, internal notes..."
                  />
                </label>
              </div>

              <div className="modalActions">
                <button className="outlineButton" onClick={closeCoachForm}>
                  Cancel
                </button>

                <button
                  className="goldButton"
                  onClick={saveCoachForm}
                  disabled={savingCoach}
                >
                  {savingCoach
                    ? "Saving..."
                    : editingCoach
                    ? "Save Coach"
                    : "Create Coach"}
                </button>
              </div>
            </div>
          </div>
    </>
  );
}
