import type { VercelRequest, VercelResponse } from "@vercel/node";
import { coachKeyOk } from "./_coachAuth.ts";
import { db } from "../server/db/client.ts";
import { programmingBlocks } from "../server/db/schema.ts";
import { eq, sql, desc } from "drizzle-orm";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!coachKeyOk(req as never)) return res.status(401).json({ error: "Coach access key required" });
  try {
    if (req.method === "GET") return res.status(200).json({ blocks: await db.select().from(programmingBlocks).orderBy(desc(programmingBlocks.updatedAt)) });
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    const { id, version, action = "save" } = req.body || {};
    if (typeof id !== "string" || !/^[a-f0-9-]{36}$/i.test(id) || !Number.isSafeInteger(version) || version < 0 || !["save", "favorite", "used", "delete"].includes(action)) return res.status(400).json({ error: "Invalid block" });
    const { name, nameCn = "", exercises } = req.body;
    if (action === "save" && (typeof name !== "string" || !name.trim() || name.length > 120 || typeof nameCn !== "string" || nameCn.length > 120 || !Array.isArray(exercises) || !exercises.length || exercises.length > 60 || JSON.stringify(exercises).length > 200000 || exercises.some((ex: any) => !ex || typeof ex.exerciseId !== "string" || !ex.exerciseId || typeof ex.exerciseName !== "string" || typeof ex.sectionName !== "string" || typeof ex.groupName !== "string" || !["Straight", "Superset", "Circuit"].includes(ex.groupType) || !Number.isFinite(Number(ex.sets)) || Number(ex.sets) < 1 || Number(ex.sets) > 100))) return res.status(400).json({ error: "Invalid block prescription" });
    const result = await db.transaction(async tx => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`block:${id}`}, 0))`);
      const [current] = await tx.select().from(programmingBlocks).where(eq(programmingBlocks.id, id));
      if ((current?.version || 0) !== version || (!current && action !== "save")) return null;
      if (action === "delete") { await tx.delete(programmingBlocks).where(eq(programmingBlocks.id, id)); return { deleted: true }; }
      const block = { id, name: action === "save" ? name.trim() : current!.name, nameCn: action === "save" ? nameCn.trim() : current!.nameCn,
        exercises: action === "save" ? exercises : current!.exercises, favorite: action === "favorite" ? !current!.favorite : (current?.favorite || false),
        lastUsedAt: action === "used" ? Date.now() : (current?.lastUsedAt || null), updatedAt: action === "save" ? Date.now() : current!.updatedAt, version: version + 1 };
      await tx.insert(programmingBlocks).values(block).onConflictDoUpdate({ target: programmingBlocks.id, set: block });
      return { block };
    });
    if (!result) return res.status(409).json({ error: "Block changed. Refresh the library and try again." });
    return res.status(200).json(result);
  } catch { return res.status(500).json({ error: "Could not save block" }); }
}
