import { db } from "../client.ts";
import { coaches } from "../schema.ts";
import { epochToDate, str } from "./_util.ts";
import type { CoachDTO } from "../dto.ts";

type Row = typeof coaches.$inferSelect;

export async function listCoaches(): Promise<CoachDTO[]> {
  const rows = await db.select().from(coaches);
  return rows.map(
    (r: Row): CoachDTO => ({
      recordId: r.coachId,
      coachId: r.coachId,
      name: r.name || "Unnamed Coach",
      email: str(r.email),
      phoneWechat: str(r.phone),
      role: r.role || "Coach",
      status: r.status || "Active",
      bio: str(r.bio),
      createdAt: epochToDate(r.createdAt),
    })
  );
}
