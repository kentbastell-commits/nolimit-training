import type { VercelRequest, VercelResponse } from "@vercel/node";
import { reorderAssignedWorkouts } from "../server/db/repositories/workouts.ts";

// Coach drag-reorder of workouts sharing one calendar day: persists each
// workout's day_order so the portal and mini program show the coach's order.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { orders } = req.body || {};
    if (!Array.isArray(orders) || orders.length === 0) {
      return res.status(400).json({ error: "Missing orders" });
    }
    for (const o of orders) {
      if (!o || !o.assignedWorkoutId || !Number.isFinite(Number(o.dayOrder))) {
        return res.status(400).json({
          error: "Each order needs assignedWorkoutId and a numeric dayOrder",
        });
      }
    }

    const result = await reorderAssignedWorkouts(
      orders.map((o: any) => ({
        assignedWorkoutId: String(o.assignedWorkoutId),
        dayOrder: Number(o.dayOrder),
      }))
    );
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error: any) {
    return res.status(500).json({ error: "Server error", message: error.message });
  }
}
