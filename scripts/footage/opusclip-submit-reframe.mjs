// Submit one square source video to OpusClip as a full-length 16:9 AI reframe.
//
// Usage:
//   node scripts/footage/opusclip-submit-reframe.mjs <file> [--feet-priority] [--speech]
//   node scripts/footage/opusclip-submit-reframe.mjs --upload-id ID --title TITLE [flags]
//
// --speech enables OpusClip voice enhancement and filler-word removal.
// The resulting project metadata is appended to a resumable NDJSON manifest.

import { appendFileSync, createReadStream, existsSync, mkdirSync, statSync } from "node:fs";
import { basename, dirname, extname } from "node:path";

const API_BASE = (process.env.OPUSCLIP_API_URL || "https://api.opus.pro/api").replace(/\/+$/, "");
const API_KEY = process.env.OPUSCLIP_API_KEY;
const DEFAULT_MANIFEST = "C:\\Users\\kentb\\Videos\\nolimit-footage\\opusclip-16x9\\projects.ndjson";

function parseArgs(argv) {
  const file = argv[0] && !argv[0].startsWith("--") ? argv[0] : undefined;
  const valueAfter = (flag) => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  return {
    file,
    uploadId: valueAfter("--upload-id"),
    title: valueAfter("--title"),
    feetPriority: argv.includes("--feet-priority"),
    speech: argv.includes("--speech"),
    manifest: valueAfter("--manifest") || DEFAULT_MANIFEST,
  };
}

async function api(path, { method = "GET", body } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${method} ${path} failed: ${response.status} ${text.slice(0, 500)}`);
  }
  return text.trim() ? JSON.parse(text) : {};
}

function framingPrompt(feetPriority) {
  if (feetPriority) {
    return [
      "Keep the full original video and AI-reframe it as a polished 16:9 landscape social-media video.",
      "Track the active athlete, not mirrors or bystanders.",
      "This is a full-body or floor-contact movement: keep both feet and the landing/contact area visible throughout,",
      "while also preserving the head, the working implement, and the complete movement path.",
      "Use a smooth stable crop with modest headroom and no unnecessary zoom.",
    ].join(" ");
  }
  return [
    "Keep the full original video and AI-reframe it as a polished 16:9 landscape social-media video.",
    "Track the active athlete and the relevant equipment, not mirrors or bystanders.",
    "Use balanced subject-and-equipment composition, preserve the complete working range,",
    "and use a smooth stable crop with modest headroom and no unnecessary zoom.",
  ].join(" ");
}

async function uploadLocalFile(file) {
  const stats = statSync(file);
  const extension = extname(file).replace(/^\./, "").toLowerCase() || "mp4";
  const fileName = basename(file);
  const sizeMb = Math.max(1, Math.ceil(stats.size / (1024 * 1024)));

  console.log(JSON.stringify({ event: "upload_link", file: fileName, size_mb: sizeMb }));
  const raw = await api("/upload-links", {
    method: "POST",
    body: { type: "Upload", domain: "Google", usecase: "LocalUpload", extension, fileName, size: sizeMb },
  });
  const link = raw.data ?? raw;
  if (!link.url || !link.uploadId) throw new Error("Upload-link response is missing url or uploadId");

  const init = await fetch(link.url, {
    method: "POST",
    headers: { "x-goog-resumable": "start", "Content-Length": "0" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!init.ok) throw new Error(`GCS upload initialization failed: ${init.status} ${(await init.text()).slice(0, 500)}`);
  const sessionUrl = init.headers.get("location");
  if (!sessionUrl) throw new Error("GCS upload initialization did not return a Location header");

  console.log(JSON.stringify({ event: "upload_started", file: fileName, bytes: stats.size }));
  const upload = await fetch(sessionUrl, {
    method: "PUT",
    headers: { "Content-Type": "application/octet-stream", "Content-Length": String(stats.size) },
    body: createReadStream(file),
    duplex: "half",
  });
  if (!upload.ok) throw new Error(`GCS file upload failed: ${upload.status} ${(await upload.text()).slice(0, 500)}`);
  console.log(JSON.stringify({ event: "upload_finished", file: fileName }));
  return link.uploadId;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.file && !args.uploadId) throw new Error("A source video path or --upload-id is required");
  if (args.file && !existsSync(args.file)) throw new Error(`Source video not found: ${args.file}`);
  if (!API_KEY) throw new Error("OPUSCLIP_API_KEY is not set");

  const uploadId = args.uploadId || await uploadLocalFile(args.file);
  const title = args.title || basename(args.file, extname(args.file));
  const quickstartConfig = (args.speech || args.feetPriority)
    ? {
        ...(args.speech ? { enableRemoveFillerWords: true, enableVoiceEnhancement: true } : {}),
        ...(args.feetPriority ? { skipReframe: true } : {}),
      }
    : undefined;
  const payload = {
    videoUrl: uploadId,
    uploadedVideoAttr: { title },
    curationPref: {
      model: "ClipAnything",
      skipSlicing: true,
      customPrompt: framingPrompt(args.feetPriority),
    },
    renderPref: {
      layoutAspectRatio: "landscape",
      enableCaption: false,
      enableWatermark: false,
      enableAutoLayout: false,
      enableFillLayout: !args.feetPriority,
      enableFitLayout: true,
      skipReframe: args.feetPriority,
      ...(args.feetPriority ? { fitLayoutCropRatio: "1:1", disableFitBackgroundBlur: false } : {}),
      ...(args.speech ? { enableVoiceEnhancement: true } : {}),
      ...(quickstartConfig ? { quickstartConfig } : {}),
    },
  };

  console.log(JSON.stringify({ event: "project_create", title, feet_priority: args.feetPriority, speech: args.speech }));
  console.log("Using video you don't own may violate copyright laws. By continuing, you confirm this is your own original content.");
  const raw = await api("/clip-projects", { method: "POST", body: payload });
  const project = raw.data ?? raw;
  const projectId = project.id || project.projectId;
  if (!projectId) throw new Error(`Project response is missing an ID: ${JSON.stringify(project).slice(0, 500)}`);

  const record = {
    submitted_at: new Date().toISOString(),
    source: args.file || null,
    title,
    project_id: projectId,
    upload_id: uploadId,
    aspect: "landscape",
    feet_priority: args.feetPriority,
    speech_enhancement: args.speech,
    filler_removal: args.speech,
    stage: project.stage,
  };
  mkdirSync(dirname(args.manifest), { recursive: true });
  appendFileSync(args.manifest, `${JSON.stringify(record)}\n`, "utf8");
  console.log(JSON.stringify({ event: "submitted", ...record }));
}

main().catch((error) => {
  console.error(JSON.stringify({ event: "error", message: error instanceof Error ? error.message : String(error) }));
  process.exitCode = 1;
});
