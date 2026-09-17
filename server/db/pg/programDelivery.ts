import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { db } from "../client.ts";
import { queueTranslations } from "../contentTranslations.ts";
import { clients, productOrders, programs, workoutTemplates, assignedWorkouts, assignedTests } from "../schema.ts";
import { dayStartMs, epochToDate, str } from "./_util.ts";
import type { AutoLoadProgramInput, AutoLoadProgramResult } from "../repositories/fulfillment.ts";

/** Date arithmetic must not depend on the server's process timezone. */
export function addCalendarDays(date: string, days: number): string {
  return epochToDate(dayStartMs(date) + days * 86_400_000);
}

function bundleIds(raw: string | null): string[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return [...new Set(parsed.map(String).filter(Boolean))];
  } catch { /* legacy comma-separated catalog field */ }
  return [...new Set(raw.split(",").map((id) => id.trim()).filter(Boolean))];
}

export async function autoLoadProgram(input: AutoLoadProgramInput): Promise<AutoLoadProgramResult> {
  const today = input.startDate || epochToDate(Date.now());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today) || epochToDate(dayStartMs(today)) !== today) {
    return { status: 400, body: { error: "Choose a valid program start date." } };
  }
  try {
    const assignedIds: string[] = [];
    const result = await db.transaction(async (tx): Promise<AutoLoadProgramResult> => {
      // Serialize delivery for this athlete across every worker. The calendar,
      // order statuses and access dates commit together, including test days.
      const [client] = await tx.select().from(clients)
        .where(eq(clients.clientId, String(input.clientRecordId))).for("update");
      if (!client) return { status: 404, body: { error: "Client not found" } };
      const orders = await tx.select().from(productOrders)
        .where(eq(productOrders.clientId, client.clientId)).for("update");
      const unloaded = orders.filter((o) => o.programId && !str(o.fulfillmentStatus).toLowerCase().includes("loaded"));
      if (!unloaded.length) {
        return { status: 200, body: { success: true, alreadyLoaded: true, message: "No pending program orders found" } };
      }
      const pending = unloaded.filter((o) => /^paid$/i.test(str(o.paymentStatus).trim()));
      if (!pending.length) {
        return { status: 402, body: { success: false, paymentPending: true,
          error: "Payment verification required", message: "Your payment is awaiting confirmation.",
          paymentReferences: [...new Set(unloaded.map((o) => str(o.paymentReference)).filter(Boolean))] } };
      }
      const ids = [...new Set(pending.map((o) => o.programId!))];
      const catalog = await tx.select().from(programs).where(inArray(programs.programId, ids));
      // Bundle phases use their catalog order and run sequentially. A bought
      // add-on remains parallel. Require every phase to have a paid order so
      // an incomplete checkout cannot silently deliver only part of a bundle.
      const phaseStarts = new Map<string, string>();
      const bundles = new Set<string>();
      for (const program of catalog) {
        const members = bundleIds(program.bundleProgramIds);
        if (!members.length) continue;
        bundles.add(program.programId);
        let offsetWeeks = 0;
        for (const id of members) {
          const member = catalog.find((p) => p.programId === id);
          if (!member || bundleIds(member.bundleProgramIds).length) {
            throw new Error(`${program.name}: missing paid phase or nested bundle ${id}`);
          }
          phaseStarts.set(id, addCalendarDays(today, offsetWeeks * 7));
          offsetWeeks += Math.max(1, member.durationWeeks || 1);
        }
      }
      const templates = await tx.select().from(workoutTemplates).where(inArray(workoutTemplates.programId, ids));
      const loaded = new Set<string>();
      const names: string[] = [];
      let workoutsCreated = 0;
      let testsCreated = 0;
      let accessDays = 0;

      for (const order of pending) {
        const program = catalog.find((p) => p.programId === order.programId);
        if (!program) throw new Error(`${order.productName || order.programId}: program not found`);
        const programStart = phaseStarts.get(program.programId) || today;
        if (!loaded.has(program.programId) && !bundles.has(program.programId)) {
          const rows = templates.filter((t) => t.programId === program.programId);
          if (!rows.length) throw new Error(`${program.name}: no workout sessions found`);
          const sessions = new Map<string, typeof rows[number]>();
          for (const row of rows) {
            const key = JSON.stringify([row.week || 1, row.day || 1, row.sessionName, row.testTemplateId]);
            if (!sessions.has(key)) sessions.set(key, row);
          }
          const daysByWeek = new Map<number, number[]>();
          for (const row of sessions.values()) {
            const week = row.week || 1;
            daysByWeek.set(week, [...new Set([...(daysByWeek.get(week) || []), row.day || 1])].sort((a, b) => a - b));
          }
          const workoutRows: typeof assignedWorkouts.$inferInsert[] = [];
          const testRows: typeof assignedTests.$inferInsert[] = [];
          for (const row of sessions.values()) {
            const week = row.week || 1;
            const day = row.day || 1;
            const days = daysByWeek.get(week)!;
            if (days.length > 7) throw new Error(`${program.name}: more than seven training days in one week`);
            // Spread each week's training days within that week (3 => 0,2,4;
            // 5 => 0,1,2,4,5). Multiple sessions on one day stay together.
            const offset = (week - 1) * 7 + Math.floor(days.indexOf(day) * 7 / days.length);
            const scheduledDate = dayStartMs(addCalendarDays(programStart, offset));
            if (row.testTemplateId) {
              testRows.push({ assignedTestId: `AT-${randomUUID()}`, testTemplateId: row.testTemplateId,
                clientId: client.clientId, clientCode: client.clientId, assignedDate: scheduledDate });
            } else {
              workoutRows.push({ assignedWorkoutId: `AW-${randomUUID()}`, clientId: client.clientId,
                programId: program.programId, week, day, sessionName: row.sessionName || "Session",
                sessionNameCn: row.sessionNameCn || null, sessionType: row.sessionType || "Strength",
                sessionGoal: row.sessionGoal, sessionGoalCn: row.sessionGoalCn,
                coachNotes: row.sessionNotes, coachNotesCn: row.sessionNotesCn, estimatedDuration: row.estimatedDuration,
                intensity: row.intensity || "Moderate", scheduledDate, completionStatus: "Scheduled" });
            }
          }
          if (workoutRows.length) {
            await tx.insert(assignedWorkouts).values(workoutRows);
            assignedIds.push(...workoutRows.map((r) => r.assignedWorkoutId));
          }
          if (testRows.length) await tx.insert(assignedTests).values(testRows);
          workoutsCreated += workoutRows.length;
          testsCreated += testRows.length;
          accessDays = Math.max(accessDays, Math.round((dayStartMs(programStart) - dayStartMs(today)) / 86_400_000) + (program.accessLengthDays || (program.durationWeeks || 1) * 7));
          loaded.add(program.programId);
          names.push(program.name || program.programId);
        }
        await tx.update(productOrders).set({ fulfillmentStatus: "Program Loaded", accessStartDate: dayStartMs(programStart) })
          .where(eq(productOrders.orderId, order.orderId));
      }
      const update: Partial<typeof clients.$inferInsert> = {
        intakeStatus: "Reviewed", accessStartDate: dayStartMs(today),
      };
      if (!client.programId) update.programId = [...loaded][0];
      if (accessDays > 0) {
        update.accessEndDate = Math.max(client.accessEndDate || 0, dayStartMs(addCalendarDays(today, accessDays - 1)));
      }
      await tx.update(clients).set(update).where(eq(clients.clientId, client.clientId));
      return { status: 200, body: { success: true, programName: names.join(" + "), programsLoaded: names,
        workoutsCreated, testsCreated, orderStatusUpdated: true, startDate: today },
        notice: `📦 Program loaded for ${client.fullName || client.clientId}\nPrograms: ${names.join(" + ")}\nWorkouts created: ${workoutsCreated}\nTests created: ${testsCreated}` };
    });
    queueTranslations("assignedWorkouts", assignedIds);
    return result;
  } catch (error) {
    const failure = error instanceof Error ? error.message : String(error);
    return { status: 500, body: { error: "Could not load program workouts", failures: [failure] },
      notice: `⚠️ Program load FAILED for ${input.clientRecordId}\n${failure}` };
  }
}
