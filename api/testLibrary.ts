import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getCached, setCached } from "./_cache.ts";

// Canonical Test Library (physical tests): 1RM tests bound to exercises,
// energy-system tests, jump/speed/mobility tests. Athlete metrics bind to
// these Test IDs; calculations (e1RM, MAS, pace) key off the Calculation field.

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
        return "";
      })
      .join(", ");
  }
  if (value?.text) return value.text;
  if (value?.name) return value.name;
  return "";
}

function extractRecordIds(value: any): string[] {
  if (!value) return [];
  const out: string[] = [];
  const pushFrom = (o: any) => {
    if (!o || typeof o !== "object") return;
    if (Array.isArray(o.record_ids)) out.push(...o.record_ids);
    if (Array.isArray(o.link_record_ids)) out.push(...o.link_record_ids);
    if (typeof o.record_id === "string") out.push(o.record_id);
  };
  if (Array.isArray(value)) value.forEach(pushFrom);
  else pushFrom(value);
  return out;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    if (!process.env.FEISHU_TEST_LIBRARY_TABLE_ID) {
      return res.status(503).json({
        error: "Not configured",
        message: "Missing FEISHU_TEST_LIBRARY_TABLE_ID",
      });
    }

    let tests = getCached<any[]>("testLibrary");
    if (!tests) {
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

      const items: any[] = [];
      let pageToken = "";
      do {
        const url = new URL(
          `https://open.feishu.cn/open-apis/bitable/v1/apps/${process.env.FEISHU_BASE_APP_TOKEN}/tables/${process.env.FEISHU_TEST_LIBRARY_TABLE_ID}/records`
        );
        url.searchParams.set("page_size", "500");
        if (pageToken) url.searchParams.set("page_token", pageToken);

        // Retry throttled pages; never serve or cache a truncated scan.
        let pageData: any = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          const response = await fetch(url.toString(), {
            headers: {
              Authorization: `Bearer ${tokenData.tenant_access_token}`,
            },
          });
          pageData = await response.json();
          if (pageData?.code === 0 && pageData?.data) break;
          await new Promise((resolve) => setTimeout(resolve, 800));
        }
        if (pageData?.code !== 0 || !pageData?.data) {
          return res.status(502).json({
            error: "Feishu error",
            message: `Test library scan failed: ${pageData?.msg || "unknown"}`,
          });
        }

        items.push(...(pageData.data.items || []));
        pageToken = pageData.data.has_more ? pageData.data.page_token : "";
      } while (pageToken);

      // The DuplexLink's display text resolves to the exercise table's PRIMARY
      // field (the EX-#### id), not the name. Resolve real names via the
      // exercises cache (warmed on server start); fall back to the raw text.
      const cachedExercises = getCached<any[]>("exercises") || [];
      const exerciseNameById = new Map<string, string>(
        cachedExercises.map((exercise: any) => [
          String(exercise.recordId || ""),
          String(exercise.exerciseName || ""),
        ])
      );

      tests = items
        .map((item: any) => {
          const fields = item.fields || {};
          return {
            recordId: item.record_id,
            testId: fieldToText(fields["Test ID"]),
            testName: fieldToText(fields["Test Name"]),
            testNameCn: fieldToText(fields["Test Name CN"]),
            category: fieldToText(fields["Category"]),
            resultMetric: fieldToText(fields["Result Metric"]),
            resultUnit: fieldToText(fields["Result Unit"]),
            calculation: fieldToText(fields["Calculation"]),
            protocol: fieldToText(fields["Protocol"]),
            protocolCn: fieldToText(fields["Protocol CN"]),
            higherIsBetter: Boolean(fields["Higher Is Better"]),
            status: fieldToText(fields["Status"]) || "Active",
            linkedExerciseName:
              exerciseNameById.get(
                extractRecordIds(fields["Linked Exercise"])[0] || ""
              ) || fieldToText(fields["Linked Exercise"]),
            linkedExerciseRecordId:
              extractRecordIds(fields["Linked Exercise"])[0] || "",
          };
        })
        .filter((t) => t.testName)
        .sort((a, b) => a.testId.localeCompare(b.testId));

      setCached("testLibrary", tests, 10 * 60 * 1000);
    }

    return res.status(200).json({ tests });
  } catch (error: any) {
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
}
