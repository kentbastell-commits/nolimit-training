import type { VercelRequest, VercelResponse } from "@vercel/node";

const PRODUCT_ORDERS_TABLE_ID =
  process.env.FEISHU_PRODUCT_ORDERS_TABLE_ID || "tbllinXYFDiUboKX";

type TableField = {
  field_name?: string;
  name?: string;
  type?: number;
  ui_type?: string;
};

function makeOrderId() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${stamp}-${random}`;
}

function normalizeFieldName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function toLarkDate(value?: string) {
  if (!value || value === "--") return undefined;
  if (/^\d+$/.test(value)) return Number(value);

  const [year, month, day] = value.split("-").map(Number);

  if (year && month && day) {
    return new Date(year, month - 1, day).getTime();
  }

  return new Date(value).getTime();
}

async function readResponseJson(response: Response) {
  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch {
    return {
      code: -1,
      error: "Non-JSON response",
      status: response.status,
      body: text,
    };
  }
}

async function getTenantToken() {
  const tokenResponse = await fetch(
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

  const tokenData = await readResponseJson(tokenResponse);

  if (!tokenData.tenant_access_token) {
    throw new Error(`Could not get tenant token: ${JSON.stringify(tokenData)}`);
  }

  return tokenData.tenant_access_token;
}

async function getTableFields(token: string) {
  const response = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${PRODUCT_ORDERS_TABLE_ID}/fields?page_size=100`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  const data = await readResponseJson(response);

  if (!response.ok || data.code !== 0) {
    throw new Error(`Could not load product order fields: ${JSON.stringify(data)}`);
  }

  return (data?.data?.items || []) as TableField[];
}

function resolveField(fields: TableField[], aliases: string[]) {
  const names = fields
    .map((field) => field.field_name || field.name)
    .filter(Boolean) as string[];
  const exact = aliases.find((alias) => names.includes(alias));

  if (exact) {
    return fields.find((field) => (field.field_name || field.name) === exact);
  }

  const normalizedAliases = aliases.map(normalizeFieldName);

  return fields.find((field) => {
    const name = field.field_name || field.name || "";
    return normalizedAliases.includes(normalizeFieldName(name));
  });
}

function applyField(
  tableFields: TableField[],
  fields: Record<string, any>,
  omittedFields: string[],
  aliases: string[],
  value: any
) {
  if (value === undefined || value === null || value === "") return;

  const field = resolveField(tableFields, aliases);
  const fieldName = field?.field_name || field?.name;

  if (!fieldName) {
    omittedFields.push(aliases[0]);
    return;
  }

  fields[fieldName] = value;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      orderId,
      clientName,
      email,
      phone,
      productType,
      productName,
      programId,
      amount,
      currency,
      paymentStatus,
      paymentProvider,
      assignedCoach,
      purchasedAt,
      accessStartDate,
      accessEndDate,
      intakeStatus,
      onboardingStatus,
      fulfillmentStatus,
      paymentReference,
      notes,
    } = req.body || {};

    if (!clientName) {
      return res.status(400).json({ error: "Missing client name" });
    }

    if (!productName && !programId) {
      return res.status(400).json({ error: "Missing product or program" });
    }

    const token = await getTenantToken();
    const tableFields = await getTableFields(token);
    const fields: Record<string, any> = {};
    const omittedFields: string[] = [];
    const nextOrderId = orderId || makeOrderId();

    applyField(tableFields, fields, omittedFields, ["Order ID", "Order Id"], nextOrderId);
    applyField(
      tableFields,
      fields,
      omittedFields,
      ["Client Name", "Athlete Name", "Member Name"],
      clientName
    );
    applyField(tableFields, fields, omittedFields, ["Email"], email);
    applyField(
      tableFields,
      fields,
      omittedFields,
      ["Phone/WeChat", "Phone", "WeChat", "Wechat"],
      phone
    );
    applyField(
      tableFields,
      fields,
      omittedFields,
      ["Product Type", "Order Type", "Type"],
      productType || "Digital Program"
    );
    applyField(
      tableFields,
      fields,
      omittedFields,
      ["Product Name", "Program Name", "Purchased Program"],
      productName
    );
    applyField(
      tableFields,
      fields,
      omittedFields,
      ["Program ID", "Program Id", "Purchased Program ID", "Purchased Program Id"],
      programId
    );
    applyField(tableFields, fields, omittedFields, ["Amount", "Price"], amount);
    applyField(tableFields, fields, omittedFields, ["Currency"], currency || "CNY");
    applyField(
      tableFields,
      fields,
      omittedFields,
      ["Payment Status", "Payment"],
      paymentStatus || "Paid"
    );
    applyField(
      tableFields,
      fields,
      omittedFields,
      ["Payment Provider", "Payment Method", "Provider"],
      paymentProvider || "WeChat QR"
    );
    applyField(
      tableFields,
      fields,
      omittedFields,
      ["Payment Reference", "Payment Note", "Payment Notes", "Receipt ID"],
      paymentReference
    );
    applyField(
      tableFields,
      fields,
      omittedFields,
      ["Assigned Coach", "Coach", "Coach Assigned"],
      assignedCoach
    );
    applyField(
      tableFields,
      fields,
      omittedFields,
      ["Intake Status", "Intake", "Questionnaire Status"],
      intakeStatus || "Not Sent"
    );
    applyField(
      tableFields,
      fields,
      omittedFields,
      ["Onboarding Status", "Pipeline Status", "Order Status", "Status"],
      onboardingStatus || "New Order"
    );
    applyField(
      tableFields,
      fields,
      omittedFields,
      ["Fulfillment Status", "Fulfilment Status", "Fulfilled Status"],
      fulfillmentStatus || "Pending"
    );
    applyField(
      tableFields,
      fields,
      omittedFields,
      ["Purchased At", "Purchase Date", "Order Date"],
      toLarkDate(purchasedAt) || Date.now()
    );
    applyField(
      tableFields,
      fields,
      omittedFields,
      ["Access Start Date", "Start Date", "Program Start Date"],
      toLarkDate(accessStartDate)
    );
    applyField(
      tableFields,
      fields,
      omittedFields,
      ["Access End Date", "End Date", "Program End Date"],
      toLarkDate(accessEndDate)
    );
    applyField(
      tableFields,
      fields,
      omittedFields,
      ["Notes", "Internal Notes", "Order Notes"],
      notes
    );

    const createResponse = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${PRODUCT_ORDERS_TABLE_ID}/records`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fields }),
      }
    );
    const createData = await readResponseJson(createResponse);

    if (!createResponse.ok || createData.code !== 0) {
      return res.status(500).json({
        error: "Failed to create product order",
        larkResponse: createData,
        fieldsSent: fields,
        omittedFields,
      });
    }

    return res.status(200).json({
      success: true,
      orderId: nextOrderId,
      recordId: createData?.data?.record?.record_id,
      omittedFields,
      larkResponse: createData,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
}
