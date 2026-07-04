// Extracted from App.tsx (monolith split) — JSX verbatim; props threaded.
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { TrackingType } from "./appCore";
import { X } from "lucide-react";

export default function ExerciseModal({
  applyExerciseCueDraft,
  categoryOptions,
  closeExerciseForm,
  copyExerciseAiPrompt,
  editingExercise,
  equipmentOptions,
  exerciseForm,
  movementPatternOptions,
  muscleGroupOptions,
  renderVideoPreview,
  saveExerciseForm,
  savingExercise,
  setExerciseForm,
}: { [key: string]: any }) {
  return (
    <>
          <div className="workout-modal-overlay">
            <div className="clientFormModal exerciseFormModal">
              <div className="modal-header exerciseToneHeader">
                <div>
                  <span className="exerciseModalEyebrow">
                    {editingExercise ? "Edit" : "New"} · Exercise Library
                  </span>
                  <h2>{editingExercise ? "Edit Exercise" : "Add Exercise"}</h2>
                  <p>
                    {editingExercise
                      ? "Update the exercise library record in Feishu."
                      : "Create a new exercise for programming and form cues."}
                  </p>
                </div>

                <button
                  className="iconActionButton exerciseModalClose"
                  onClick={closeExerciseForm}
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="clientFormGrid">
                <label>
                  <span>Exercise Name</span>
                  <input
                    value={exerciseForm.exerciseName}
                    onChange={(e) =>
                      setExerciseForm({
                        ...exerciseForm,
                        exerciseName: e.target.value,
                      })
                    }
                    placeholder="Back Squat"
                  />
                </label>

                {(() => {
                  const taxonomyField = (
                    label: string,
                    key: "category" | "muscleGroup" | "movementPattern" | "equipment",
                    options: string[]
                  ) => {
                    const value = exerciseForm[key];
                    return (
                      <label>
                        <span>{label}</span>
                        <select
                          value={value}
                          onChange={(e) =>
                            setExerciseForm({
                              ...exerciseForm,
                              [key]: e.target.value,
                            })
                          }
                        >
                          <option value="">Select…</option>
                          {value && !options.includes(value) && (
                            <option value={value}>{value}</option>
                          )}
                          {options.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </label>
                    );
                  };
                  return (
                    <>
                      {taxonomyField("Category", "category", categoryOptions)}
                      {taxonomyField(
                        "Muscle group",
                        "muscleGroup",
                        muscleGroupOptions
                      )}
                      {taxonomyField(
                        "Movement pattern",
                        "movementPattern",
                        movementPatternOptions
                      )}
                      {taxonomyField("Equipment", "equipment", equipmentOptions)}
                    </>
                  );
                })()}

                <label>
                  <span>Record</span>
                  <select
                    value={exerciseForm.trackingType}
                    onChange={(e) =>
                      setExerciseForm({
                        ...exerciseForm,
                        trackingType: e.target.value as TrackingType,
                      })
                    }
                  >
                    <option>Weight</option>
                    <option>Time</option>
                    <option>Distance</option>
                  </select>
                </label>

                <label className="exerciseUnilateralField">
                  <input
                    type="checkbox"
                    checked={exerciseForm.isUnilateral}
                    onChange={(e) =>
                      setExerciseForm({
                        ...exerciseForm,
                        isUnilateral: e.target.checked,
                      })
                    }
                  />
                  <span>Unilateral (trains one side at a time)</span>
                </label>

                <div className="exerciseUrlRow">
                  <label>
                    <span>Short Video URL (quick demo)</span>
                    <input
                      value={exerciseForm.videoUrl}
                      onChange={(e) =>
                        setExerciseForm({
                          ...exerciseForm,
                          videoUrl: e.target.value,
                        })
                      }
                      placeholder="https://..."
                    />
                  </label>

                  <label>
                    <span>Long Video URL (in-depth, optional)</span>
                    <input
                      value={exerciseForm.longVideoUrl}
                      onChange={(e) =>
                        setExerciseForm({
                          ...exerciseForm,
                          longVideoUrl: e.target.value,
                        })
                      }
                      placeholder="https://..."
                    />
                  </label>
                </div>
                {renderVideoPreview(exerciseForm.videoUrl)}

                <label className="clientNotesField">
                  <span>Form Instructions / Library Notes</span>
                  <div className="cueDraftActions">
                    <button
                      className="outlineButton"
                      type="button"
                      onClick={applyExerciseCueDraft}
                    >
                      Generate Cue Draft
                    </button>
                    <button
                      className="outlineButton"
                      type="button"
                      onClick={() => void copyExerciseAiPrompt()}
                    >
                      Copy AI Prompt
                    </button>
                  </div>
                  <textarea
                    value={exerciseForm.notes}
                    onChange={(e) =>
                      setExerciseForm({
                        ...exerciseForm,
                        notes: e.target.value,
                      })
                    }
                    placeholder="Setup, technique cues, common mistakes..."
                  />
                </label>
              </div>

              <div className="modalActions">
                <button className="outlineButton" onClick={closeExerciseForm}>
                  Cancel
                </button>

                <button
                  className="goldButton"
                  onClick={() => saveExerciseForm(false)}
                  disabled={savingExercise}
                >
                  {savingExercise
                    ? "Saving..."
                    : editingExercise
                    ? "Save Exercise"
                    : "Create Exercise"}
                </button>
              </div>
            </div>
          </div>
    </>
  );
}
