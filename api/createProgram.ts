import type { VercelRequest, VercelResponse } from "@vercel/node";

function makeProgramId() {
  const random = Math.floor(1000 + Math.random() * 9000);
  return `PR-${random}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const {
      programName,
      goal,
      sport,
      level,
      durationWeeks,
      phase,
      sessionsPerWeek,
      coach,
      status,
    } = req.body;

    if (!programName) {
      return res.status(400).json({
        error: "Missing Program Name",
      });
    }

    const tokenResponse = await fetch(
      "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          app_id: process.env.FEISHU_APP_ID,
          app_secret: process.env.FEISHU_APP_SECRET,
        }),
      }
    );

    const tokenData = await tokenResponse.json();

    if (!tokenData.tenant_access_token) {
      return res.status(500).json({
        error: "Could not get Lark tenant access token",
        larkResponse: tokenData,
      });
    }

    const programId = makeProgramId();

    const fields = {
      "Program ID": programId,
      "Program Name": programName,
      Goal: goal || "",
      Sport: sport || "",
      Level: level || "",
      "Duration Weeks": Number(durationWeeks) || 1,
      Phase: phase || "",
      "Sessions / Week": Number(sessionsPerWeek) || 1,
      Coach: coach || "Kent Bastell",
      Status: status || "Active",
    };

    const createResponse = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${process.env.FEISHU_PROGRAMS_TABLE_ID}/records`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenData.tenant_access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fields,
        }),
      }
    );

    const createData = await createResponse.json();

    if (!createResponse.ok || createData.code !== 0) {
      return res.status(500).json({
        error: "Failed to create program record",
        larkResponse: createData,
        fieldsSent: fields,
      });
    }

    return res.status(200).json({
      success: true,
      programId,
      programRecordId: createData?.data?.record?.record_id,
      larkResponse: createData,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
}