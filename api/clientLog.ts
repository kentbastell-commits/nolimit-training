import type { VercelRequest, VercelResponse } from "@vercel/node";
import fs from "node:fs";
import path from "node:path";
import { notifyCoach } from "./_notify.ts";

// Client-side observability sink. The SPA posts crashes, failed API calls, and
// funnel events here; they land as JSONL on the server disk (pilot-scale — no
// external monitoring SaaS, which would be slow/blocked from mainland China).
// GET returns the most recent events for the coach console.
//
// This endpoint is public (the athlete portal and store must be able to report
// without a key), so it is deliberately dumb and hard to abuse: tiny accepted
// payload, global rate limit, no reads of user data.

const LOG_DIR = path.resolve(process.cwd(), "logs");
const LOG_FILE = path.join(LOG_DIR, "client-events.jsonl");

const KINDS = new Set(["crash", "api_fail", "funnel"]);

// Global token bucket: 120 events/min across all visitors. Beyond that we
// silently drop — losing telemetry under a flood is fine; filling the disk is
// not.
let windowStart = 0;
let windowCount = 0;
function rateOk(): boolean {
  const now = Date.now();
  if (now - windowStart > 60_000) {
    windowStart = now;
    windowCount = 0;
  }
  windowCount += 1;
  return windowCount <= 120;
}

// Crash pings to WeChat are throttled to one per 30 min so a render-loop crash
// doesn't spam Kent; the full stream is always in the file.
let lastCrashNotify = 0;

const clip = (value: unknown, max: number) =>
  String(value ?? "").slice(0, max);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === "GET") {
      // Coach console view: tail the file (last ~200 events). Small file reads
      // are fine at pilot scale; the file is rotated manually if ever needed.
      let events: unknown[] = [];
      try {
        const raw = fs.readFileSync(LOG_FILE, "utf8");
        events = raw
          .split("\n")
          .filter(Boolean)
          .slice(-200)
          .map((line) => {
            try {
              return JSON.parse(line);
            } catch {
              return null;
            }
          })
          .filter(Boolean)
          .reverse();
      } catch {
        // No file yet — nothing has been reported.
      }
      return res.status(200).json({ events });
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    if (!rateOk()) return res.status(204).end();

    const body = (req.body || {}) as Record<string, unknown>;
    const kind = String(body.kind || "");
    if (!KINDS.has(kind)) {
      return res.status(400).json({ error: "Invalid kind" });
    }

    const event = {
      ts: new Date().toISOString(),
      kind,
      event: clip(body.event, 80),
      message: clip(body.message, 500),
      stack: clip(body.stack, 2000),
      url: clip(body.url, 300),
      clientId: clip(body.clientId, 40),
      ua: clip(req.headers["user-agent"], 200),
    };

    fs.mkdirSync(LOG_DIR, { recursive: true });
    fs.appendFileSync(LOG_FILE, JSON.stringify(event) + "\n");

    if (kind === "crash" && Date.now() - lastCrashNotify > 30 * 60_000) {
      lastCrashNotify = Date.now();
      // Fire-and-forget; notifyCoach never throws.
      void notifyCoach(
        `⚠️ Client crash on ${event.url || "unknown page"}\n${event.message}` +
          `\n(further crash pings muted for 30 min — full log in logs/client-events.jsonl)`
      );
    }

    return res.status(204).end();
  } catch (error: any) {
    return res.status(500).json({ error: "Server error", message: error.message });
  }
}
