// Add/Edit Exercise modal — design-refs handoff (dark/gold header, cream body,
// color-coded video cards). All logic/handlers preserved from the original
// extraction; styling is self-contained in ExerciseModal.css (ax* classes) so
// the legacy clientFormModal/tone-header override families don't apply.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import type { TrackingType } from "./appCore";
import "./ExerciseModal.css";
import {
  Check,
  ChevronDown,
  Copy,
  Shuffle,
  Sparkles,
  Upload,
  Video,
  X,
} from "lucide-react";

// Keep in step with the server's streamed-upload cap (500MB) and nginx.
const MAX_UPLOAD_MB = 500;

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

  // Esc closes (scrim click and Cancel also close; clicks inside don't).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeExerciseForm();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const taxonomyField = (
    label: string,
    key: "category" | "muscleGroup" | "movementPattern" | "equipment",
    options: string[]
  ) => {
    const value = exerciseForm[key];
    return (
      <label className="axField">
        <span className="axLabel">{label}</span>
        <div className="axSelectWrap">
          <select
            className="axSelect"
            value={value}
            onChange={(e) =>
              setExerciseForm({ ...exerciseForm, [key]: e.target.value })
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
          <ChevronDown size={15} className="axCaret" />
        </div>
      </label>
    );
  };

  // Short = gold, Long = teal (design's color-coded video cards).
  const videoCard = (
    field: VideoField,
    ref: any,
    title: string,
    tag: string,
    tone: "gold" | "teal"
  ) => {
    const busy = uploadingField === field;
    const otherBusy = uploadingField !== null && !busy;
    return (
      <div className={`axVideoCard axVideoCard-${tone}`}>
        <div className="axVideoHead">
          <span className={`axVideoIcon axVideoIcon-${tone}`}>
            <Video size={17} strokeWidth={2.1} />
          </span>
          <div className="axVideoTitle">
            <strong>{title}</strong>
            <span className={`axVideoTag axVideoTag-${tone}`}>
              {tag}
              {isUploadedUrl(exerciseForm[field]) && !busy && " · Uploaded ✓"}
            </span>
          </div>
        </div>
        <input
          className="axInput axVideoInput"
          type="text"
          value={exerciseForm[field]}
          onChange={(e) =>
            setExerciseForm({ ...exerciseForm, [field]: e.target.value })
          }
          placeholder="Paste a video link…"
        />
        <div className="axOrRow">
          <span />
          <em>or</em>
          <span />
        </div>
        <button
          type="button"
          className={`axUploadBtn axUploadBtn-${tone}`}
          onClick={() => ref.current?.click()}
          disabled={busy || otherBusy}
        >
          <Upload size={15} strokeWidth={2.4} />
          {busy ? `Uploading ${uploadPct}%` : "Upload from device"}
        </button>
        <input
          ref={ref}
          type="file"
          accept="video/mp4,video/quicktime,video/*"
          className="axFileInput"
          onChange={handlePick(field)}
        />
      </div>
    );
  };

  return (
    <div className="axScrim" onClick={closeExerciseForm}>
      <div
        className="axDialog"
        role="dialog"
        aria-modal="true"
        aria-label={editingExercise ? "Edit Exercise" : "Add Exercise"}
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="axHead">
          <div className="axHeadGlow" />
          <div className="axHeadInner">
            <div className="axHeadText">
              <span className="axEyebrow">
                <Shuffle size={14} strokeWidth={2.2} />
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
              type="button"
              className="axClose"
              onClick={closeExerciseForm}
              aria-label="Close"
            >
              <X size={19} />
            </button>
          </div>
        </div>

        {/* body */}
        <div className="axBody">
          <div className="axGrid">
            <label className="axField">
              <span className="axLabel">Exercise Name</span>
              <input
                className="axInput"
                autoFocus
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
            {taxonomyField("Category", "category", categoryOptions)}
            {taxonomyField("Muscle Group", "muscleGroup", muscleGroupOptions)}
            {taxonomyField(
              "Movement Pattern",
              "movementPattern",
              movementPatternOptions
            )}
            {taxonomyField("Equipment", "equipment", equipmentOptions)}
            <label className="axField">
              <span className="axLabel">Record</span>
              <div className="axSelectWrap">
                <select
                  className="axSelect"
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
                <ChevronDown size={15} className="axCaret" />
              </div>
            </label>
          </div>

          {/* unilateral toggle card */}
          <button
            type="button"
            className={`axUniRow${exerciseForm.isUnilateral ? " on" : ""}`}
            aria-pressed={exerciseForm.isUnilateral}
            onClick={() =>
              setExerciseForm({
                ...exerciseForm,
                isUnilateral: !exerciseForm.isUnilateral,
              })
            }
          >
            <span className="axUniBox">
              {exerciseForm.isUnilateral && (
                <Check size={14} strokeWidth={3.2} />
              )}
            </span>
            <span className="axUniText">
              <strong>Unilateral</strong>
              <span>Trains one side at a time</span>
            </span>
          </button>

          {/* demo videos */}
          <span className="axLabel axSectionLabel">Demo Videos</span>
          <div className="axGrid axVideoGrid">
            {videoCard("videoUrl", shortFileRef, "Short Video", "Quick demo", "gold")}
            {videoCard(
              "longVideoUrl",
              longFileRef,
              "Long Video",
              "In-depth · optional",
              "teal"
            )}
          </div>
          {uploadError && <p className="axUploadError">{uploadError}</p>}

          <div className="axCallout">
            <span className="axCalloutBadge">
              <Check size={15} strokeWidth={2.4} />
            </span>
            <p>
              <strong>Plays in mainland China.</strong> Uploads are self-hosted
              and play in-app — unlike a YouTube link. Up to {MAX_UPLOAD_MB} MB;
              MP4 or MOV. A large phone video can take a minute or two — keep
              the page open.
            </p>
          </div>

          {renderVideoPreview(exerciseForm.videoUrl)}

          {/* notes */}
          <div className="axNotes">
            <div className="axNotesHead">
              <span className="axLabel">Form Instructions / Library Notes</span>
              <div className="axNotesActions">
                <button
                  type="button"
                  className="axAiBtn axAiBtn-gold"
                  onClick={applyExerciseCueDraft}
                >
                  <Sparkles size={13} strokeWidth={2.2} />
                  Generate Cue Draft
                </button>
                <button
                  type="button"
                  className="axAiBtn"
                  onClick={() => void copyExerciseAiPrompt()}
                >
                  <Copy size={13} strokeWidth={2.2} />
                  Copy AI Prompt
                </button>
              </div>
            </div>
            <textarea
              className="axArea"
              value={exerciseForm.notes}
              onChange={(e) =>
                setExerciseForm({ ...exerciseForm, notes: e.target.value })
              }
              placeholder="Setup, technique cues, common mistakes…"
            />
          </div>
        </div>

        {/* footer */}
        <div className="axFoot">
          <button type="button" className="axCancel" onClick={closeExerciseForm}>
            Cancel
          </button>
          <button
            type="button"
            className="axCreate"
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
  );
}
