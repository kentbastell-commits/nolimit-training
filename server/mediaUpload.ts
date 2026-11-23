import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import type { RequestHandler } from "express";
import { coachKeyOk } from "../api/_coachAuth.ts";

const MAX_UPLOAD_BYTES = 500 * 1024 * 1024;
// A coach voice note is seconds long; anything bigger is a mistake.
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

// Browsers record what they like (Chrome: webm/opus, Safari: mp4/aac). The
// mini program's audio player and iOS both want AAC in an mp4 container, so
// every voice note is converted to .m4a on arrival. If ffmpeg is missing or
// fails, the original is kept and served as-is (web players cope).
export function transcodeVoiceNote(src: string, fetcherExec: typeof execFile = execFile): Promise<string> {
  const out = src.replace(/\.[a-z0-9]+$/i, "") + ".m4a";
  if (out === src) return Promise.resolve(src);
  return new Promise((resolve) => {
    fetcherExec(
      "ffmpeg",
      ["-y", "-v", "error", "-i", src, "-vn", "-c:a", "aac", "-b:a", "64k", "-movflags", "+faststart", out],
      { timeout: 60_000 },
      (error) => {
        if (error) {
          fs.unlink(out, () => {});
          resolve(src);
          return;
        }
        fs.unlink(src, () => {});
        resolve(out);
      }
    );
  });
}

// Callers sharing this: athlete form-review clips (kind=form, prefix "fv-",
// may be pruned), permanent exercise-library demos (kind=exercise, "ex-"),
// coach photos (kind=coach, "coach-") and coach voice replies (kind=audio,
// "fa-"). The prefix keeps them apart on disk so cleanup never eats a
// permanent asset. Exercise, coach and audio kinds require the coach key.
export function createMediaUploadHandler(uploadsDir: string): RequestHandler {
  return (req, res) => {
    const kind = String(req.query.kind || "");
    const isAudioKind = kind === "audio";
    if ((kind === "exercise" || kind === "coach" || isAudioKind) && !coachKeyOk(req as never)) {
      req.resume();
      res.status(401).json({ error: "Coach access key required" });
      return;
    }
    const extMatch = String(req.query.name || "").match(
      isAudioKind ? /\.(webm|m4a|mp4|ogg|mp3|wav|aac)$/i : /\.(mp4|mov|webm|m4v|jpg|jpeg|png|webp)$/i
    );
    const isImageKind = kind === "coach";
    const ext = extMatch ? extMatch[0].toLowerCase() : isImageKind ? ".jpg" : isAudioKind ? ".webm" : ".mp4";
    const prefix = kind === "exercise" ? "ex" : isImageKind ? "coach" : isAudioKind ? "fa" : "fv";
    const maxBytes = isAudioKind ? MAX_AUDIO_BYTES : MAX_UPLOAD_BYTES;
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
      if (received > maxBytes) {
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
        if (!isAudioKind) {
          res.status(200).json({ success: true, url: `/uploads/${name}` });
          return;
        }
        void transcodeVoiceNote(dest).then((finalPath) => {
          res.status(200).json({ success: true, url: `/uploads/${path.basename(finalPath)}` });
        });
      })
    );
  };
}
