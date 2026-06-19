import { DATA_BACKEND } from "../backend.ts";
import * as feishu from "../feishu/productOrders.ts";
import type { OrderDTO } from "../dto.ts";

export async function listProductOrders(): Promise<OrderDTO[]> {
  if (DATA_BACKEND === "postgres") {
    const pg = await import("../pg/productOrders.ts");
    return pg.listProductOrders();
  }
  return feishu.listProductOrders();
}
