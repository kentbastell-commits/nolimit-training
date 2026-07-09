import type { VercelRequest, VercelResponse } from "@vercel/node";
import { invalidateCache } from "./_cache.ts";

const PRODUCT_ORDERS_TABLE_ID =
  process.env.FEISHU_PRODUCT_ORDERS_TABLE_ID || "tbllinXYFDiUboKX";

type TableField = {
  field_name?: string;
  name?: string;
  type?: number;
  ui_type?: string;
};

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
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
    } = req.body || {};

    if (!recordId) {
      return res.status(400).json({ error: "Missing product order recordId" });
    }

    const token = await getTenantToken();
    const tableFields = await getTableFields(token);
    const fields: Record<string, any> = {};
    const omittedFields: string[] = [];

    applyField(
      tableFields,
      fields,
      omittedFields,
      ["Client ID", "Client", "Client Record ID", "Client Record Id"],
      clientCode || clientRecordId,
      clientRecordId ? [clientRecordId] : undefined
    );
    applyField(
      tableFields,
      fields,
      omittedFields,
      ["Client Name", "Athlete Name", "Member Name"],
      clientName
    );
    applyField(
      tableFields,
      fields,
      omittedFields,
      ["Program ID", "Program Id", "Purchased Program ID", "Purchased Program Id"],
      programId
    );
    applyField(
      tableFields,
      fields,
      omittedFields,
      ["Product Name", "Program Name", "Purchased Program"],
      programName
    );
    applyField(
      tableFields,
      fields,
      omittedFields,
      ["Intake Assignment ID", "Intake Assignment Id", "Assigned Intake ID"],
      intakeAssignmentId
    );
    applyField(
      tableFields,
      fields,
      omittedFields,
      ["Intake Status", "Intake", "Questionnaire Status"],
      intakeStatus
    );
    applyField(
      tableFields,
      fields,
      omittedFields,
      ["Onboarding Status", "Pipeline Status", "Order Status", "Status"],
      onboardingStatus
    );
    applyField(
      tableFields,
      fields,
      omittedFields,
      ["Fulfillment Status", "Fulfilment Status", "Fulfilled Status"],
      fulfillmentStatus
    );
    applyField(
      tableFields,
      fields,
      omittedFields,
      ["Payment Status", "Payment"],
      paymentStatus
    );
    // Coach assignment from the Orders page. "Assign Coach" is a DuplexLink
    // column, so pass the coach's record id as a [recordId] array (applyField
    // uses linkValue when the column is a link); the name is the text fallback.
    applyField(
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

    applyField(
      tableFields,
      fields,
      omittedFields,
      ["Access Start Date", "Start Date", "Program Start Date"],
      startDate
    );
    applyField(
      tableFields,
      fields,
      omittedFields,
      ["Access End Date", "End Date", "Program End Date"],
      endDate
    );
    applyField(
      tableFields,
      fields,
      omittedFields,
      ["Fulfilled At", "Fulfilled Date", "Program Loaded At", "Completed At"],
      fulfilledDate
    );
    applyField(
      tableFields,
      fields,
      omittedFields,
      ["Notes", "Internal Notes", "Order Notes"],
      notes
    );

    if (Object.keys(fields).length === 0) {
      return res.status(400).json({
        error: "No matching product order columns found",
        omittedFields,
        availableFields: tableFields
          .map((field) => field.field_name || field.name)
          .filter(Boolean),
      });
    }

    const response = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${PRODUCT_ORDERS_TABLE_ID}/records/${recordId}`,
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
      return res.status(500).json({
        error: "Failed to update product order",
        larkResponse: data,
        fieldsSent: fields,
        omittedFields,
      });
    }

    invalidateCache("productOrders");
    return res.status(200).json({
      success: true,
      recordId,
      fieldsSent: fields,
      omittedFields,
      larkResponse: data,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
}
