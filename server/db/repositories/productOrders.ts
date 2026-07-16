import { DATA_BACKEND } from "../backend.ts";
import * as feishu from "../feishu/productOrders.ts";
import type { OrderDTO } from "../dto.ts";
import { getCached, setCached } from "../../../api/_cache.ts";

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
