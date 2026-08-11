import "dotenv/config";
import express from "express";
import compression from "compression";
// The DATA_BACKEND tripwire that lived here is gone with the Feishu backend
// itself (retired 2026-07-26): there is no longer a second backend to fall
// back to, so no env var can silently serve the frozen mirror.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { injectSeo } from "./seo.ts";
import { startCacheBus } from "./db/cacheBus.ts";
import { createTenantTokenCachingFetch } from "./tenantTokenCache.ts";

// ---------------------------------------------------------------------------
// Process-wide Feishu tenant-token cache, isolated by app_id.
//
// Every API handler fetches a fresh tenant_access_token before doing its real
// work — an extra ~700-900ms Feishu round-trip on EVERY request. Since this is
// a single long-lived process, we cache the token (valid ~2h) by wrapping the
// global fetch, so the handlers keep their existing code but only actually hit
// the auth endpoint once every couple of hours. Per-app in-flight promises
// stop bursts without ever crossing the product/company-ops credential boundary.
// ---------------------------------------------------------------------------
const realFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = createTenantTokenCachingFetch(realFetch);

import { COACH_ONLY_HANDLERS, coachKeyOk } from "../api/_coachAuth.ts";
import activateDigitalOrder from "../api/activateDigitalOrder.ts";
import analytics from "../api/analytics.ts";
import autoLoadProgram from "../api/autoLoadProgram.ts";
import assignContent from "../api/assignContent.ts";
import assignProgram from "../api/assignProgram.ts";
import athleteMetrics from "../api/athleteMetrics.ts";
import checkIns from "../api/checkIns.ts";
import clientLog from "../api/clientLog.ts";
import programExport from "../api/programExport.ts";
import clientMessages from "../api/clientMessages.ts";
import clients from "../api/clients.ts";
import coaches from "../api/coaches.ts";
import coachingSignup from "../api/coachingSignup.ts";
import companyOpsActions from "../api/companyOpsActions.ts";
import companyOpsAssetUpload from "../api/companyOpsAssetUpload.ts";
import companyOpsAuthCallback from "../api/companyOpsAuthCallback.ts";
import companyOpsDashboard from "../api/companyOpsDashboard.ts";
import companyOpsLogin from "../api/companyOpsLogin.ts";
import companyOpsLogout from "../api/companyOpsLogout.ts";
import companyOpsSession from "../api/companyOpsSession.ts";
import companyOpsTranslate from "../api/companyOpsTranslate.ts";
import contentResponses from "../api/contentResponses.ts";
import contentAssignments from "../api/contentAssignments.ts";
import createClient from "../api/createClient.ts";
import createProductOrder from "../api/createProductOrder.ts";
import createProgram from "../api/createProgram.ts";
import createWorkoutTemplate from "../api/createWorkoutTemplate.ts";
import createWorkoutTemplatesBulk from "../api/createWorkoutTemplatesBulk.ts";
import deleteRecord from "../api/deleteRecord.ts";
import duplicateAssignedWorkout from "../api/duplicateAssignedWorkout.ts";
import duplicateProgram from "../api/duplicateProgram.ts";
import enquiries from "../api/enquiries.ts";
import inPersonEnquiry from "../api/inPersonEnquiry.ts";
import exerciseResults from "../api/exerciseResults.ts";
import exercises from "../api/exercises.ts";
import findMyPortal from "../api/findMyPortal.ts";
import myProfile from "../api/myProfile.ts";
import wxSubscribeBank from "../api/wxSubscribeBank.ts";
import formVideos from "../api/formVideos.ts";
import formTemplates from "../api/formTemplates.ts";
import notifications from "../api/notifications.ts";
import productOrders from "../api/productOrders.ts";
import programs from "../api/programs.ts";
import recordLogin from "../api/recordLogin.ts";
import referralStatus from "../api/referralStatus.ts";
import programTemplates from "../api/programTemplates.ts";
import testLibrary from "../api/testLibrary.ts";
import reviews from "../api/reviews.ts";
import reviewWorkoutComment from "../api/reviewWorkoutComment.ts";
import saveWorkoutLog from "../api/saveWorkoutLog.ts";
import setWorkoutReviewed from "../api/setWorkoutReviewed.ts";
import shiftAssignedWorkouts from "../api/shiftAssignedWorkouts.ts";
import workloadLogs from "../api/workloadLogs.ts";
import saveWorkloadLog from "../api/saveWorkloadLog.ts";
import submitContentResponse from "../api/submitContentResponse.ts";
import subscriptions from "../api/subscriptions.ts";
import upsertSubscription from "../api/upsertSubscription.ts";
import teams from "../api/teams.ts";
import testTemplates from "../api/testTemplates.ts";
import updateAssignedProgramDate from "../api/updateAssignedProgramDate.ts";
import reorderAssignedWorkouts from "../api/reorderAssignedWorkouts.ts";
import updateContentAssignmentDate from "../api/updateContentAssignmentDate.ts";
import updateClient from "../api/updateClient.ts";
import updateProductOrder from "../api/updateProductOrder.ts";
import updateProgram from "../api/updateProgram.ts";
import upsertCoach from "../api/upsertCoach.ts";
import upsertExercise from "../api/upsertExercise.ts";
import upsertTeam from "../api/upsertTeam.ts";
import workoutDetails from "../api/workoutDetails.ts";
import workoutHistory from "../api/workoutHistory.ts";
import workoutComments from "../api/workoutComments.ts";
import warmCache from "../api/warmCache.ts";
import wxAuth from "../api/wxAuth.ts";
import wxpayConfig from "../api/wxpayConfig.ts";
import wxpayCreate from "../api/wxpayCreate.ts";
import wxpayNotify from "../api/wxpayNotify.ts";
import wxpayStatus from "../api/wxpayStatus.ts";
import workouts from "../api/workouts.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = Number(process.env.PORT || 3001);

