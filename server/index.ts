import "dotenv/config";
import express from "express";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { injectSeo } from "./seo.ts";

// ---------------------------------------------------------------------------
// Process-wide Feishu tenant-token cache.
//
// Every API handler fetches a fresh tenant_access_token before doing its real
// work — an extra ~700-900ms Feishu round-trip on EVERY request. Since this is
// a single long-lived process, we cache the token (valid ~2h) by wrapping the
// global fetch, so the handlers keep their existing code but only actually hit
// the auth endpoint once every couple of hours. A shared in-flight promise
// stops a burst of concurrent requests from each fetching their own token.
// ---------------------------------------------------------------------------
const TOKEN_URL =
  "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal";
const realFetch = globalThis.fetch.bind(globalThis);
let tokenCache: { token: string; expiry: number } = { token: "", expiry: 0 };
let tokenInflight: Promise<string> | null = null;

const tokenResponse = (token: string, ttlMs: number) =>
  new Response(
    JSON.stringify({
      code: 0,
      msg: "ok",
      tenant_access_token: token,
      expire: Math.max(60, Math.round(ttlMs / 1000)),
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );

globalThis.fetch = (async (input: any, init?: any) => {
  const url =
    typeof input === "string" ? input : input?.url || String(input || "");
  if (url !== TOKEN_URL) return realFetch(input, init);

  const now = Date.now();
  if (tokenCache.token && now < tokenCache.expiry) {
    return tokenResponse(tokenCache.token, tokenCache.expiry - now);
  }
  if (!tokenInflight) {
    tokenInflight = (async () => {
      try {
        const res = await realFetch(input, init);
        const data = await res.clone().json();
        if (data?.tenant_access_token) {
          tokenCache = {
            token: data.tenant_access_token,
            // refresh 5 min before the stated expiry (default 2h).
            expiry: Date.now() + ((Number(data.expire) || 7200) - 300) * 1000,
          };
          return data.tenant_access_token as string;
        }
        throw new Error("no tenant_access_token in response");
      } finally {
        tokenInflight = null;
      }
    })();
  }
  try {
    const token = await tokenInflight;
    return tokenResponse(token, tokenCache.expiry - Date.now());
  } catch {
    // Fall back to a real (uncached) fetch so the caller sees the real error.
    return realFetch(input, init);
  }
}) as typeof fetch;

import { COACH_ONLY_HANDLERS, coachKeyOk } from "../api/_coachAuth.ts";
import activateDigitalOrder from "../api/activateDigitalOrder.ts";
import analytics from "../api/analytics.ts";
import autoLoadProgram from "../api/autoLoadProgram.ts";
import assignContent from "../api/assignContent.ts";
import assignProgram from "../api/assignProgram.ts";
import athleteMetrics from "../api/athleteMetrics.ts";
import checkIns from "../api/checkIns.ts";
import clientLog from "../api/clientLog.ts";
import clients from "../api/clients.ts";
import coaches from "../api/coaches.ts";
import coachingSignup from "../api/coachingSignup.ts";
import contentResponses from "../api/contentResponses.ts";
import contentAssignments from "../api/contentAssignments.ts";
import createClient from "../api/createClient.ts";
import createProductOrder from "../api/createProductOrder.ts";
import createProgram from "../api/createProgram.ts";
import createWorkoutTemplate from "../api/createWorkoutTemplate.ts";
import deleteRecord from "../api/deleteRecord.ts";
import duplicateAssignedWorkout from "../api/duplicateAssignedWorkout.ts";
import duplicateProgram from "../api/duplicateProgram.ts";
import enquiries from "../api/enquiries.ts";
import inPersonEnquiry from "../api/inPersonEnquiry.ts";
import exerciseResults from "../api/exerciseResults.ts";
import exercises from "../api/exercises.ts";
import findMyPortal from "../api/findMyPortal.ts";
import formVideos from "../api/formVideos.ts";
import formTemplates from "../api/formTemplates.ts";
import notifications from "../api/notifications.ts";
import productOrders from "../api/productOrders.ts";
import programs from "../api/programs.ts";
import recordLogin from "../api/recordLogin.ts";
import programTemplates from "../api/programTemplates.ts";
import reviews from "../api/reviews.ts";
import reviewWorkoutComment from "../api/reviewWorkoutComment.ts";
import saveWorkoutLog from "../api/saveWorkoutLog.ts";
import setWorkoutReviewed from "../api/setWorkoutReviewed.ts";
import workloadLogs from "../api/workloadLogs.ts";
import saveWorkloadLog from "../api/saveWorkloadLog.ts";
import submitContentResponse from "../api/submitContentResponse.ts";
import subscriptions from "../api/subscriptions.ts";
import upsertSubscription from "../api/upsertSubscription.ts";
import teams from "../api/teams.ts";
import testTemplates from "../api/testTemplates.ts";
import updateAssignedProgramDate from "../api/updateAssignedProgramDate.ts";
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
import workouts from "../api/workouts.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = Number(process.env.PORT || 3001);

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
  const extMatch = String(req.query.name || "").match(/\.(mp4|mov|webm|m4v)$/i);
  const ext = extMatch ? extMatch[0].toLowerCase() : ".mp4";
  const prefix = req.query.kind === "exercise" ? "ex" : "fv";
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
app.use(
  "/uploads",
  express.static(uploadsDir, { maxAge: "365d", immutable: true })
);

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
  clients,
  coaches,
  coachingSignup,
  contentResponses,
  contentAssignments,
  createClient,
  createProductOrder,
  createProgram,
  createWorkoutTemplate,
  deleteRecord,
  duplicateAssignedWorkout,
  duplicateProgram,
  enquiries,
  inPersonEnquiry,
  exerciseResults,
  exercises,
  findMyPortal,
  formVideos,
  formTemplates,
  notifications,
  productOrders,
  programs,
  recordLogin,
  programTemplates,
  reviews,
  reviewWorkoutComment,
  saveWorkoutLog,
  setWorkoutReviewed,
  workloadLogs,
  saveWorkloadLog,
  submitContentResponse,
  subscriptions,
  upsertSubscription,
  teams,
  testTemplates,
  updateAssignedProgramDate,
  updateContentAssignmentDate,
  updateClient,
  updateProductOrder,
  updateProgram,
  upsertCoach,
  upsertExercise,
  upsertTeam,
  warmCache,
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
// Assets, robots.txt and sitemap.xml still come straight from the built dist.
app.use(express.static(distPath, { index: false }));
app.get(/.*/, (req, res) => {
  res
    .type("html")
    .set("Cache-Control", "no-cache, no-store, must-revalidate")
    .send(injectSeo(indexTemplate, req.originalUrl, publicSiteUrl));
});

app.listen(port, "127.0.0.1", () => {
  console.log(`NoLimit Training server listening on http://127.0.0.1:${port}`);

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
