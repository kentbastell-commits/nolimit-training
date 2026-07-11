// Extracted from App.tsx (monolith split) — JSX verbatim; props threaded.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useRef, useState } from "react";
import type { TrackingType } from "./appCore";
import "./ExerciseModal.css";
import { Upload, X } from "lucide-react";

// Keep in step with the server's express.raw limit (160mb) with headroom.
const MAX_UPLOAD_MB = 150;

type VideoField = "videoUrl" | "longVideoUrl";

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
  const [uploadingField, setUploadingField] = useState<VideoField | null>(null);
  const [uploadPct, setUploadPct] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const shortFileRef = useRef<HTMLInputElement>(null);
  const longFileRef = useRef<HTMLInputElement>(null);

  const isUploadedUrl = (url: string) => /\/uploads\//.test(String(url || ""));

  const handlePick = (field: VideoField) => (e: any) => {
    const file: File | undefined = e.target.files?.[0];
    e.target.value = ""; // let the coach re-pick the same file after a cancel
    if (!file) return;
    setUploadError("");
    const mb = file.size / (1024 * 1024);
    if (mb > MAX_UPLOAD_MB) {
      setUploadError(
        `That video is ${mb.toFixed(0)} MB — please keep it under ${MAX_UPLOAD_MB} MB (trim it or lower the resolution).`
      );
      return;
    }
    setUploadingField(field);
    setUploadPct(0);
    const xhr = new XMLHttpRequest();
    xhr.open(
      "POST",
      `/api/uploadFormVideoFile?kind=exercise&name=${encodeURIComponent(file.name)}`
    );
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) setUploadPct(Math.round((ev.loaded / ev.total) * 100));
    };
    const fail = (msg: string) => {
      setUploadingField(null);
      setUploadPct(0);
      setUploadError(msg);
    };
    xhr.onload = () => {
      let data: any = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* non-JSON */
      }
      if (xhr.status === 200 && data.url) {
        // Feishu URL columns mangle relative paths — store an absolute URL, and
        // use the functional setState so a slow upload can't clobber other edits.
        const absolute = String(data.url).startsWith("/")
          ? `${window.location.origin}${data.url}`
          : String(data.url);
        setExerciseForm((prev: any) => ({ ...prev, [field]: absolute }));
        setUploadingField(null);
        setUploadPct(0);
      } else {
        fail(data.error || "Upload failed — please try again.");
      }
    };
    xhr.onerror = () => fail("Upload failed — check your connection and try again.");
    xhr.send(file);
  };

  const uploadControls = (field: VideoField, ref: any) => {
    const busy = uploadingField === field;
    const otherBusy = uploadingField !== null && !busy;
    return (
      <div className="exerciseUploadRow">
        <button
          type="button"
          className="exerciseUploadBtn"
          onClick={() => ref.current?.click()}
          disabled={busy || otherBusy}
        >
          <Upload size={13} />
          {busy ? `Uploading ${uploadPct}%` : "Upload from device"}
        </button>
        {isUploadedUrl(exerciseForm[field]) && !busy && (
          <span className="exerciseUploadedTag">Uploaded ✓</span>
        )}
        <input
          ref={ref}
          type="file"
          accept="video/*"
          className="exerciseFileInput"
          onChange={handlePick(field)}
        />
      </div>
    );
  };

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
                    <span>Short Video (quick demo)</span>
                    <input
                      value={exerciseForm.videoUrl}
                      onChange={(e) =>
                        setExerciseForm({
                          ...exerciseForm,
                          videoUrl: e.target.value,
                        })
                      }
                      placeholder="Paste a link, or upload below"
                    />
                    {uploadControls("videoUrl", shortFileRef)}
                  </label>

                  <label>
                    <span>Long Video (in-depth, optional)</span>
                    <input
                      value={exerciseForm.longVideoUrl}
                      onChange={(e) =>
                        setExerciseForm({
                          ...exerciseForm,
                          longVideoUrl: e.target.value,
                        })
                      }
                      placeholder="Paste a link, or upload below"
                    />
                    {uploadControls("longVideoUrl", longFileRef)}
                  </label>
                </div>
                {uploadError && <p className="exerciseUploadError">{uploadError}</p>}
                <p className="exerciseUploadHint">
                  Upload plays in-app and inside mainland China (self-hosted) —
                  unlike a YouTube link. Max {MAX_UPLOAD_MB} MB; MP4 or MOV.
                </p>
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