// Safety net for anything outside the per-handler try/catch below (Express
// middleware, a bug in server startup, a truly synchronous throw). Without
// this, Node's default behavior is to crash the process on either of these —
// in cluster mode that's just this one worker restarting, but running as a
// single fork-mode instance (the previous setup) it was the entire site.
// Log first so the cause isn't lost, then exit for uncaughtException — the
// process state after a genuinely uncaught synchronous error can't be
// trusted, and PM2 (cluster or fork) restarts it clean.
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});
process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  process.exit(1);
});

// Compress JS/CSS/JSON at the application boundary. The production reverse
// proxy currently forwards these responses without content encoding, which
// makes the 500KB+ entry bundle especially painful on China/HK mobile links.
app.use(
  compression({
    threshold: 1024,
  })
);

// Video uploads: raw video body -> random filename on disk, served from
// /uploads. Registered BEFORE express.json so large videos skip the 2mb cap.
// Two callers share this: athlete form-review clips (kind=form, prefix "fv-",
// may be pruned) and permanent exercise-library demos (kind=exercise, prefix
// "ex-"). The prefix keeps the two apart on disk so cleanup never eats a
// library video.
const uploadsDir = path.resolve(__dirname, "../uploads");
fs.mkdirSync(uploadsDir, { recursive: true });
// Stream the upload straight to disk rather than buffering the whole file in
// memory — this box has ~1.7GB RAM, so a buffered 300MB+ phone video would risk
// OOM. Constant memory here regardless of file size; the cap is enforced by
// counting bytes. Registered BEFORE express.json so req is the raw body stream.
const MAX_UPLOAD_BYTES = 500 * 1024 * 1024; // keep in step with the client cap
app.post("/api/uploadFormVideoFile", (req, res) => {
  const extMatch = String(req.query.name || "").match(
    /\.(mp4|mov|webm|m4v|jpg|jpeg|png|webp)$/i
  );
  const isImageKind = req.query.kind === "coach";
  const ext = extMatch ? extMatch[0].toLowerCase() : isImageKind ? ".jpg" : ".mp4";
  const prefix =
    req.query.kind === "exercise" ? "ex" : isImageKind ? "coach" : "fv";
  const name = `${prefix}-${crypto.randomBytes(12).toString("hex")}${ext}`;
  const dest = path.join(uploadsDir, name);
  const ws = fs.createWriteStream(dest);
  let received = 0;
  let settled = false;
  const settle = (fn: () => void) => {
    if (settled) return;
    settled = true;
    fn();
  };
  const abort = (code: number, payload: Record<string, unknown>) =>
    settle(() => {
      ws.destroy();
      fs.unlink(dest, () => {});
      if (!res.headersSent) res.status(code).json(payload);
    });
  req.on("data", (chunk: Buffer) => {
    if (settled) return;
    received += chunk.length;
    if (received > MAX_UPLOAD_BYTES) {
      req.destroy();
      abort(413, { error: "File too large" });
      return;
    }
    if (!ws.write(chunk)) {
      req.pause();
      ws.once("drain", () => {
        if (!settled) req.resume();
      });
    }
  });
  req.on("end", () => {
    if (!settled) ws.end();
  });
  req.on("error", () => abort(500, { error: "Upload failed" }));
  req.on("aborted", () => abort(400, { error: "Upload aborted" }));
  ws.on("error", () => abort(500, { error: "Upload failed" }));
  ws.on("finish", () =>
    settle(() => {
      if (!received) {
        fs.unlink(dest, () => {});
        res.status(400).json({ error: "Empty upload" });
        return;
      }
      res.status(200).json({ success: true, url: `/uploads/${name}` });
    })
  );
});

// Authenticated Company Operations assets go directly to the dedicated
// Feishu Drive folder. This is intentionally registered before express.json:
// the endpoint accepts a raw file body, streams larger files through Feishu's
// multipart flow, and applies its own 500 MiB bound plus session, role, origin,
// CSRF, filename and content checks.
app.post("/api/company-ops/assets/upload", (req, res) => {
  void Promise.resolve(companyOpsAssetUpload(req as never, res as never)).catch(
    (error) => {
      console.error("API handler failed: companyOpsAssetUpload", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Server error" });
      }
    }
  );
});
app.use(
  "/uploads",
  express.static(uploadsDir, { maxAge: "365d", immutable: true })
);

