import {
  appToken,
  fieldText,
  formatDate,
  getTenantToken,
  listRecords,
} from "./client.ts";
import type { OrderDTO } from "../dto.ts";
import type {
  CreateProductOrderInput,
  UpdateProductOrderInput,
  ProductOrderWriteResult,
} from "../repositories/productOrders.ts";

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
      referrerCode: fieldText(f["Referrer Code"]),
      referralRewardsUsed: Number(f["Referral Rewards Used"]) || 0,
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

/* --------------------------------- writes --------------------------------- */
// Logic moved verbatim from api/createProductOrder.ts / api/updateProductOrder.ts.
// The Product Orders table has drifted before (phantom-column bug silently lost
// order fields for weeks), so writes resolve column names against the LIVE
// field list, report what they had to omit, and check every response for
// code !== 0 (Feishu returns HTTP 200 with a non-zero code on failure).

type TableField = {
  field_name?: string;
  name?: string;
  type?: number;
  ui_type?: string;
};

function orderTableId() {
  // Read env at call time (module-load capture breaks late-loaded .env + tests).
  return process.env.FEISHU_PRODUCT_ORDERS_TABLE_ID || "tbllinXYFDiUboKX";
}

function makeOrderId() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${stamp}-${random}`;
}

function normalizeFieldName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isLinkField(field?: TableField) {
  const uiType = String(field?.ui_type || "").toLowerCase();

  return (
    field?.type === 21 ||
    uiType.includes("duplex") ||
    uiType.includes("link") ||
    uiType.includes("relation")
  );
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

async function getTableFields(token: string) {
  const response = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken()}/tables/${orderTableId()}/fields?page_size=100`,
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

