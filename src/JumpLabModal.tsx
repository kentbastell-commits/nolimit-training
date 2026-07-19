// Jump Lab: MyJump-style flight-time analysis of an uploaded jump video.
// The athlete marks takeoff/landing frames (plus first contact for drop
// jumps); metrics are computed locally and saved through the Physical Test
// pipeline ("Jump Testing (Video)" template), with the clip uploaded for
// coach verification. Analysis is fully client-side — the video never
// leaves the device until the athlete saves.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import PortalToApp from "./PortalToApp";
import { jumpHeightCm, rsi, sayersPeakPowerW, round } from "./jumpMath";
import { detectVideoFps } from "./videoMeta";
import { autoDetectJump } from "./poseVideoScan";

type Mode = "cmj" | "dj";
type MarkKey = "contact" | "takeoff" | "landing";

const TEMPLATE_NAME = "Jump Testing (Video)";

// Two usages:
//  - self-serve (portal Home): saves a completed "Jump Testing (Video)" test
//  - analyzer-for-a-test (assigned-test modal passes onResult): computes the
//    numbers + uploads the clip, then hands everything back to the caller,
//    which fills the assigned test's answer fields.
export default function JumpLabModal({
  onClose,
  selectedClient,
  onResult,
  t,
}: { [key: string]: any }) {
  const [mode, setMode] = useState<Mode>("cmj");
  const [videoUrl, setVideoUrl] = useState("");
  const fileRef = useRef<File | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [marks, setMarks] = useState<Partial<Record<MarkKey, number>>>({});
  const [mediaTime, setMediaTime] = useState(0);
  const [frameDur, setFrameDur] = useState(1 / 30);
  const frameSamples = useRef<number[]>([]);
  const [bodyMass, setBodyMass] = useState("");
  // Slow-mo handling: phone slow-mo exports are STRETCHED (240fps recorded,
  // 30fps timeline → every real second lasts 8 timeline seconds). The athlete
  // tells us the recording rate; timeline durations get divided by the factor.
  const [recordingFps, setRecordingFps] = useState(0); // 0 = normal video
  // Encoded fps read from the file's container metadata. A genuine high-fps
  // file (original slo-mo, not a baked export) configures itself: mediaTime
  // is already real time, and the stepper can move one true frame at a time.
  const [fileFps, setFileFps] = useState<number | null>(null);
  const fileFpsRef = useRef<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [error, setError] = useState("");
  // Auto-mark: in-browser pose scan; cancelled if the modal closes mid-run.
  const [autoBusy, setAutoBusy] = useState(false);
  const [autoPct, setAutoPct] = useState(0);
  const [autoInfo, setAutoInfo] = useState("");
  const closedRef = useRef(false);
  useEffect(() => {
    closedRef.current = false;
    return () => {
      closedRef.current = true;
    };
  }, []);

  // Track the presented frame's exact mediaTime (frame-precise, unlike
  // video.currentTime after a seek) and estimate the true frame duration
  // from deltas — slow-mo exports report their real fps this way.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;
    let handle = 0;
    const cb = (_now: number, meta: any) => {
      setMediaTime(meta.mediaTime);
      const samples = frameSamples.current;
      const last = samples[samples.length - 1];
      // With a metadata-detected high-fps file, keep the parsed frame
      // duration — presented-frame deltas only reflect the display refresh.
      if (fileFpsRef.current && fileFpsRef.current >= 24) {
        handle = (video as any).requestVideoFrameCallback(cb);
        return;
      }
      if (last !== undefined && meta.mediaTime > last) {
        samples.push(meta.mediaTime);
        if (samples.length >= 12) {
          const deltas = samples
            .slice(1)
            .map((v, i) => v - samples[i])
            .filter((d) => d > 0.0005);
          deltas.sort((a, b) => a - b);
          const median = deltas[Math.floor(deltas.length / 2)];
          if (median) setFrameDur(median);
        }
      } else if (last === undefined) {
        samples.push(meta.mediaTime);
      }
      handle = (video as any).requestVideoFrameCallback(cb);
    };
    if (typeof (video as any).requestVideoFrameCallback === "function") {
      handle = (video as any).requestVideoFrameCallback(cb);
      return () => (video as any).cancelVideoFrameCallback?.(handle);
    }
    // Fallback: coarse tracking via timeupdate.
    const onTime = () => setMediaTime(video.currentTime);
    video.addEventListener("timeupdate", onTime);
    return () => video.removeEventListener("timeupdate", onTime);
  }, [videoUrl]);

  const pickFile = (file: File | null) => {
    if (!file) return;
    fileRef.current = file;
    frameSamples.current = [];
    setMarks({});
    setSavedOk(false);
    setError("");
    setFileFps(null);
    fileFpsRef.current = null;
    setRecordingFps(0);
    // Container metadata beats guessing: a genuine high-fps file announces
    // itself and the analyzer configures automatically (baked 30fps slow-mo
    // exports are indistinguishable from normal video — the one-tap fix
    // under the results stays for those).
    void detectVideoFps(file).then((fps) => {
      if (fileRef.current !== file || !fps) return;
      setFileFps(fps);
      fileFpsRef.current = fps;
      if (fps >= 24) setFrameDur(1 / fps);
    });
    setVideoUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(file);
    });
  };

  const step = (dir: 1 | -1) => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = Math.max(
      0,
      Math.min(video.duration || 0, video.currentTime + dir * frameDur)
    );
  };

  const setMark = (key: MarkKey) =>
    setMarks((prev) => ({ ...prev, [key]: mediaTime }));

  const playbackFps = 1 / frameDur;
  const slowFactor =
    recordingFps > playbackFps + 5 ? recordingFps / playbackFps : 1;
  const flightS =
    marks.takeoff !== undefined && marks.landing !== undefined
      ? (marks.landing - marks.takeoff) / slowFactor
      : 0;
  const contactS =
    mode === "dj" && marks.contact !== undefined && marks.takeoff !== undefined
      ? (marks.takeoff - marks.contact) / slowFactor
      : 0;
  const marksComplete =
    marks.takeoff !== undefined &&
    marks.landing !== undefined &&
    (mode === "cmj" || marks.contact !== undefined);
  const valid =
    flightS > 0.1 && flightS < 1.2 && (mode === "cmj" || (contactS > 0.05 && contactS < 1.5));
  const heightCm = valid ? round(jumpHeightCm(flightS)) : 0;
  const rsiValue = valid && mode === "dj" ? round(rsi(flightS, contactS), 2) : 0;
  const mass = Number(bodyMass);
  const powerW = valid && mass > 0 ? round(sayersPeakPowerW(heightCm, mass), 0) : 0;

  // Upload the clip for coach verification — best effort, never blocks.
  const uploadClip = async (): Promise<string> => {
    try {
      const file = fileRef.current;
      if (file && file.size < 200 * 1024 * 1024) {
        const up = await fetch(
          `/api/uploadFormVideoFile?name=${encodeURIComponent(file.name || "jump.mp4")}`,
          { method: "POST", body: file }
        );
        const upData = await up.json();
        if (up.ok && upData.url) {
          return `${window.location.origin}${upData.url}`;
        }
      }
    } catch {
      /* metrics still save without the clip */
    }
    return "";
  };

  const runAutoMark = async () => {
    if (autoBusy || !videoUrl) return;
    setAutoBusy(true);
    setAutoPct(0);
    setAutoInfo("");
    setError("");
    try {
      const result = await autoDetectJump(videoUrl, {
        frameDur,
        onProgress: setAutoPct,
        cancelled: () => closedRef.current,
      });
      if (closedRef.current) return;
      if (!result) {
        setError(t("jlbAutoFailed"));
        return;
      }
      setMarks((prev) => ({
        ...prev,
        takeoff: result.takeoff,
        landing: result.landing,
      }));
      const video = videoRef.current;
      if (video) {
        video.pause();
        video.currentTime = result.takeoff;
      }
      setAutoInfo(
        t("jlbAutoDone", {
          conf: Math.round(result.confidence * 100),
          count: result.jumpsFound,
        })
      );
    } catch {
      if (!closedRef.current) setError(t("jlbAutoFailed"));
    } finally {
      setAutoBusy(false);
    }
  };

  // Analyzer mode: hand the metrics back to the assigned-test modal.
  const useResult = async () => {
    if (!valid || saving) return;
    setSaving(true);
    const clipUrl = await uploadClip();
    setSaving(false);
    onResult({
      mode,
      heightCm,
      flightMs: Math.round(flightS * 1000),
      contactMs: mode === "dj" ? Math.round(contactS * 1000) : 0,
      rsiValue,
      powerW,
      clipUrl,
    });
    onClose();
  };

  const save = async () => {
    if (!valid || saving || !selectedClient) return;
    setSaving(true);
    setError("");
    try {
      // Resolve the Jump Testing template (created per environment).
      const tplRes = await fetch("/api/testTemplates");
      const tplData = await tplRes.json();
      const template = (tplData.tests || []).find(
        (test: any) => test.name === TEMPLATE_NAME
      );
      if (!template) throw new Error("Jump Testing template not found");

      const clipUrl = await uploadClip();

      const assignRes = await fetch("/api/assignContent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentType: "Physical Test",
          templateId: template.testTemplateId,
          templateName: template.name,
          clientId: selectedClient.id,
          clientCode: selectedClient.clientCode,
          clientName: selectedClient.name,
          assignedDate: new Date().toISOString().split("T")[0],
        }),
      });
      const assignData = await assignRes.json();
      if (!assignRes.ok || !assignData.success) throw new Error("assign failed");

      const itemByName = (name: string) =>
        (template.items || []).find((item: any) => item.testName === name);
      const rows: Array<[string, string, string]> = [
        ["CMJ Height", String(heightCm), "cm"],
        ["Flight Time", String(round(flightS * 1000, 0)), "ms"],
      ];
      if (mode === "dj") {
        rows.push(["Contact Time", String(round(contactS * 1000, 0)), "ms"]);
        rows.push(["RSI", String(rsiValue), "ratio"]);
      }
      if (powerW > 0) rows.push(["Peak Power", String(powerW), "W"]);

      const responses = rows
        .map(([name, value, unit]) => {
          const item = itemByName(name);
          return item
            ? {
                itemId: item.testItemId,
                label: name,
                unit,
                value,
                notes: "",
              }
            : null;
        })
        .filter(Boolean);

      const submitRes = await fetch("/api/submitContentResponse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentType: "Physical Test",
          assignmentRecordId: assignData.recordId,
          templateId: template.testTemplateId,
          clientId: selectedClient.id,
          clientName: selectedClient.name,
          responses: [
            ...responses,
            {
              itemId: "__client_comment",
              label: "Client Comment",
              unit: "",
              value: `${mode === "dj" ? "Drop jump" : "CMJ"} measured in Jump Lab${clipUrl ? ` — video: ${clipUrl}` : ""}`,
              notes: "",
            },
          ],
        }),
      });
      const submitData = await submitRes.json();
      if (!submitRes.ok || !submitData.success) throw new Error("submit failed");
      setSavedOk(true);
    } catch (err: any) {
      console.error(err);
      setError(t("jlbSaveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const fmt = (s: number | undefined) =>
    s === undefined ? "—" : `${round(s * 1000, 0)}ms`;

  const markButtons: Array<{ key: MarkKey; label: string }> =
    mode === "dj"
      ? [
          { key: "contact", label: t("jlbMarkContact") },
          { key: "takeoff", label: t("jlbMarkTakeoff") },
          { key: "landing", label: t("jlbMarkLanding") },
        ]
      : [
          { key: "takeoff", label: t("jlbMarkTakeoff") },
          { key: "landing", label: t("jlbMarkLanding") },
        ];

  return (
    <PortalToApp>
      <div className="rpnOverlay" onClick={onClose}>
        <div className="rpnModal jlbModal" onClick={(event) => event.stopPropagation()}>
          <div className="rpnHead">
            <h3>{t("jlbTitle")}</h3>
            <button className="rpnClose" aria-label="Close" onClick={onClose}>
              ✕
            </button>
          </div>

          {savedOk ? (
            <div className="jlbDone">
              <span className="jlbDoneIcon">🎉</span>
              <p>{t("jlbSaved")}</p>
              <div className="jlbResults">
                <div className="jlbMetric">
                  <strong>{heightCm}</strong>
                  <span>cm</span>
                </div>
                {rsiValue > 0 && (
                  <div className="jlbMetric">
                    <strong>{rsiValue}</strong>
                    <span>RSI</span>
                  </div>
                )}
              </div>
              <button className="goldButton" onClick={onClose}>
                {t("done")}
              </button>
            </div>
          ) : (
            <>
              <div className="rpnChips">
                <button
                  className={`rpnChip ${mode === "cmj" ? "" : "rpnChipGhost"}`}
                  onClick={() => {
                    setMode("cmj");
                    setMarks({});
                  }}
                >
                  {t("jlbModeCmj")}
                </button>
                <button
                  className={`rpnChip ${mode === "dj" ? "" : "rpnChipGhost"}`}
                  onClick={() => {
                    setMode("dj");
                    setMarks({});
                  }}
                >
                  {t("jlbModeDj")}
                </button>
              </div>

              {!videoUrl ? (
                <label className="jlbDrop">
                  <input
                    type="file"
                    accept="video/*"
                    hidden
                    onChange={(event) => pickFile(event.target.files?.[0] || null)}
                  />
                  <span className="jlbDropIcon">🎬</span>
                  <strong>{t("jlbPick")}</strong>
                  <span className="rpnHint">{t("jlbFilmTips")}</span>
                </label>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    className="jlbVideo"
                    src={videoUrl}
                    controls
                    playsInline
                    muted
                    preload="auto"
                  />
                  <div className="jlbScrub">
                    <button className="rpnChip rpnChipGhost" onClick={() => step(-1)}>
                      ‹ {t("jlbFrame")}
                    </button>
                    <span className="jlbTime">
                      {round(mediaTime, 3).toFixed(3)}s · {Math.round(1 / frameDur)}fps
                    </span>
                    <button className="rpnChip rpnChipGhost" onClick={() => step(1)}>
                      {t("jlbFrame")} ›
                    </button>
                  </div>

                  <div className="jlbSlowmo">
                    {fileFps ? (
                      <span className="jlbDetected">
                        {t("jlbDetected", { fps: fileFps })}
                      </span>
                    ) : null}
                    <span>{t("jlbSlowmo")}</span>
                    <select
                      value={recordingFps}
                      onChange={(event) => setRecordingFps(Number(event.target.value))}
                    >
                      <option value={0}>{t("jlbSlowmoNormal")}</option>
                      <option value={120}>{t("jlbSlowmo120")}</option>
                      <option value={240}>{t("jlbSlowmo240")}</option>
                    </select>
                    {slowFactor > 1 ? (
                      <span className="rpnHint">×{round(slowFactor, 1)}</span>
                    ) : null}
                  </div>

                  <button
                    className="goldButton jlbAutoBtn"
                    disabled={autoBusy || saving}
                    onClick={runAutoMark}
                  >
                    {autoBusy
                      ? t("jlbAutoScanning", { pct: autoPct })
                      : `⚡ ${t("jlbAuto")}`}
                  </button>
                  {autoInfo ? <p className="jlbAutoInfo">{autoInfo}</p> : null}

                  <div className="jlbMarks">
                    {markButtons.map(({ key, label }) => (
                      <button
                        key={key}
                        className={`jlbMark ${marks[key] !== undefined ? "jlbMarkSet" : ""}`}
                        onClick={() => setMark(key)}
                      >
                        <span>{label}</span>
                        <strong>{fmt(marks[key])}</strong>
                      </button>
                    ))}
                  </div>

                  <div className="jlbResults">
                    <div className="jlbMetric">
                      <strong>{valid ? heightCm : "—"}</strong>
                      <span>{t("jlbHeight")} (cm)</span>
                    </div>
                    <div className="jlbMetric">
                      <strong>{valid ? Math.round(flightS * 1000) : "—"}</strong>
                      <span>{t("jlbFlight")} (ms)</span>
                    </div>
                    {mode === "dj" && (
                      <>
                        <div className="jlbMetric">
                          <strong>{valid ? Math.round(contactS * 1000) : "—"}</strong>
                          <span>{t("jlbContact")} (ms)</span>
                        </div>
                        <div className="jlbMetric">
                          <strong>{valid ? rsiValue : "—"}</strong>
                          <span>RSI</span>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="jlbMassRow">
                    <input
                      type="number"
                      className="rpnDate jlbMass"
                      placeholder={t("jlbMass")}
                      value={bodyMass}
                      onChange={(event) => setBodyMass(event.target.value)}
                    />
                    {powerW > 0 && (
                      <span className="jlbPower">
                        {t("jlbPower")}: <strong>{powerW} W</strong>
                      </span>
                    )}
                  </div>

                  {marksComplete && !valid ? (
                    <div>
                      <p className="jlbError">
                        {t("jlbImplausible", {
                          ms: Math.round(flightS * 1000),
                        })}
                      </p>
                      {/* Too-long flight with no slow factor set = almost
                          certainly a slow-mo clip left on "Normal". Offer
                          the one-tap fix; 240 first (the iPhone default we
                          recommend), 120 as the alternative. */}
                      {slowFactor === 1 && flightS >= 1.2 ? (
                        <div className="rpnChips">
                          <button
                            className="rpnChip"
                            onClick={() => setRecordingFps(240)}
                          >
                            {t("jlbTreat240")}
                          </button>
                          <button
                            className="rpnChip rpnChipGhost"
                            onClick={() => setRecordingFps(120)}
                          >
                            {t("jlbTreat120")}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {error ? <p className="jlbError">{error}</p> : null}

                  <div className="rpnFooter">
                    <button
                      className="goldButton"
                      disabled={!valid || saving}
                      onClick={onResult ? useResult : save}
                    >
                      {saving ? "…" : onResult ? t("jlbUse") : t("jlbSave")}
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </PortalToApp>
  );
}
