// Extracted from App.tsx (monolith split) — JSX verbatim; props threaded.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { X } from "lucide-react";

export default function CreateProgramModal({
  createDraft,
  setCreateDraft,
  setCreateProgramOpen,
  startProgramFromDraft,
}: { [key: string]: any }) {
  return (
    <>
        <div
          className="createProgramOverlay"
          onClick={() => setCreateProgramOpen(false)}
        >
          <div
            className="createProgramModal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="createProgramHeader">
              <div>
                <span className="eyebrow">New Program</span>
                <h3>Program Details</h3>
              </div>
              <button
                type="button"
                className="iconActionButton"
                title="Close"
                onClick={() => setCreateProgramOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="createProgramBody">
              <label className="createProgramField">
                <span>Program Type</span>
                <select
                  value={createDraft.productType}
                  onChange={(e) =>
                    setCreateDraft((d: any) => ({ ...d, productType: e.target.value }))
                  }
                  className="miniSearch"
                >
                  <option>Digital Program</option>
                  <option>Digital Add-on</option>
                  <option>Digital Bundle</option>
                  <option>Online Coaching</option>
                  <option>In-Person Training</option>
                  <option>Internal Coaching Template</option>
                </select>
              </label>

              <label className="createProgramField">
                <span>Program Name</span>
                <input
                  autoFocus
                  value={createDraft.name}
                  onChange={(e) =>
                    setCreateDraft((d: any) => ({ ...d, name: e.target.value }))
                  }
                  placeholder="e.g. 8-Week Hypertrophy"
                  className="miniSearch"
                />
              </label>

              <label className="createProgramField">
                <span>Goal</span>
                <input
                  value={createDraft.goal}
                  onChange={(e) =>
                    setCreateDraft((d: any) => ({ ...d, goal: e.target.value }))
                  }
                  placeholder="e.g. Build muscle"
                  className="miniSearch"
                />
              </label>

              <div className="createProgramRow">
                <label className="createProgramField">
                  <span>Phase</span>
                  <input
                    value={createDraft.phase}
                    onChange={(e) =>
                      setCreateDraft((d: any) => ({ ...d, phase: e.target.value }))
                    }
                    placeholder="e.g. Foundation"
                    className="miniSearch"
                  />
                </label>

                <label className="createProgramField">
                  <span>Duration (Weeks)</span>
                  <input
                    type="number"
                    min={1}
                    max={52}
                    value={createDraft.durationWeeks}
                    onChange={(e) =>
                      setCreateDraft((d: any) => ({
                        ...d,
                        durationWeeks: e.target.value,
                      }))
                    }
                    className="miniSearch"
                  />
                </label>
              </div>
            </div>

            <div className="createProgramFooter">
              <button
                type="button"
                className="outlineButton"
                onClick={() => setCreateProgramOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="goldButton"
                disabled={!createDraft.name.trim()}
                onClick={startProgramFromDraft}
              >
                Create &amp; Build
              </button>
            </div>
          </div>
        </div>
    </>
  );
}
