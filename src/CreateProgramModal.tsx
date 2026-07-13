// Extracted from App.tsx (monolith split) — JSX verbatim; props threaded.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect } from "react";
import { X } from "lucide-react";
import "./CreateProgramModal.css";

// Program types are scoped to the side you're creating from: the Digital page
// makes digital products, the coaching Library makes coaching programs.
const DIGITAL_TYPES = ["Digital Program", "Digital Add-on", "Digital Bundle"];
const COACHED_TYPES = [
  "Online Coaching",
  "In-Person Training",
  "Internal Coaching Template",
];

export default function CreateProgramModal({
  builderScope,
  createDraft,
  setCreateDraft,
  setCreateProgramOpen,
  startProgramFromDraft,
}: { [key: string]: any }) {
  const typeOptions = builderScope === "digital" ? DIGITAL_TYPES : COACHED_TYPES;

  // Keep the draft's type inside the scoped list — otherwise the select
  // DISPLAYS the first option while the state still holds an off-scope value.
  useEffect(() => {
    if (!typeOptions.includes(createDraft.productType)) {
      setCreateDraft((d: any) => ({ ...d, productType: typeOptions[0] }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [builderScope]);

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
                  {typeOptions.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
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
