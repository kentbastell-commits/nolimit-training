import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createHash } from "node:crypto";
import { isVerifiedCoach } from "./_coachAuth.ts";
import { db } from "../server/db/client.ts";
import { coachDrafts } from "../server/db/schema.ts";
import { and, eq, sql } from "drizzle-orm";

// Unpublished builder snapshots; never writes programs or athlete assignments.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");
  if (!isVerifiedCoach(req as never)) return res.status(401).json({ error: "Coach access required" });
  const owner = createHash("sha256").update(String(req.headers["x-coach-key"])).digest("hex");
  try {
    if (req.method === "GET") {
      const drafts = await db.select().from(coachDrafts).where(eq(coachDrafts.owner, owner));
      return res.status(200).json({ drafts: drafts.map(({ owner: _owner, ...draft }) => draft) });
    }
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    const { id, revision, expectedRevision, deleted = false, title, snapshot } = req.body || {};
    const uuid = (v: unknown) => typeof v === "string" && /^[a-f\d-]{36}$/i.test(v);
    if (!uuid(id) || !uuid(revision) || !(expectedRevision === null || uuid(expectedRevision)) || typeof deleted !== "boolean") return res.status(400).json({ error: "Invalid draft identity" });
    if (!deleted && (typeof title !== "string" || title.length > 500 || !snapshot || typeof snapshot.programName !== "string" || !Array.isArray(snapshot.programSessions) || !Array.isArray(snapshot.selectedProgramExercises) || snapshot.programSessions.some((s: any) => !s || typeof s.localId !== "string" || !Array.isArray(s.exercises)) || JSON.stringify(snapshot).length > 1500000)) return res.status(400).json({ error: "Invalid draft" });
    const result = await db.transaction(async tx => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`draft:${owner}:${id}`}, 0))`);
      const where = and(eq(coachDrafts.owner, owner), eq(coachDrafts.id, id));
      const [current] = await tx.select().from(coachDrafts).where(where);
      // Retries are idempotent, including a lost response to a deletion.
      if (current?.revision === revision) return current;
      if ((current?.revision || null) !== expectedRevision || current?.deleted) return null;
      const row = { owner, id, revision, title: deleted ? "" : title, snapshot: deleted ? null : snapshot, deleted, updatedAt: Date.now() };
      await tx.insert(coachDrafts).values(row).onConflictDoUpdate({ target: [coachDrafts.owner, coachDrafts.id], set: row });
      return row;
    });
    if (!result) return res.status(409).json({ error: "Draft changed on another device" });
    const { owner: _owner, ...draft } = result;
    return res.status(200).json({ draft });
  } catch { return res.status(500).json({ error: "Draft sync unavailable" }); }
}
