import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    // Get tenant token
    const tokenResponse = await fetch(
      "https://open.larksuite.com/open-apis/auth/v3/tenant_access_token/internal",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          app_id: process.env.LARK_APP_ID,
          app_secret: process.env.LARK_APP_SECRET,
        }),
      }
    );

    const tokenData = await tokenResponse.json();

    if (!tokenData.tenant_access_token) {
      return res.status(500).json({
        error: "Could not get token",
        tokenData,
      });
    }

    // List tables in the base
    const tablesResponse = await fetch(
      `https://open.larksuite.com/open-apis/bitable/v1/apps/${process.env.LARK_BASE_APP_TOKEN}/tables`,
      {
        headers: {
          Authorization: `Bearer ${tokenData.tenant_access_token}`,
        },
      }
    );

    const tablesData = await tablesResponse.json();

    return res.status(200).json({
      tokenOk: true,
      appToken: process.env.LARK_BASE_APP_TOKEN,
      workoutLogsTable: process.env.LARK_WORKOUT_LOGS_TABLE_ID,
      tablesData,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: error.message,
    });
  }
}