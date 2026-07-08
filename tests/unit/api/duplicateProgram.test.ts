import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/duplicateProgram.ts";
import { invalidateCache } from "../../../api/_cache.ts";
import { makeReq, makeRes, stubFetch, stubFeishuEnv } from "../helpers.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  invalidateCache("");
});

const PROGRAM_ENV = {
  FEISHU_PROGRAMS_TABLE_ID: "tbl-prog",
  FEISHU_WORKOUT_TEMPLATES_TABLE_ID: "tbl-tmpl",
};

// One template row that belongs to program record "prog1".
const templateListRoute = {
  match: "tbl-tmpl/records",
  json: {
    code: 0,
    data: {
      has_more: false,
      items: [
        {
          record_id: "t1",
          fields: {
            "Template ID": "WT-1111",
            "Program ID": [{ record_ids: ["prog1"] }],
            Week: "1",
            Day: "2",
            "Session Name": "Upper A",
            Sets: "3",
          },
        },
        {
          record_id: "t2",
          fields: {
            "Program ID": [{ record_ids: ["progOther"] }],
            Week: "1",
            "Session Name": "Not mine",
          },
        },
      ],
    },
  },
};

describe("api/duplicateProgram", () => {
  it("rejects non-POST methods with 405", async () => {
    const res = makeRes();
    await handler(makeReq({ method: "GET" }) as any, res as any);
    expect(res.statusCode).toBe(405);
  });

  it("400 when programRecordId is missing", async () => {
    const res = makeRes();
    await handler(makeReq({ method: "POST", body: {} }) as any, res as any);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("programRecordId required");
  });

  it("500 when the tables are not configured", async () => {
    vi.stubEnv("FEISHU_PROGRAMS_TABLE_ID", "");
    vi.stubEnv("FEISHU_WORKOUT_TEMPLATES_TABLE_ID", "");
    const res = makeRes();
    await handler(
      makeReq({ method: "POST", body: { programRecordId: "prog1" } }) as any,
      res as any
    );
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Tables not configured");
  });

  it("week mode copies the source week's sessions to the target week", async () => {
    stubFeishuEnv(PROGRAM_ENV);
    const fetchImpl = stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      { match: "tbl-tmpl/records/batch_create", json: { code: 0 } },
      {
        match: "tbl-tmpl/fields",
        json: { code: 0, data: { items: [{ field_name: "Week", type: 2 }] } },
      },
      templateListRoute,
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: { programRecordId: "prog1", mode: "week", fromWeek: 1, toWeek: 3 },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true, copied: 1, week: 3 });

    const batchCall = fetchImpl.mock.calls.find(([url]: any[]) =>
      String(url).includes("batch_create")
    );
    const sent = JSON.parse(batchCall![1].body).records;
    expect(sent).toHaveLength(1);
    const fields = sent[0].fields;
    expect(fields["Week"]).toBe(3);
    expect(fields["Template ID"]).toMatch(/^WT-\d{4}$/);
    expect(fields["Template ID"]).not.toBe("WT-1111");
    expect(fields["Program ID"]).toEqual(["prog1"]); // same program for a week copy
    expect(fields["Session Name"]).toBe("Upper A");
  });

  it("week mode 404s when the source week has no sessions", async () => {
    stubFeishuEnv(PROGRAM_ENV);
    stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      templateListRoute,
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: { programRecordId: "prog1", mode: "week", fromWeek: 9, toWeek: 10 },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe("No sessions in week 9");
  });

  it("program mode clones the record as '(Copy)' plus its templates, never store-visible", async () => {
    stubFeishuEnv(PROGRAM_ENV);
    const fetchImpl = stubFetch([
      { match: "tenant_access_token", json: { code: 0, tenant_access_token: "tok" } },
      { match: "tbl-tmpl/records/batch_create", json: { code: 0 } },
      {
        match: "tbl-tmpl/fields",
        json: { code: 0, data: { items: [{ field_name: "Week", type: 2 }] } },
      },
      templateListRoute,
      {
        match: "tbl-prog/records/prog1",
        json: {
          code: 0,
          data: {
            record: {
              fields: {
                "Program ID": "PR-1001",
                "Program Name": "Strength Base",
                "Program Name CN": "力量基础",
                "Public Store Visible": true,
                Price: "299",
                Clients: [{ record_ids: ["c1"] }], // linked field must not copy
              },
            },
          },
        },
      },
      {
        match: "tbl-prog/fields",
        json: { code: 0, data: { items: [{ field_name: "Price", type: 2 }] } },
      },
      {
        match: "tbl-prog/records",
        json: { code: 0, data: { record: { record_id: "prog2" } } },
      },
    ]);

    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: { programRecordId: "prog1", mode: "program" },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.newRecordId).toBe("prog2");
    expect(res.body.newProgramId).toMatch(/^PR-\d{4}$/);
    expect(res.body.sessionsCopied).toBe(1);

    const createCall = fetchImpl.mock.calls.find(
      ([url, init]: any[]) =>
        init?.method === "POST" && String(url).endsWith("tbl-prog/records")
    );
    const progFields = JSON.parse(createCall![1].body).fields;
    expect(progFields["Program Name"]).toBe("Strength Base (Copy)");
    expect(progFields["Program Name CN"]).toBe("力量基础 (副本)");
    expect(progFields["Public Store Visible"]).toBe(false);
    expect(progFields.Price).toBe(299); // coerced to a real number for the Number column
    expect(progFields.Clients).toBeUndefined();

    const batchCall = fetchImpl.mock.calls.find(([url]: any[]) =>
      String(url).includes("batch_create")
    );
    const tmplFields = JSON.parse(batchCall![1].body).records[0].fields;
    expect(tmplFields["Program ID"]).toEqual(["prog2"]); // relinked to the clone
  });
});
