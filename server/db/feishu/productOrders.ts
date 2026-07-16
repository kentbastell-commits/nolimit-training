import { fieldText, formatDate, listRecords } from "./client.ts";
import type { OrderDTO } from "../dto.ts";

export async function listProductOrders(): Promise<OrderDTO[]> {
  // Read env at call time (module-load capture breaks late-loaded .env + tests).
  const tableId =
    process.env.FEISHU_PRODUCT_ORDERS_TABLE_ID || "tbllinXYFDiUboKX";
  const items = await listRecords(tableId);
  return items.map((item: any) => {
    const f = item.fields || {};
    return {
      recordId: item.record_id,
      orderId: fieldText(f["Order ID"]) || item.record_id,
      clientId: fieldText(f["Client ID"]),
      clientName: fieldText(f["Client Name"]),
      email: fieldText(f["Email"]),
      phone: fieldText(f["Phone/WeChat"]) || fieldText(f["Phone"]),
      productType: fieldText(f["Product Type"]),
      programId: fieldText(f["Program ID"]),
      productName: fieldText(f["Product Name"]),
      amount: fieldText(f["Amount"]),
      currency: fieldText(f["Currency"]),
      paymentStatus: fieldText(f["Payment Status"]),
      paymentReference: fieldText(f["Payment Reference"]),
      paymentProvider: fieldText(f["Payment Provider"]),
      purchasedAt: formatDate(f["Purchased At"]),
      accessStartDate: formatDate(f["Access Start Date"]),
      accessEndDate: formatDate(f["Access End Date"]),
      intakeStatus: fieldText(f["Intake Status"]),
      assignedCoach:
        fieldText(f["Assign Coach"]) ||
        fieldText(f["Assigned Coach"]) ||
        fieldText(f["Coach"]) ||
        fieldText(f["Coach Assigned"]),
      intakeAssignmentId:
        fieldText(f["Intake Assignment ID"]) || fieldText(f["Assigned Intake ID"]),
      onboardingStatus:
        fieldText(f["Onboarding Status"]) ||
        fieldText(f["Pipeline Status"]) ||
        fieldText(f["Order Status"]) ||
        fieldText(f["Status"]),
      fulfillmentStatus:
        fieldText(f["Fulfillment Status"]) || fieldText(f["Fulfilment Status"]),
      fulfilledAt:
        formatDate(f["Fulfilled At"]) ||
        formatDate(f["Program Loaded At"]) ||
        formatDate(f["Completed At"]),
    };
  });
}
