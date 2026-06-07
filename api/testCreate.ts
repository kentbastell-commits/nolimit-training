import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const tokenResponse = await fetch(
    "https://open.larksuite.com/open-apis/auth/v3/tenant_access_token/internal",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_id: process.env.LARK_APP_ID,
        app_secret: process.env.LARK_APP_SECRET,
      }),
    }
  );

  const tokenData = await tokenResponse.json();

  const result = await fetch(
    `https://open.larksuite.com/open-apis/bitable/v1/apps/${process.env.LARK_BASE_APP_TOKEN}/tables/${process.env.LARK_WORKOUT_LOGS_TABLE_ID}/records`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenData.tenant_access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: {
          "Log ID": "TEST123"
        }
      })
    }
  );

  const data = await result.json();

  res.status(200).json(data);
}