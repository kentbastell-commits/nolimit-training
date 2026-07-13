// Coach add/edit — a right-hand slide-over (matching every other page's detail
// panel). The form fields/handlers are unchanged; assigned-clients + View-roster
// + Deactivate use props threaded from App (editingCoach's roster).
/* eslint-disable @typescript-eslint/no-explicit-any */
import "./CoachesAdminPage.css";
import { X } from "lucide-react";
import { useEffect } from "react";
import { coachRoleLabel } from "./appCore";

const initialsOf = (name: string) =>
  String(name || "")
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "NC";

function avatarStyle(role: string, status: string) {
  const active = (status || "Active") === "Active";
  if (!active) return { background: "#eae4d6", color: "#8a8372" };
  return role === "Admin"
    ? { background: "#efe4c5", color: "#8a6d24" }
    : { background: "#e6ecf6", color: "#3560ac" };
}

export default function CoachEditModal(props: { [key: string]: any }) {
  const {
    closeCoachForm,
    coachForm,
    editingCoach,
    saveCoachForm,
    savingCoach,
    setCoachForm,
    clients,
    clientBelongsToCoach,
    updateCoachStatus,
    setCoachScope,
    setActivePage,
  } = props;

  const assigned =
    editingCoach && clients && clientBelongsToCoach
      ? (clients as any[]).filter((cl) => clientBelongsToCoach(cl, editingCoach))
      : [];
  const active = (coachForm.status || "Active") === "Active";

  const set = (k: string, v: string) => setCoachForm({ ...coachForm, [k]: v });

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeCoachForm();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [closeCoachForm]);

  return (
    <div className="capSlideScrim" onClick={closeCoachForm}>
      <div
        className="capSlide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cap-slide-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="capSlideHead">
          <div className="capSlideTitle">
            <div
              className="capAvatar capAvatarLg"
              style={avatarStyle(coachForm.role, coachForm.status)}
            >
              {initialsOf(coachForm.name || "New coach")}
            </div>
            <div className="capSlideName">
              <span className="capSlideRole">{coachRoleLabel(coachForm.role)}</span>
              <h2 id="cap-slide-title">{coachForm.name || "New coach"}</h2>
            </div>
          </div>
          <button
            type="button"
            className="capSlideClose"
            aria-label="Close coach editor"
            onClick={closeCoachForm}
          >
            <X size={17} />
          </button>
          <div className="capSlideMeta">
            <span
              className="capDot"
              style={{ background: active ? "#3fa564" : "#c0562f" }}
            />
            <span className="capSlideStatus">{coachForm.status || "Active"}</span>
            {editingCoach && (
              <>
                <span className="capSlideSep">·</span>
                <span className="capSlideAssigned">
                  {assigned.length} clients assigned
                </span>
              </>
            )}
          </div>
        </div>

        {/* body */}
        <div className="capSlideBody">
          <div className="capSectionLabel">Coach details</div>
          <div className="capFormGrid">
            <label>
              <span>Name</span>
              <input
                value={coachForm.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Coach name"
              />
            </label>
            <label>
              <span>Role</span>
              <select
                value={coachForm.role}
                onChange={(e) => set("role", e.target.value)}
              >
                {/* value stays "Admin" (gates permissions); label reads
                    "Head Coach". */}
                <option value="Coach">Coach</option>
                <option value="Admin">Head Coach</option>
              </select>
            </label>
            <label>
              <span>Status</span>
              <select
                value={coachForm.status}
                onChange={(e) => set("status", e.target.value)}
              >
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </label>
            <label>
              <span>Phone / WeChat</span>
              <input
                value={coachForm.phoneWechat}
                onChange={(e) => set("phoneWechat", e.target.value)}
                placeholder="Phone or WeChat"
              />
            </label>
            <label className="capFormFull">
              <span>Email</span>
              <input
                value={coachForm.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="coach@example.com"
              />
            </label>
            <label className="capFormFull">
              <span>Bio / Notes</span>
              <textarea
                value={coachForm.bio}
                onChange={(e) => set("bio", e.target.value)}
                placeholder="Specialty, schedule, internal notes…"
              />
            </label>
          </div>

          {editingCoach && (
            <>
              <div className="capSectionLabel capSectionSpaced">
                Assigned clients ({assigned.length})
              </div>
              <div className="capAssignedList">
                {assigned.length === 0 ? (
                  <div className="capAssignedEmpty">
                    No clients assigned yet.
                  </div>
                ) : (
                  assigned.map((cl: any) => (
                    <div className="capAssignedRow" key={cl.id || cl.clientCode}>
                      <div className="capAssignedAv">{initialsOf(cl.name)}</div>
                      <div className="capAssignedMain">
                        <div className="capAssignedName">{cl.name}</div>
                        <div className="capAssignedPlan">
                          {cl.status || "Active client"}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* footer */}
        <div className="capSlideFoot">
          {editingCoach && updateCoachStatus && (
            <button
              type="button"
              className="capFootBtn"
              disabled={savingCoach}
              onClick={() =>
                updateCoachStatus(
                  editingCoach,
                  coachForm.status === "Inactive" ? "Active" : "Inactive"
                )
              }
            >
              {coachForm.status === "Inactive" ? "Activate" : "Deactivate"}
            </button>
          )}
          {editingCoach && setCoachScope && setActivePage && (
            <button
              type="button"
              className="capFootBtn"
              onClick={() => {
                setCoachScope(editingCoach.name);
                setActivePage("Clients");
              }}
            >
              View roster
            </button>
          )}
          <button
            type="button"
            className="capFootSave"
            onClick={saveCoachForm}
            disabled={savingCoach}
          >
            {savingCoach
              ? "Saving…"
              : editingCoach
              ? "Save coach"
              : "Create coach"}
          </button>
        </div>
      </div>
    </div>
  );
}
