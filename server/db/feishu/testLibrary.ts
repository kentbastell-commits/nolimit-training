// Feishu impl for the testLibrary domain — logic moved verbatim from
// api/testLibrary.ts (incl. the retry-throttled-pages scan that never serves
// or caches a truncated list).
import { getTenantToken, appToken, createRecord } from "./client.ts";
import { getCached } from "../../../api/_cache.ts";
import type {
  TestLibraryResult,
  LibraryTestDTO,
  CreateLibraryTestInput,
} from "../repositories/testLibrary.ts";

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

export async function listTestLibrary(): Promise<TestLibraryResult> {
  const token = await getTenantToken();

  const items: any[] = [];
  let pageToken = "";
  do {
    const url = new URL(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken()}/tables/${process.env.FEISHU_TEST_LIBRARY_TABLE_ID}/records`
    );
    url.searchParams.set("page_size", "500");
    if (pageToken) url.searchParams.set("page_token", pageToken);

    // Retry throttled pages; never serve or cache a truncated scan.
    let pageData: any = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      pageData = await response.json();
      if (pageData?.code === 0 && pageData?.data) break;
      await new Promise((resolve) => setTimeout(resolve, 800));
    }
    if (pageData?.code !== 0 || !pageData?.data) {
      return {
        status: 502,
        body: {
          error: "Feishu error",
          message: `Test library scan failed: ${pageData?.msg || "unknown"}`,
        },
      };
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

  const tests = items
    .map((item: any): LibraryTestDTO => {
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
        linkedExerciseRecordId: extractRecordIds(fields["Linked Exercise"])[0] || "",
      };
    })
    .filter((t) => t.testName)
    .sort((a, b) => a.testId.localeCompare(b.testId));

  return { status: 200, body: { tests } };
}

export async function createLibraryTest(
  input: CreateLibraryTestInput
): Promise<TestLibraryResult> {
  const testId = "TST-" + String(Math.floor(1000 + Math.random() * 9000));
  const fields: Record<string, any> = {
    "Test ID": testId,
    "Test Name": String(input.testName).trim(),
    Category: String(input.category).trim(),
    Status: "Active",
    "Higher Is Better": Boolean(input.higherIsBetter),
  };
  // Omit empties — typed Feishu columns reject "".
  if (String(input.testNameCn || "").trim())
    fields["Test Name CN"] = String(input.testNameCn).trim();
  if (String(input.resultMetric || "").trim())
    fields["Result Metric"] = String(input.resultMetric).trim();
  if (String(input.resultUnit || "").trim())
    fields["Result Unit"] = String(input.resultUnit).trim();
  if (String(input.calculation || "").trim())
    fields["Calculation"] = String(input.calculation).trim();
  if (String(input.protocol || "").trim())
    fields["Protocol"] = String(input.protocol).trim();
  if (String(input.protocolCn || "").trim())
    fields["Protocol CN"] = String(input.protocolCn).trim();
  if (String(input.linkedExerciseRecordId || "").trim())
    fields["Linked Exercise"] = [String(input.linkedExerciseRecordId).trim()];

  const createData = await createRecord(
    process.env.FEISHU_TEST_LIBRARY_TABLE_ID as string,
    fields
  );
  if (createData.code !== 0) {
    return {
      status: 502,
      body: {
        error: "Feishu error",
        message: createData.msg || "Could not create test",
        larkResponse: createData,
      },
    };
  }
  return {
    status: 200,
    body: {
      success: true,
      testId,
      recordId: createData.data?.record?.record_id || "",
    },
  };
}
