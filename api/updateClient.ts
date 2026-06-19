import type { VercelRequest, VercelResponse } from "@vercel/node";

function toLarkDate(value: string) {
  if (!value || value === "--") return undefined;
  return new Date(`${value}T00:00:00`).getTime();
}

// For Number columns: a finite number sets the cell, "" / "--" clears it (null),
// undefined leaves it untouched.
function toLarkNumber(value: unknown) {
  if (value === undefined) return undefined;
  if (value === null || value === "" || value === "--") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

async function getClientsTableFieldNames(token: string) {
  try {
    const response = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${process.env.FEISHU_CLIENTS_TABLE_ID}/fields?page_size=200`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await response.json();
    if (!response.ok || data.code !== 0) return null;
    return new Set(
      (data?.data?.items || [])
        .map((field: any) => field.field_name || field.name)
        .filter(Boolean)
    );
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      clientRecordId,
      name,
      email,
      phone,
      coach,
      primaryCoachId,
      secondaryCoachId,
      clientType,
      packageType,
      packageName,
      program,
      subscriptionStatus,
      intakeStatus,
      paymentStatus,
      purchasedProgramId,
      accessStartDate,
      accessEndDate,
      source,
      paymentId,
      startDate,
      lastCheckInDate,
      notes,
      languagePreference,
      masKmhOverride,
      hrMaxOverride,
      restingHrOverride,
      zone5kPct,
      zone10kPct,
      zoneThresholdPct,
      zoneEasyPct,
      tags,
      categories,
    } = req.body;

    if (!clientRecordId) {
      return res.status(400).json({ error: "Missing clientRecordId" });
    }

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

    const tokenData = await tokenResponse.json();

    if (!tokenData.tenant_access_token) {
      return res.status(500).json({
        error: "Could not get Lark tenant access token",
        larkResponse: tokenData,
      });
    }

    const fields: Record<string, any> = {};

    if (name !== undefined) fields["Full Name"] = name;
    if (email !== undefined) fields.Email = email;
    if (phone !== undefined) fields["Phone/WeChat"] = phone;
    if (coach !== undefined) fields["Coach Assigned"] = coach;
    if (primaryCoachId !== undefined) fields["Primary Coach"] = primaryCoachId ? [primaryCoachId] : [];
    if (secondaryCoachId !== undefined) fields["Secondary Coach"] = secondaryCoachId ? [secondaryCoachId] : [];
    if (clientType !== undefined) fields["Client Type"] = clientType;
    if (packageType !== undefined) fields["Package Type"] = packageType;
    if (packageName !== undefined) fields.Package = packageName;
    if (program !== undefined) fields.Program = program;
    if (subscriptionStatus !== undefined) fields["Subscription Status"] = subscriptionStatus;
    if (intakeStatus !== undefined) fields["Intake Status"] = intakeStatus;
    if (paymentStatus !== undefined) fields["Payment Status"] = paymentStatus;
    if (purchasedProgramId !== undefined) fields["Purchased Program ID"] = purchasedProgramId;
    if (source !== undefined) fields.Source = source;
    if (paymentId !== undefined) fields["Stripe/Payment ID"] = paymentId;
    if (notes !== undefined) fields.Notes = notes;
    if (languagePreference !== undefined) {
      fields["Language Preference"] = languagePreference;
    }

    const larkStartDate = toLarkDate(startDate || "");
    const larkLastCheckInDate = toLarkDate(lastCheckInDate || "");

    if (larkStartDate) {
      fields["Start Date"] = larkStartDate;
    }

    if (larkLastCheckInDate) {
      fields["Last Check-in Date"] = larkLastCheckInDate;
    }

    const larkAccessStartDate = toLarkDate(accessStartDate || "");
    const larkAccessEndDate = toLarkDate(accessEndDate || "");

    if (larkAccessStartDate) fields["Access Start Date"] = larkAccessStartDate;
    if (larkAccessEndDate) fields["Access End Date"] = larkAccessEndDate;

    // Drop any field this base doesn't have yet so unknown columns never 500
    // the update (e.g. before the override columns are added in Feishu).
    const availableFieldNames = await getClientsTableFieldNames(
      tokenData.tenant_access_token
    );

    // Manual performance-metric overrides (Number columns). Match the column by
    // name case-insensitively across a few common variants so small naming
    // differences in the base still resolve.
    // Ignore case AND all whitespace so "Zone 5K %" matches "Zone 5K%", etc.
    const norm = (s: string) => s.toLowerCase().replace(/\s+/g, "");
    const availableByNorm = availableFieldNames
      ? new Map(
          [...availableFieldNames].map((n) => [norm(String(n)), String(n)])
        )
      : null;
    const resolveColumn = (candidates: string[]) => {
      if (!availableByNorm) return candidates[0];
      for (const candidate of candidates) {
        const hit = availableByNorm.get(norm(candidate));
        if (hit) return hit;
      }
      return null;
    };
    const numberOverrides: Array<{ candidates: string[]; value: unknown }> = [
      { candidates: ["MAS (km/h)", "MAS km/h", "MAS (kmh)", "MAS"], value: masKmhOverride },
      { candidates: ["HR Max", "HRmax", "Max HR"], value: hrMaxOverride },
      { candidates: ["Resting HR", "RHR", "Resting Heart Rate"], value: restingHrOverride },
      { candidates: ["Zone 5K %", "5K %", "Zone 5K"], value: zone5kPct },
      { candidates: ["Zone 10K %", "10K %", "Zone 10K"], value: zone10kPct },
      { candidates: ["Zone Threshold %", "Threshold %", "Zone Threshold"], value: zoneThresholdPct },
      { candidates: ["Zone Easy %", "Easy %", "Zone Easy"], value: zoneEasyPct },
    ];
    for (const { candidates, value } of numberOverrides) {
      const larkValue = toLarkNumber(value);
      if (larkValue === undefined) continue;
      const columnName = resolveColumn(candidates);
      if (columnName) fields[columnName] = larkValue;
    }
    if (tags !== undefined) {
      fields["Tags"] = JSON.stringify(Array.isArray(tags) ? tags : []);
    }
    if (categories !== undefined) {
      fields["Categories"] = JSON.stringify(
        Array.isArray(categories) ? categories : []
      );
    }
    const omittedFields: string[] = [];
    const filteredFields = availableFieldNames
      ? Object.fromEntries(
          Object.entries(fields).filter(([fieldName]) => {
            const keep = availableFieldNames.has(fieldName);
            if (!keep) omittedFields.push(fieldName);
            return keep;
          })
        )
      : fields;

    const updateResponse = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${process.env.FEISHU_CLIENTS_TABLE_ID}/records/${clientRecordId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${tokenData.tenant_access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fields: filteredFields }),
      }
    );

    const updateData = await updateResponse.json();

    if (!updateResponse.ok || updateData.code !== 0) {
      return res.status(500).json({
        error: "Failed to update client",
        larkResponse: updateData,
        fieldsSent: filteredFields,
      });
    }

    return res.status(200).json({
      success: true,
      omittedFields,
      clientRecordId,
      larkResponse: updateData,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
}
