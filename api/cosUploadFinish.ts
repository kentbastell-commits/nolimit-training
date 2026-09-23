import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import {
  COS_REGION_HOST,
  COS_WEB_INBOX_PREFIX,
  MAX_UPLOAD_BYTES,
  UPLOAD_EXT,
  cosAuthorization,
  cosConfigured,
  uploadPrefixFor,
} from "../server/cos.ts";

// Coach-only (COACH_ONLY_HANDLERS): step 2 of the fast upload path. Pulls the
// object the browser dropped in COS onto this box's /uploads (same dir and
// name shape as the raw-body route in server/index.ts), verifies the byte
// count, deletes the COS copy, and answers exactly like uploadFormVideoFile:
//   POST /api/cosUploadFinish { key, kind, size }  -> { success, url }
// The pull uses the REGIONAL host (Tencent-internal from a Tencent box,
// free and fast); only the browser's leg uses the paid acceleration host.
const uploadsDir =
  process.env.UPLOADS_DIR ||
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../uploads");

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!cosConfigured()) {
    return res.status(503).json({ error: "Fast upload not configured" });
  }
  const key = String(req.body?.key || "").trim();
  const kind = String(req.body?.kind || "").trim();
  const expectedSize = Number(req.body?.size);
  const extMatch = key.match(UPLOAD_EXT);
  if (!key.startsWith(COS_WEB_INBOX_PREFIX) || key.includes("..") || !extMatch) {
    return res.status(400).json({ error: "Bad upload key" });
  }
  const pathname = `/${key}`;
  const objectUrl = `https://${COS_REGION_HOST}${pathname}`;
  const name = `${uploadPrefixFor(kind)}-${randomBytes(12).toString("hex")}${extMatch[0].toLowerCase()}`;
  fs.mkdirSync(uploadsDir, { recursive: true });
  const dest = path.join(uploadsDir, name);
  const part = `${dest}.part`;
  try {
    const get = await fetch(objectUrl, {
      headers: {
        Authorization: cosAuthorization({ method: "GET", pathname, headers: { host: COS_REGION_HOST } }),
      },
    });
    if (get.status === 404) {
      return res.status(404).json({ error: "Upload not found in COS, please try again" });
    }
    if (!get.ok || !get.body) {
      return res.status(502).json({ error: "Could not fetch the upload", message: `COS ${get.status}` });
    }
    const declared = Number(get.headers.get("content-length") || 0);
    if (declared > MAX_UPLOAD_BYTES) {
      return res.status(413).json({ error: "File too large" });
    }
    await pipeline(Readable.fromWeb(get.body as never), fs.createWriteStream(part));
    const written = fs.statSync(part).size;
    const sizeMismatch =
      !written ||
      (declared > 0 && written !== declared) ||
      (Number.isFinite(expectedSize) && expectedSize > 0 && written !== expectedSize);
    if (sizeMismatch) {
      fs.unlink(part, () => {});
      return res.status(502).json({ error: "Upload arrived incomplete, please try again" });
    }
    fs.renameSync(part, dest);
  } catch (error: any) {
    fs.unlink(part, () => {});
    return res.status(502).json({ error: "Could not fetch the upload", message: error?.message });
  }
  // Best-effort cleanup; the bucket lifecycle rule is the backstop.
  try {
    await fetch(objectUrl, {
      method: "DELETE",
      headers: {
        Authorization: cosAuthorization({ method: "DELETE", pathname, headers: { host: COS_REGION_HOST } }),
      },
    });
  } catch {
    /* lifecycle rule will expire it */
  }
  return res.status(200).json({ success: true, url: `/uploads/${name}` });
}
