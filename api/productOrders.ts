import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fetchAllBitableRecords } from "./_pagination.ts";
import { getCached, setCached } from "./_cache.ts";

const PRODUCT_ORDERS_TABLE_ID =
  process.env.FEISHU_PRODUCT_ORDERS_TABLE_ID || "tbllinXYFDiUboKX";

function fieldToText(value: any): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        if (item?.text) return item.text;
        if (item?.name) return item.name;
        if (item?.record_ids) return item.record_ids.join(", ");
        if (item?.link_record_ids) return item.link_record_ids.join(", ");
        return "";
      })
      .filter(Boolean)
      .join(", ");
  }

  if (value?.text) return value.text;
  if (value?.name) return value.name;
  if (value?.record_ids) return value.record_ids.join(", ");
  if (value?.link_record_ids) return value.link_record_ids.join(", ");

  return "";
}

function formatDate(value: any): string {
  const text = fieldToText(value);

  if (!text) return "";
  if (/^\d+$/.test(text)) return new Date(Number(text)).toISOString().split("T")[0];

  return text.split("T")[0].split(" ")[0];
}

async function getTenantToken() {
  const response = await fetch(
    "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_id: process.env.FEISHU_APP_ID,
        app_secret: process.env.FEISHU_APP_SECRET,
      }),
    }
  );
  const data = await response.json();

  if (!data.tenant_access_token) {
    throw new Error(`Could not get tenant token: ${JSON.stringify(data)}`);
  }

  return data.tenant_access_token;
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const cachedOrders = getCached("productOrders");
    if (cachedOrders) return res.status(200).json({ orders: cachedOrders });

    const token = await getTenantToken();
    const orderItems = await fetchAllBitableRecords(
      process.env.FEISHU_BASE_APP_TOKEN as string,
      PRODUCT_ORDERS_TABLE_ID as string,
      token
    );

    const orders = orderItems.map((item: any) => {
      const fields = item.fields || {};

      return {
        recordId: item.record_id,
        orderId: fieldToText(fields["Order ID"]) || item.record_id,
        clientId: fieldToText(fields["Client ID"]),
        clientName: fieldToText(fields["Client Name"]),
        email: fieldToText(fields["Email"]),
        phone: fieldToText(fields["Phone/WeChat"]) || fieldToText(fields["Phone"]),
        productType: fieldToText(fields["Product Type"]),
        programId: fieldToText(fields["Program ID"]),
        productName: fieldToText(fields["Product Name"]),
        amount: fieldToText(fields["Amount"]),
        currency: fieldToText(fields["Currency"]),
        paymentStatus: fieldToText(fields["Payment Status"]),
        paymentProvider: fieldToText(fields["Payment Provider"]),
        purchasedAt: formatDate(fields["Purchased At"]),
        accessStartDate: formatDate(fields["Access Start Date"]),
        accessEndDate: formatDate(fields["Access End Date"]),
        intakeStatus: fieldToText(fields["Intake Status"]),
        assignedCoach:
          fieldToText(fields["Assign Coach"]) ||
          fieldToText(fields["Assigned Coach"]) ||
          fieldToText(fields["Coach"]) ||
          fieldToText(fields["Coach Assigned"]),
        intakeAssignmentId:
          fieldToText(fields["Intake Assignment ID"]) ||
          fieldToText(fields["Assigned Intake ID"]),
        onboardingStatus:
          fieldToText(fields["Onboarding Status"]) ||
          fieldToText(fields["Pipeline Status"]) ||
          fieldToText(fields["Order Status"]) ||
          fieldToText(fields["Status"]),
        fulfillmentStatus:
          fieldToText(fields["Fulfillment Status"]) ||
          fieldToText(fields["Fulfilment Status"]),
        fulfilledAt:
          formatDate(fields["Fulfilled At"]) ||
          formatDate(fields["Program Loaded At"]) ||
          formatDate(fields["Completed At"]),
      };
    });

    setCached("productOrders", orders, 10 * 60 * 1000);

    return res.status(200).json({ orders });
  } catch (error: any) {
    return res.status(500).json({
      error: "Could not fetch product orders",
      message: error.message,
    });
  }
}
