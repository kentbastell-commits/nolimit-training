import { db } from "../client.ts";
import { productOrders } from "../schema.ts";
import { epochToDate, str } from "./_util.ts";
import type { OrderDTO } from "../dto.ts";

type Row = typeof productOrders.$inferSelect;

export async function listProductOrders(): Promise<OrderDTO[]> {
  const rows = await db.select().from(productOrders);
  return rows.map(
    (r: Row): OrderDTO => ({
      recordId: r.orderId,
      orderId: r.orderId,
      clientId: str(r.clientId),
      clientName: str(r.clientName),
      email: "",
      phone: "",
      productType: str(r.productType),
      programId: str(r.programId),
      productName: str(r.productName),
      amount: r.amount == null ? "" : String(Number(r.amount)),
      currency: str(r.currency),
      paymentStatus: str(r.paymentStatus),
      paymentProvider: str(r.paymentProvider),
      purchasedAt: epochToDate(r.purchasedAt),
      accessStartDate: epochToDate(r.accessStartDate),
      accessEndDate: "",
      intakeStatus: str(r.intakeStatus),
      assignedCoach: str(r.assignCoach),
      intakeAssignmentId: "",
      onboardingStatus: "",
      fulfillmentStatus: "",
      fulfilledAt: "",
    })
  );
}
