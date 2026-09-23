import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomBytes } from "node:crypto";
import {
  COS_ACCEL_HOST,
  COS_WEB_INBOX_PREFIX,
  MAX_UPLOAD_BYTES,
  UPLOAD_EXT,
  cosAuthorization,
  cosConfigured,
} from "../server/cos.ts";

// Coach-only (COACH_ONLY_HANDLERS): step 1 of the fast upload path for the
// exercise library. The browser asks for a short-lived signature, PUTs the
// file straight to COS's acceleration host (fast from Hong Kong / abroad),
// then calls cosUploadFinish so the server pulls it into /uploads.
//   POST /api/cosUploadTicket { name, size, contentType }
//   -> { key, url, method: "PUT", headers: { Authorization, Content-Type }, expiresIn }
//   503 when COS_SECRET_ID/KEY are unset: the client then falls back to the
//   direct /api/uploadFormVideoFile route, so a missing config only means
//   "old speed", never a broken upload.
// The signature covers host, content-type AND content-length, so a ticket
// for a 10 MB clip cannot be reused to push a 500 MB one.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!cosConfigured()) {
    return res.status(503).json({ error: "Fast upload not configured" });
  }
  const name = String(req.body?.name || "").trim();
  const size = Number(req.body?.size);
  const contentType = String(req.body?.contentType || "application/octet-stream").trim();
  const extMatch = name.match(UPLOAD_EXT);
  if (!extMatch) {
    return res.status(400).json({ error: "Unsupported file type" });
  }
  if (!Number.isFinite(size) || size <= 0 || size > MAX_UPLOAD_BYTES) {
    return res.status(400).json({ error: "File too large or empty" });
  }
  if (!/^[\w.+-]+\/[\w.+-]+$/.test(contentType)) {
    return res.status(400).json({ error: "Bad content type" });
  }
  const key = `${COS_WEB_INBOX_PREFIX}${Date.now()}-${randomBytes(8).toString("hex")}${extMatch[0].toLowerCase()}`;
  const pathname = `/${key}`;
  const ttlSeconds = 30 * 60; // a slow-but-moving 500 MB upload still fits
  const authorization = cosAuthorization({
    method: "PUT",
    pathname,
    headers: { host: COS_ACCEL_HOST, "content-type": contentType, "content-length": String(size) },
    ttlSeconds,
  });
  return res.status(200).json({
    success: true,
    key,
    url: `https://${COS_ACCEL_HOST}${pathname}`,
    method: "PUT",
    headers: { Authorization: authorization, "Content-Type": contentType },
    expiresIn: ttlSeconds,
  });
}