// WeChat Pay callback: the APIv3 signature covers the exact raw bytes, so
// this must be a dedicated raw-body route registered BEFORE express.json.
app.post("/api/wxpayNotify", (req, res) => {
  void Promise.resolve(wxpayNotify(req, res)).catch((error) => {
    console.error("API handler failed: wxpayNotify", error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ code: "FAIL", message: "internal error" }));
    }
  });
});

app.use(express.json({ limit: "2mb" }));

const handlers = {
  activateDigitalOrder,
  analytics,
  autoLoadProgram,
  assignContent,
  assignProgram,
  athleteMetrics,
  checkIns,
  clientLog,
  programExport,
  clientMessages,
  clients,
  coaches,
  coachingSignup,
  companyOpsActions,
  companyOpsAuthCallback,
  companyOpsDashboard,
  companyOpsLogin,
  companyOpsLogout,
  companyOpsSession,
  companyOpsTranslate,
  contentResponses,
  contentAssignments,
  createClient,
  createProductOrder,
  createProgram,
  createWorkoutTemplate,
  createWorkoutTemplatesBulk,
  deleteRecord,
  duplicateAssignedWorkout,
  duplicateProgram,
  enquiries,
  inPersonEnquiry,
  exerciseResults,
  exercises,
  findMyPortal,
  myProfile,
  wxSubscribeBank,
  formVideos,
  formTemplates,
  notifications,
  productOrders,
  programs,
  recordLogin,
  referralStatus,
  programTemplates,
  testLibrary,
  reviews,
  reviewWorkoutComment,
  saveWorkoutLog,
  setWorkoutReviewed,
  shiftAssignedWorkouts,
  workloadLogs,
  saveWorkloadLog,
  submitContentResponse,
  subscriptions,
  upsertSubscription,
  teams,
  testTemplates,
  updateAssignedProgramDate,
  reorderAssignedWorkouts,
  updateContentAssignmentDate,
  updateClient,
  updateProductOrder,
  updateProgram,
  upsertCoach,
  upsertExercise,
  upsertTeam,
  warmCache,
  wxAuth,
  wxpayConfig,
  wxpayCreate,
  wxpayStatus,
  workoutDetails,
  workoutHistory,
  workoutComments,
  workouts,
};

Object.entries(handlers).forEach(([name, handler]) => {
  app.all(`/api/${name}`, (req, res) => {
    // Coach/admin endpoints require the access key once COACH_ACCESS_KEY is
    // set (athlete + public endpoints are never gated).
    if (COACH_ONLY_HANDLERS.has(name) && !coachKeyOk(req as never)) {
      res.status(401).json({ error: "Coach access key required" });
      return;
    }
    void Promise.resolve(handler(req as never, res as never)).catch((error) => {
      console.error(`API handler failed: ${name}`, error);
      if (!res.headersSent) {
        res.status(500).json({
          error: "Server error",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    });
  });
});

const distPath = path.resolve(__dirname, "../dist");
const indexTemplate = fs.readFileSync(path.join(distPath, "index.html"), "utf8");
const publicSiteUrl =
  process.env.PUBLIC_SITE_URL ||
  process.env.VITE_PUBLIC_SITE_URL ||
  "https://trainnolimit.com";

// Keep index:false so every HTML request receives route-specific metadata.
// Hashed Vite assets are immutable and can stay in the browser/CDN for a year;
// the HTML shell remains no-cache below so every deploy discovers new hashes.
app.use(
  "/assets",
  express.static(path.join(distPath, "assets"), {
    index: false,
    maxAge: "365d",
    immutable: true,
    etag: true,
  })
);
// robots.txt, sitemap.xml and other public files come straight from dist.
app.use(express.static(distPath, { index: false }));
app.get(/.*/, (req, res) => {
  res
    .type("html")
    .set("Cache-Control", "no-cache, no-store, must-revalidate")
    .send(injectSeo(indexTemplate, req.originalUrl, publicSiteUrl));
});

app.listen(port, "127.0.0.1", () => {
  console.log(`NX LIMIT Training server listening on http://127.0.0.1:${port}`);

  // Cross-process cache invalidation: the 2 PM2 forks each cache in-process,
  // so without the bus a write on one fork left the other stale for the
  // whole TTL (named mistake #5). Best-effort — a bus failure only degrades
  // to TTL-staleness.
  void startCacheBus().catch(() => {});

  // Warm the heavy read caches in the background right after boot, so the first
  // real user request (especially opening a workout, which scans the whole
  // workout-templates table + exercise library) hits a warm cache instead of
  // paying the full multi-second Feishu scan. Failures are ignored.
  const warm = (pathname: string) =>
    realFetch(`http://127.0.0.1:${port}${pathname}`).catch(() => {});
  setTimeout(() => {
    // dummy params still trigger (and cache) the full templates + library scans
    void warm("/api/workoutDetails?programId=__warm__&week=1&day=1");
    void warm("/api/exercises");
    void warm("/api/programs");
    void warm("/api/clients");
    void warm("/api/teams");
    void warm("/api/coaches");
  }, 1500);
});
