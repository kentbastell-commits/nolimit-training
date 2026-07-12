/* eslint-disable @typescript-eslint/no-explicit-any */
// Create-form modal — mirrors CreateProgramModal (reuses its CSS) so a new form
// collects its name + type in the same beautiful popup before the builder.
import { X } from "lucide-react";
import "./CreateProgramModal.css";

export default function CreateFormModal({
  formDraft,
  setFormDraft,
  setCreateFormOpen,
  startFormFromDraft,
}: { [key: string]: any }) {
  return (
    <div className="createProgramOverlay" onClick={() => setCreateFormOpen(false)}>
      <div className="createProgramModal" onClick={(e) => e.stopPropagation()}>
        <div className="createProgramHeader">
          <div>
            <span className="eyebrow">New Form</span>
            <h3>Form Details</h3>
          </div>
          <button
            type="button"
            className="iconActionButton"
            title="Close"
            onClick={() => setCreateFormOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <div className="createProgramBody">
          <label className="createProgramField">
            <span>Form Name</span>
            <input
              autoFocus
              value={formDraft.name}
              onChange={(e) =>
                setFormDraft((d: any) => ({ ...d, name: e.target.value }))
              }
              placeholder="e.g. Weekly Check-in"
              className="miniSearch"
            />
          </label>

          <label className="createProgramField">
            <span>Form Type</span>
            <select
              value={formDraft.type}
              onChange={(e) =>
                setFormDraft((d: any) => ({ ...d, type: e.target.value }))
              }
              className="miniSearch"
            >
              <option>Check-in</option>
              <option>Questionnaire</option>
              <option>Intake</option>
              <option>Readiness</option>
            </select>
          </label>
        </div>

        <div className="createProgramFooter">
          <button
            type="button"
            className="outlineButton"
            onClick={() => setCreateFormOpen(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="goldButton"
            disabled={!formDraft.name.trim()}
            onClick={startFormFromDraft}
          >
            Create &amp; Build
          </button>
        </div>
      </div>
    </div>
  );
}
