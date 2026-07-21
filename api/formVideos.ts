import type { VercelRequest, VercelResponse } from "@vercel/node";
import { coachKeyOk } from "./_coachAuth.ts";
import { notifyCoach } from "./_notify.ts";
import {
  listFormVideos,
  createFormVideo,
  reviewFormVideo,
} from "../server/db/repositories/formVideos.ts";

// Form-video review flow (premium tier: online / in-person clients).
// GET   -> list videos (coach review queue + athlete status)
// POST  -> athlete submits a video's metadata (file already uploaded)
// PUT   -> coach reply / mark reviewed (requires coach key when armed)
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === "GET") {
      const videos = await listFormVideos();
      const clientId = String(req.query.clientId || "").trim().toLowerCase();
      // Athlete clients request only their own queue. The unfiltered coach
      // review response remains unchanged for the authenticated coach app.
      const visible = clientId
        ? videos.filter((video) => video.clientId.trim().toLowerCase() === clientId)
        : videos;
      return res.status(200).json({ videos: visible });
    }

    if (req.method === "POST") {
      const { clientId, clientName, exerciseName, workoutName, videoUrl, note } =
        req.body || {};
      // A submission is a video, a written note, or both — clients reviewing a
      // past workout can send a note without re-filming anything.
      if (!clientId || (!videoUrl && !String(note || "").trim()))
        return res
          .status(400)
          .json({ error: "clientId and a videoUrl or note required" });

      // Feishu URL columns mangle relative paths ("http:///uploads/…") —
      // store an absolute URL built from the requesting host.
      let absoluteVideoUrl = "";
      if (videoUrl) {
        const host = String(
          req.headers["x-forwarded-host"] || req.headers.host || ""
        );
        absoluteVideoUrl = String(videoUrl).startsWith("/")
          ? `https://${host}${videoUrl}`
          : String(videoUrl);
      }

      const result = await createFormVideo({
        clientId,
        clientName,
        exerciseName,
        workoutName,
        absoluteVideoUrl,
        note,
      });
      if (!result.success) return res.status(500).json(result);

      void notifyCoach(
        videoUrl
          ? `📹 Form video from ${clientName || clientId}\n${exerciseName || "Exercise"} — review it in the coach app.`
          : `📝 Workout note from ${clientName || clientId}\n${exerciseName || "Exercise"}: ${String(note || "").slice(0, 120)}`
      );
      return res.status(200).json({ success: true, videoId: result.videoId });
    }

    if (req.method === "PUT") {
      if (!coachKeyOk(req as never))
        return res.status(401).json({ error: "Coach access key required" });
      const { recordId, coachReply, status } = req.body || {};
      if (!recordId) return res.status(400).json({ error: "recordId required" });

      const result = await reviewFormVideo({ recordId, coachReply, status });
      if (!result.success) return res.status(500).json(result);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error: any) {
    return res.status(500).json({ error: "Server error", message: error.message });
  }
}
