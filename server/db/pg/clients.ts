import { db } from "../client.ts";
import { clients } from "../schema.ts";
import { epochToDate, str } from "./_util.ts";
import type { ClientDTO } from "../dto.ts";

type Row = typeof clients.$inferSelect;

export async function listClients(): Promise<ClientDTO[]> {
  const rows = await db.select().from(clients);
  return rows.map((r: Row): ClientDTO => {
    const name = r.fullName || "Unnamed Client";
    return {
      id: r.clientId, // business code is the identity on Postgres
      clientCode: r.clientId,
      name,
      initials: name
        .split(" ")
        .map((word) => word[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
      activity: epochToDate(r.lastCheckinDate, "--"),
      training: "--",
      program: str(r.programId) || "--",
      status: r.packageType || "Active",
      clientType: str(r.clientType),
      primaryCoach: str(r.primaryCoachId),
      secondaryCoach: str(r.secondaryCoachId),
      package: str(r.package),
      subscriptionStatus: str(r.subscriptionStatus),
      intakeStatus: str(r.intakeStatus),
      paymentStatus: str(r.paymentStatus),
      purchasedProgramId: str(r.purchasedProgramId),
      accessStartDate: epochToDate(r.accessStartDate, "--"),
      accessEndDate: epochToDate(r.accessEndDate, "--"),
      source: str(r.source),
      paymentId: str(r.stripePaymentId),
      email: str(r.email),
      phone: str(r.phone),
      coach: str(r.primaryCoachId) || str(r.coachAssigned),
      notes: str(r.notes),
      notesEn: str(r.notesEn),
      startDate: epochToDate(r.startDate, "--"),
      languagePreference: r.languagePreference || "English",
      masKmhOverride: str(r.mas),
      hrMaxOverride: str(r.hrMax),
      restingHrOverride: str(r.restingHr),
      zone5kPct: str(r.zone5kPct),
      zone10kPct: str(r.zone10kPct),
      zoneThresholdPct: str(r.zoneThresholdPct),
      zoneEasyPct: str(r.zoneEasyPct),
      tags: r.tags ?? [],
      categories: r.categories ?? [],
      lastLogin: r.lastLogin ?? 0,
    };
  });
}
