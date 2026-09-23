import type { VercelRequest, VercelResponse } from "@vercel/node";
import { coachKeyOk } from "./_coachAuth.ts";
import { invalidateCache } from "./_cache.ts";
import { db } from "../server/db/client.ts";
import { coachingReviewStates, coachingReviewHistory } from "../server/db/schema.ts";
import { eq, desc, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!coachKeyOk(req as never)) return res.status(401).json({ error: "Coach access key required" });
  try {
    if (req.method === "GET") {
      const states = await db.select().from(coachingReviewStates);
      return res.status(200).json({ states });
    }
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    const { key, revision, status, until, version, item, note = "" } = req.body || {};
    if (typeof key !== "string" || key.length > 250 || !/^(message|comment|checkin|video|submission|workout|coverage|missed|order|enquiry):.+/.test(key) ||
      typeof revision !== "string" || revision.length > 20000 || !["open", "resolved", "snoozed"].includes(status) ||
      !Number.isSafeInteger(version) || version < 0 || !item || item.key !== key || item.revision !== revision || item.kind !== key.split(":")[0] ||
      typeof item.clientId !== "string" || typeof item.title !== "string" || item.title.length > 4000 ||
      typeof note !== "string" || note.length > 2000 ||
      (status === "snoozed" && (!Number.isSafeInteger(until) || until <= Date.now() || until > Date.now() + 90 * 86400000))) {
      return res.status(400).json({ error: "Invalid review decision" });
    }
    const result = await db.transaction(async tx => {
      // Serialize first inserts as well as updates; version protects two coach tabs.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${key}, 0))`);
      const [current] = await tx.select().from(coachingReviewStates).where(eq(coachingReviewStates.key, key));
      if ((current?.version || 0) !== version) return null;
      const cleanItem = { key, revision, kind: item.kind, clientId: item.clientId, clientName: String(item.clientName || "").slice(0, 250),
        title: item.title, date: String(item.date || "").slice(0, 30), priority: Number(item.priority) || 0 };
      const state = { key, revision, status, until: status === "snoozed" ? until : null, version: version + 1, updatedAt: Date.now(), item: cleanItem, note };
      await tx.insert(coachingReviewStates).values(state).onConflictDoUpdate({ target: coachingReviewStates.key, set: state });
      await tx.insert(coachingReviewHistory).values({ ...state, eventId: randomUUID() });
      return state;
    });
    if (!result) return res.status(409).json({ error: "Review changed. Refresh and try again." });
    invalidateCache("coachingReview");
    return res.status(200).json({ success: true, state: result });
  } catch { return res.status(500).json({ error: "Could not save coaching review" }); }
}

// Kept separate so history can be read on demand instead of blocking the roster.
export async function history(req: VercelRequest, res: VercelResponse) {
  if (!coachKeyOk(req as never)) return res.status(401).json({ error: "Coach access key required" });
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  try {
    const events = await db.select().from(coachingReviewHistory).where(eq(coachingReviewHistory.key, String(req.query.key || ""))).orderBy(desc(coachingReviewHistory.version));
    return res.status(200).json({ events });
  } catch { return res.status(500).json({ error: "Could not load review history" }); }
}
