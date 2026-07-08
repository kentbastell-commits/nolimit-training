import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchAllBitableRecords } from "../../../api/_pagination.ts";
import { stubFetch } from "../helpers.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("api/_pagination", () => {
  it("pages through every records page and concatenates the items", async () => {
    const impl = stubFetch([
      // Specific route first: the second request carries page_token=tok-page-2.
      {
        match: "page_token=tok-page-2",
        json: {
          code: 0,
          data: {
            has_more: false,
            items: [{ record_id: "rec3" }],
          },
        },
      },
      {
        match: "/tables/tbl-page/records",
        json: {
          code: 0,
          data: {
            has_more: true,
            page_token: "tok-page-2",
            items: [{ record_id: "rec1" }, { record_id: "rec2" }],
          },
        },
      },
    ]);

    const items = await fetchAllBitableRecords("app-tok", "tbl-page", "tok", {
      filter: "custom",
    });

    expect(items.map((item: any) => item.record_id)).toEqual([
      "rec1",
      "rec2",
      "rec3",
    ]);
    expect(impl).toHaveBeenCalledTimes(2);

    const firstUrl = String(impl.mock.calls[0][0]);
    expect(firstUrl).toContain("/apps/app-tok/tables/tbl-page/records");
    expect(firstUrl).toContain("page_size=500");
    expect(firstUrl).toContain("filter=custom"); // extraParams applied
    expect(impl.mock.calls[0][1].headers.Authorization).toBe("Bearer tok");

    const secondUrl = String(impl.mock.calls[1][0]);
    expect(secondUrl).toContain("page_token=tok-page-2");
  });

  it("returns an empty list when the response has no items", async () => {
    stubFetch([
      { match: "/tables/tbl-empty/records", json: { code: 1, msg: "denied" } },
    ]);

    const items = await fetchAllBitableRecords("app-tok", "tbl-empty", "tok");

    expect(items).toEqual([]);
  });
});
