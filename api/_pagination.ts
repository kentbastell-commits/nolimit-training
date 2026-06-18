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

    if (!data?.data?.items) break;
    items.push(...data.data.items);
    pageToken = data.data.has_more ? data.data.page_token : "";
  } while (pageToken);

  return items;
}
