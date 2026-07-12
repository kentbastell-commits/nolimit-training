import type { VercelRequest, VercelResponse } from "@vercel/node";
import { coachKeyOk } from "./_coachAuth.ts";
import { invalidateCache, getCached, setCached } from "./_cache.ts";
import { notifyCoach } from "./_notify.ts";

// Form-video review flow (premium tier: online / in-person clients).
// GET   -> list videos (coach review queue + athlete status)
// POST  -> athlete submits a video's metadata (file already uploaded)
// PUT   -> coach reply / mark reviewed (requires coach key when armed)
const TABLE_ID = "tbleqym6RxbSw4i2"; // "Form Videos" (created 2026-07-04)

function fieldToText(value: any): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    const item = value[0];
    if (!item) return "";
    if (typeof item === "string") return item;
    // URL fields: the link is the value; text is just the display label.
    if (item?.link) return item.link;
    if (item?.text) return item.text;
    return "";
  }
  if (value?.link) return value.link;
  if (value?.text) return value.text;
  return "";
}

async function getToken() {
  const res = await fetch(
    "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_id: process.env.FEISHU_APP_ID,
        app_secret: process.env.FEISHU_APP_SECRET,
      }),
    }
  );
  const data = await res.json();
  if (!data.tenant_access_token) throw new Error("Could not get Feishu token");
  return data.tenant_access_token as string;
}

const base = () =>
  `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${TABLE_ID}`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const token = await getToken();
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    if (req.method === "GET") {
      const cached = getCached("formVideos");
      if (cached) return res.status(200).json(cached);
      const r = await fetch(`${base()}/records?page_size=500`, { headers });
      const d = await r.json();
      const videos = ((d?.data?.items || []) as any[])
        .map((item) => ({
          recordId: item.record_id,
          videoId: fieldToText(item.fields?.["Video ID"]),
          clientId: fieldToText(item.fields?.["Client ID"]),
          clientName: fieldToText(item.fields?.["Client Name"]),
          exerciseName: fieldToText(item.fields?.["Exercise Name"]),
          workoutName: fieldToText(item.fields?.["Workout Name"]),
          videoUrl: fieldToText(item.fields?.["Video URL"]),
          clientNote: fieldToText(item.fields?.["Client Note"]),
          submittedAt: Number(item.fields?.["Submitted At"]) || 0,
          status: fieldToText(item.fields?.["Status"]) || "New",
          coachReply: fieldToText(item.fields?.["Coach Reply"]),
        }))
        .sort((a, b) => b.submittedAt - a.submittedAt);
      const payload = { videos };
      setCached("formVideos", payload);
      return res.status(200).json(payload);
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
      const videoId = `FV-${Math.floor(100000 + Math.random() * 900000)}`;
      const fields: Record<string, any> = {
        "Video ID": videoId,
        "Client ID": String(clientId),
        "Client Name": String(clientName || ""),
        "Exercise Name": String(exerciseName || ""),
        "Workout Name": String(workoutName || ""),
        "Client Note": String(note || ""),
        "Submitted At": Date.now(),
        Status: "New",
      };
      if (videoUrl) {
        // Feishu URL columns mangle relative paths ("http:///uploads/…") —
        // store an absolute URL built from the requesting host. Omit the
        // field entirely for note-only submissions (an empty value would fail
        // the whole record write).
        const host = String(
          req.headers["x-forwarded-host"] || req.headers.host || ""
        );
        const absoluteUrl = String(videoUrl).startsWith("/")
          ? `https://${host}${videoUrl}`
          : String(videoUrl);
        fields["Video URL"] = { link: absoluteUrl, text: "Form video" };
      }
      const r = await fetch(`${base()}/records`, {
        method: "POST",
        headers,
        body: JSON.stringify({ fields }),
      });
      const d = await r.json();
      if (d.code !== 0)
        return res.status(500).json({ error: "Could not save video", larkResponse: d });
      invalidateCache("formVideos");
      void notifyCoach(
        videoUrl
          ? `📹 Form video from ${clientName || clientId}\n${exerciseName || "Exercise"} — review it in the coach app.`
          : `📝 Workout note from ${clientName || clientId}\n${exerciseName || "Exercise"}: ${String(note || "").slice(0, 120)}`
      );
      return res.status(200).json({ success: true, videoId });
    }

    if (req.method === "PUT") {
      if (!coachKeyOk(req as never))
        return res.status(401).json({ error: "Coach access key required" });
      const { recordId, coachReply, status } = req.body || {};
      if (!recordId) return res.status(400).json({ error: "recordId required" });
      const fields: Record<string, any> = {
        Status: String(status || "Reviewed"),
        "Reviewed At": Date.now(),
      };
      if (coachReply !== undefined) fields["Coach Reply"] = String(coachReply);
      const r = await fetch(`${base()}/records/${recordId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ fields }),
      });
      const d = await r.json();
      if (d.code !== 0)
        return res.status(500).json({ error: "Could not update video", larkResponse: d });
      invalidateCache("formVideos");
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error: any) {
    return res.status(500).json({ error: "Server error", message: error.message });
  }
}
