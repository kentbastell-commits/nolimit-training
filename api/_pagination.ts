// Shared Bitable pagination helper. A single records page caps at 500 rows, so
// any list/aggregate/find-by-scan must page through all records or it silently
// drops the most recent data once a table grows past one page.
export async function fetchAllBitableRecords(
  appToken: string,
  tableId: string,
  token: string,
  extraParams: Record<string, string> = {}
): Promise<any[]> {
  const items: any[] = [];
  let pageToken = "";

  do {
    const url = new URL(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records`
    );
    url.searchParams.set("page_size", "500");
    for (const [key, value] of Object.entries(extraParams)) {
      url.searchParams.set(key, value);
    }
    if (pageToken) url.searchParams.set("page_token", pageToken);

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();

    // A Feishu error payload (throttling 1254607, auth failure, bad table id)
    // also lacks data.items — treating it as end-of-data made handlers cache
    // an EMPTY list as if it were real (clients then saw e.g. a blank workout
    // history for the whole cache TTL). Errors must throw so the handler's
    // catch returns a real 500 and nothing poisons the cache.
    if (data?.code !== 0) {
      throw new Error(
        `Feishu records scan failed for table ${tableId}: code ${data?.code} ${
          data?.msg || ""
        }`.trim()
      );
    }
    if (!data?.data?.items) break;
    items.push(...data.data.items);
    pageToken = data.data.has_more ? data.data.page_token : "";
  } while (pageToken);

  return items;
}
