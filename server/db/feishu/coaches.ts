import { fieldText, formatDate, listRecords } from "./client.ts";
import type { CoachDTO } from "../dto.ts";

const COACHES_TABLE_ID = process.env.FEISHU_COACHES_TABLE_ID || "tblzFeZwc4Zby2cr";

export async function listCoaches(): Promise<CoachDTO[]> {
  const items = await listRecords(COACHES_TABLE_ID);
  return items
    .map((item: any) => {
      const fields = item.fields || {};
      const name = fieldText(fields["Name"]);
      const coachId = fieldText(fields["Coach ID"]);
      const email = fieldText(fields["Email"]);
      const phoneWechat =
        fieldText(fields["Phone/WeChat"]) ||
        fieldText(fields["Phone/Wechat"]) ||
        fieldText(fields["Phone"]) ||
        fieldText(fields["Wechat"]);
      const bio = fieldText(fields["Bio"]);
      return {
        recordId: item.record_id,
        coachId: coachId || item.record_id,
        name: name || "Unnamed Coach",
        email,
        phoneWechat,
        role: fieldText(fields["Role"]) || "Coach",
        status: fieldText(fields["Status"]) || "Active",
        bio,
        createdAt: formatDate(fields["Created At"]),
        hasRealData: Boolean(name || coachId || email || phoneWechat || bio),
      };
    })
    .filter((c: any) => c.hasRealData)
    .map(({ hasRealData, ...c }: any) => c as CoachDTO);
}
