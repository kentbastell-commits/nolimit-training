/* eslint-disable @typescript-eslint/no-explicit-any */
// Create-session modal — mirrors CreateProgramModal (reuses its CSS) so a new
// single-workout session collects its Workout Details in the same beautiful
// popup before dropping into the builder.
import { X } from "lucide-react";
import "./CreateProgramModal.css";

export default function CreateSessionModal({
  sessionDraft,
  setSessionDraft,
  setCreateSessionOpen,
  startSessionFromDraft,
  builderSectionOptions,
}: { [key: string]: any }) {
  const typeOptions = Array.from(
    new Set(
      [...(builderSectionOptions || []), sessionDraft.sessionType].filter(Boolean)
    )
  );
  return (
    <div
      className="createProgramOverlay"
      onClick={() => setCreateSessionOpen(false)}
    >
      <div className="createProgramModal" onClick={(e) => e.stopPropagation()}>
        <div className="createProgramHeader">
          <div>
            <span className="eyebrow">New Session</span>
            <h3>Workout Details</h3>
          </div>
          <button
            type="button"
            className="iconActionButton"
            title="Close"
            onClick={() => setCreateSessionOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <div className="createProgramBody">
          <label className="createProgramField">
            <span>Workout Name</span>
            <input
              autoFocus
              value={sessionDraft.name}
              onChange={(e) =>
                setSessionDraft((d: any) => ({ ...d, name: e.target.value }))
              }
              placeholder="e.g. Lower Strength — Squat Focus"
              className="miniSearch"
            />
          </label>

          <div className="createProgramRow">
            <label className="createProgramField">
              <span>Session Type</span>
              <select
                value={sessionDraft.sessionType}
                onChange={(e) =>
                  setSessionDraft((d: any) => ({
                    ...d,
                    sessionType: e.target.value,
                  }))
                }
                className="miniSearch"
              >
                {typeOptions.map((t: any) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>

            <label className="createProgramField">
              <span>Intensity</span>
              <select
                value={sessionDraft.intensity}
                onChange={(e) =>
                  setSessionDraft((d: any) => ({
                    ...d,
                    intensity: e.target.value,
                  }))
                }
                className="miniSearch"
              >
                <option>Low</option>
                <option>Moderate</option>
                <option>High</option>
              </select>
            </label>
          </div>

          <label className="createProgramField">
            <span>Session Goal</span>
            <input
              value={sessionDraft.goal}
              onChange={(e) =>
                setSessionDraft((d: any) => ({ ...d, goal: e.target.value }))
              }
              placeholder="e.g. Build lower-body strength"
              className="miniSearch"
            />
          </label>
        </div>

        <div className="createProgramFooter">
          <button
            type="button"
            className="outlineButton"
            onClick={() => setCreateSessionOpen(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="goldButton"
            disabled={!sessionDraft.name.trim()}
            onClick={startSessionFromDraft}
          >
            Create &amp; Build
          </button>
        </div>
      </div>
    </div>
  );
}