// createProductOrder variant: skips empty strings too (never send "" to a
// typed Feishu column — it fails the whole record write).
function applyCreateField(
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

// updateProductOrder variant: allows "" (clearing) and swaps in the
// [record_id] array when the resolved column is a DuplexLink.
function applyUpdateField(
  tableFields: TableField[],
  fields: Record<string, any>,
  omittedFields: string[],
  aliases: string[],
  value: any,
  linkValue?: any
) {
  if (value === undefined || value === null) return;

  const field = resolveField(tableFields, aliases);
  const fieldName = field?.field_name || field?.name;

  if (!fieldName) {
    omittedFields.push(aliases[0]);
    return;
  }

  fields[fieldName] = isLinkField(field) && linkValue ? linkValue : value;
}

export async function createProductOrder(
  input: CreateProductOrderInput
): Promise<ProductOrderWriteResult> {
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
  } = input;

  const token = await getTenantToken();
  const tableFields = await getTableFields(token);
  const fields: Record<string, any> = {};
  const omittedFields: string[] = [];
  const nextOrderId = orderId || makeOrderId();

  applyCreateField(tableFields, fields, omittedFields, ["Order ID", "Order Id"], nextOrderId);
  applyCreateField(
    tableFields,
    fields,
    omittedFields,
    ["Client Name", "Athlete Name", "Member Name"],
    clientName
  );
  applyCreateField(tableFields, fields, omittedFields, ["Email"], email);
  applyCreateField(
    tableFields,
    fields,
    omittedFields,
    ["Phone/WeChat", "Phone", "WeChat", "Wechat"],
    phone
  );
  applyCreateField(
    tableFields,
    fields,
    omittedFields,
    ["Product Type", "Order Type", "Type"],
    productType || "Digital Program"
  );
  applyCreateField(
    tableFields,
    fields,
    omittedFields,
    ["Product Name", "Program Name", "Purchased Program"],
    productName
  );
  applyCreateField(
    tableFields,
    fields,
    omittedFields,
    ["Program ID", "Program Id", "Purchased Program ID", "Purchased Program Id"],
    programId
  );
  applyCreateField(tableFields, fields, omittedFields, ["Amount", "Price"], amount);
  applyCreateField(tableFields, fields, omittedFields, ["Currency"], currency || "CNY");
  applyCreateField(
    tableFields,
    fields,
    omittedFields,
    ["Payment Status", "Payment"],
    paymentStatus || "Paid"
  );
  applyCreateField(
    tableFields,
    fields,
    omittedFields,
    ["Payment Provider", "Payment Method", "Provider"],
    paymentProvider || "WeChat QR"
  );
  applyCreateField(
    tableFields,
    fields,
    omittedFields,
    ["Payment Reference", "Payment Note", "Payment Notes", "Receipt ID"],
    paymentReference
  );
  applyCreateField(
    tableFields,
    fields,
    omittedFields,
    ["Assign Coach", "Assigned Coach", "Coach", "Coach Assigned"],
    assignedCoach
  );
  applyCreateField(
    tableFields,
    fields,
    omittedFields,
    ["Intake Status", "Intake", "Questionnaire Status"],
    intakeStatus || "Not Sent"
  );
  applyCreateField(
    tableFields,
    fields,
    omittedFields,
    ["Onboarding Status", "Pipeline Status", "Order Status", "Status"],
    onboardingStatus || "New Order"
  );
  applyCreateField(
    tableFields,
    fields,
    omittedFields,
    ["Fulfillment Status", "Fulfilment Status", "Fulfilled Status"],
    fulfillmentStatus || "Pending"
  );
  applyCreateField(
    tableFields,
    fields,
    omittedFields,
    ["Purchased At", "Purchase Date", "Order Date"],
    toLarkDate(purchasedAt) || Date.now()
  );
  applyCreateField(
    tableFields,
    fields,
    omittedFields,
    ["Access Start Date", "Start Date", "Program Start Date"],
    toLarkDate(accessStartDate)
  );
  applyCreateField(
    tableFields,
    fields,
    omittedFields,
    ["Access End Date", "End Date", "Program End Date"],
    toLarkDate(accessEndDate)
  );
  applyCreateField(
    tableFields,
    fields,
    omittedFields,
    ["Notes", "Internal Notes", "Order Notes"],
    notes
  );

  const createResponse = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken()}/tables/${orderTableId()}/records`,
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
    return {
      success: false,
      status: 500,
      body: {
        error: "Failed to create product order",
        larkResponse: createData,
        fieldsSent: fields,
        omittedFields,
      },
    };
  }

  return {
    success: true,
    status: 200,
    body: {
      success: true,
      orderId: nextOrderId,
      recordId: createData?.data?.record?.record_id,
      omittedFields,
      larkResponse: createData,
    },
  };
}

export async function updateProductOrder(
  input: UpdateProductOrderInput
): Promise<ProductOrderWriteResult> {
  const {
    recordId,
    clientRecordId,
    clientCode,
    clientName,
    programId,
    programName,
    intakeAssignmentId,
    intakeStatus,
    onboardingStatus,
    fulfillmentStatus,
    paymentStatus,
    accessStartDate,
    accessEndDate,
    fulfilledAt,
    notes,
    coach,
    coachRecordId,
  } = input;

  const token = await getTenantToken();
  const tableFields = await getTableFields(token);
  const fields: Record<string, any> = {};
  const omittedFields: string[] = [];

  applyUpdateField(
    tableFields,
    fields,
    omittedFields,
    ["Client ID", "Client", "Client Record ID", "Client Record Id"],
    clientCode || clientRecordId,
    clientRecordId ? [clientRecordId] : undefined
  );
  applyUpdateField(
    tableFields,
    fields,
    omittedFields,
    ["Client Name", "Athlete Name", "Member Name"],
    clientName
  );
  applyUpdateField(
    tableFields,
    fields,
    omittedFields,
    ["Program ID", "Program Id", "Purchased Program ID", "Purchased Program Id"],
    programId
  );
  applyUpdateField(
    tableFields,
    fields,
    omittedFields,
    ["Product Name", "Program Name", "Purchased Program"],
    programName
  );
  applyUpdateField(
    tableFields,
    fields,
    omittedFields,
    ["Intake Assignment ID", "Intake Assignment Id", "Assigned Intake ID"],
    intakeAssignmentId
  );
  applyUpdateField(
    tableFields,
    fields,
    omittedFields,
    ["Intake Status", "Intake", "Questionnaire Status"],
    intakeStatus
  );
  applyUpdateField(
    tableFields,
    fields,
    omittedFields,
    ["Onboarding Status", "Pipeline Status", "Order Status", "Status"],
    onboardingStatus
  );
  applyUpdateField(
    tableFields,
    fields,
    omittedFields,
    ["Fulfillment Status", "Fulfilment Status", "Fulfilled Status"],
    fulfillmentStatus
  );
  applyUpdateField(
    tableFields,
    fields,
    omittedFields,
    ["Payment Status", "Payment"],
    paymentStatus
  );
  // Coach assignment from the Orders page. "Assign Coach" is a DuplexLink
  // column, so pass the coach's record id as a [recordId] array (applyUpdateField
  // uses linkValue when the column is a link); the name is the text fallback.
  applyUpdateField(
    tableFields,
    fields,
    omittedFields,
    ["Assign Coach", "Assigned Coach", "Coach", "Coach Assigned"],
    coach,
    coachRecordId ? [String(coachRecordId)] : undefined
  );

  const startDate = toLarkDate(accessStartDate);
  const endDate = toLarkDate(accessEndDate);
  const fulfilledDate = toLarkDate(fulfilledAt);

  applyUpdateField(
    tableFields,
    fields,
    omittedFields,
    ["Access Start Date", "Start Date", "Program Start Date"],
    startDate
  );
  applyUpdateField(
    tableFields,
    fields,
    omittedFields,
    ["Access End Date", "End Date", "Program End Date"],
    endDate
  );
  applyUpdateField(
    tableFields,
    fields,
    omittedFields,
    ["Fulfilled At", "Fulfilled Date", "Program Loaded At", "Completed At"],
    fulfilledDate
  );
  applyUpdateField(
    tableFields,
    fields,
    omittedFields,
    ["Notes", "Internal Notes", "Order Notes"],
    notes
  );

  if (Object.keys(fields).length === 0) {
    return {
      success: false,
      status: 400,
      body: {
        error: "No matching product order columns found",
        omittedFields,
        availableFields: tableFields
          .map((field) => field.field_name || field.name)
          .filter(Boolean),
      },
    };
  }

  const response = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken()}/tables/${orderTableId()}/records/${recordId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields }),
    }
  );
  const data = await readResponseJson(response);

  if (!response.ok || data.code !== 0) {
    return {
      success: false,
      status: 500,
      body: {
        error: "Failed to update product order",
        larkResponse: data,
        fieldsSent: fields,
        omittedFields,
      },
    };
  }

  return {
    success: true,
    status: 200,
    body: {
      success: true,
      recordId,
      fieldsSent: fields,
      omittedFields,
      larkResponse: data,
    },
  };
}
