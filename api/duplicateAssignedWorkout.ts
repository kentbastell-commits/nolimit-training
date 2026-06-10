import type { VercelRequest, VercelResponse } from "@vercel/node";

function makeAssignedWorkoutId() {
  const random = Math.floor(100000 + Math.random() * 900000);
  return `AW-${random}`;
}

function toLarkDate(value?: string) {
  if (!value) return Date.now();
  if (/^\d+$/.test(value)) return Number(value);
  const [year, month, day] = value.split("-").map(Number);
  if (year && month && day) {
    return new Date(year, month - 1, day).getTime();
  }
  return new Date(value).getTime();
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { assignedWorkoutRecordId, scheduledDate } = req.body || {};
    const tableId = process.env.FEISHU_ASSIGNED_WORKOUTS_TABLE_ID;

    if (!assignedWorkoutRecordId || !scheduledDate) {
      return res.status(400).json({
        error: "Missing assignedWorkoutRecordId or scheduledDate",
      });
    }

    if (!tableId) {
      return res.status(500).json({
        error: "Missing FEISHU_ASSIGNED_WORKOUTS_TABLE_ID",
      });
    }

    const token = await getTenantToken();
    const readResponse = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${tableId}/records/${assignedWorkoutRecordId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    const readData = await readResponse.json();

    if (!readResponse.ok || readData.code !== 0) {
      return res.status(500).json({
        error: "Could not read assigned workout",
        larkResponse: readData,
      });
    }

    const sourceFields = readData.data.record.fields || {};
    const fields = {
      ...sourceFields,
      "Assigned Workout ID": makeAssignedWorkoutId(),
      "Scheduled Date": toLarkDate(scheduledDate),
      "Completion Status": "Scheduled",
    };

    delete fields["Workout Logs"];
    delete fields["Workout Logs1"];
    delete fields.SourceID;

    const createResponse = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${tableId}/records`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fields }),
      }
    );
    const createData = await createResponse.json();

    if (!createResponse.ok || createData.code !== 0) {
      return res.status(500).json({
        error: "Could not duplicate assigned workout",
        larkResponse: createData,
        fieldsSent: fields,
      });
    }

    return res.status(200).json({
      success: true,
      recordId: createData.data.record.record_id,
      larkResponse: createData,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
}
