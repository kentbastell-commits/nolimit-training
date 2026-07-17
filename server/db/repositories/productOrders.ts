import { DATA_BACKEND } from "../backend.ts";
import * as feishu from "../feishu/productOrders.ts";
import type { OrderDTO } from "../dto.ts";
import { getCached, setCached, invalidateCache } from "../../../api/_cache.ts";

// Inputs mirror the old handlers' req.body destructuring exactly.
export type CreateProductOrderInput = {
  orderId?: string;
  clientName?: string;
  email?: string;
  phone?: string;
  productType?: string;
  productName?: string;
  programId?: string;
  amount?: number | string;
  currency?: string;
  paymentStatus?: string;
  paymentProvider?: string;
  assignedCoach?: string;
  purchasedAt?: string;
  accessStartDate?: string;
  accessEndDate?: string;
  intakeStatus?: string;
  onboardingStatus?: string;
  fulfillmentStatus?: string;
  paymentReference?: string;
  notes?: string;
};

export type UpdateProductOrderInput = {
  recordId: string; // Feishu record_id; on Postgres the ORD-… business code
  clientRecordId?: string;
  clientCode?: string;
  clientName?: string;
  programId?: string;
  programName?: string;
  intakeAssignmentId?: string;
  intakeStatus?: string;
  onboardingStatus?: string;
  fulfillmentStatus?: string;
  paymentStatus?: string;
  accessStartDate?: string;
  accessEndDate?: string;
  fulfilledAt?: string;
  notes?: string;
  coach?: string;
  coachRecordId?: string;
};

// The old handlers had rich, distinct response bodies per outcome (400 for
// no-matching-columns, 500 with larkResponse/fieldsSent, 200 with
// omittedFields). To keep those byte-identical, the impls return the exact
// HTTP status + JSON body and the thin handler just forwards them.
export type ProductOrderWriteResult = {
  success: boolean;
  status: number;
  body: Record<string, unknown>;
};

export async function listProductOrders(): Promise<OrderDTO[]> {
  const cached = getCached<OrderDTO[]>("productOrders");
  if (cached) return cached;

  const orders =
    DATA_BACKEND === "postgres"
      ? await (await import("../pg/productOrders.ts")).listProductOrders()
      : await feishu.listProductOrders();

  setCached("productOrders", orders, 10 * 60 * 1000);
  return orders;
}

export async function createProductOrder(
  input: CreateProductOrderInput
): Promise<ProductOrderWriteResult> {
  const result =
    DATA_BACKEND === "postgres"
      ? await (await import("../pg/productOrders.ts")).createProductOrder(input)
      : await feishu.createProductOrder(input);
  if (result.success) invalidateCache("productOrders");
  return result;
}

export async function updateProductOrder(
  input: UpdateProductOrderInput
): Promise<ProductOrderWriteResult> {
  const result =
    DATA_BACKEND === "postgres"
      ? await (await import("../pg/productOrders.ts")).updateProductOrder(input)
      : await feishu.updateProductOrder(input);
  if (result.success) invalidateCache("productOrders");
  return result;
}
