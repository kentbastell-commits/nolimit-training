import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { RequestHandler } from "express";
import { coachKeyOk } from "../api/_coachAuth.ts";

const MAX_UPLOAD_BYTES = 500 * 1024 * 1024;

// The direct fallback shares an endpoint with public athlete form clips.
// Exercise demos and coach photos still require the coach access key.
export function createMediaUploadHandler(uploadsDir: string): RequestHandler {
  return (req, res) => {
    if ((req.query.kind === "exercise" || req.query.kind === "coach") && !coachKeyOk(req as never)) {
      req.resume();
      res.status(401).json({ error: "Coach access key required" });
      return;
    }
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
  };
}
