import { clientTags, validTagColor } from "./clientIdentity";
import type { Client, ProductOrder, Subscription } from "./appCore";
import { assignmentValues, resolveCoach, type AssignmentCoach } from "./coachAssignment";

const text = (value?: string) => !value || value === "--" ? "" : value;
export function profileDraft(client: Client, coaches: AssignmentCoach[]) {
  return {
    name: client.name, coachAlias: client.coachAlias || "", tagColors: { ...(client.tagColors || {}) }, email: text(client.email), phone: text(client.phone),
    ...assignmentValues(client, coaches), clientType: text(client.clientType),
    packageType: client.status || "Active", packageName: text(client.package),
    languagePreference: client.languagePreference || "English", startDate: text(client.startDate),
    accessStartDate: text(client.accessStartDate), accessEndDate: text(client.accessEndDate),
    subscriptionStatus: text(client.subscriptionStatus), intakeStatus: text(client.intakeStatus),
    paymentStatus: text(client.paymentStatus), source: text(client.source),
    purchasedProgramId: text(client.purchasedProgramId), notes: text(client.notes),
    tags: clientTags(client), categories: [] as string[],
  };
}
export type ProfileDraft = ReturnType<typeof profileDraft>;
export type ProfilePayload = ProfileDraft & { clientRecordId: string; coach: string };
export function profilePayload(client: Client, draft: ProfileDraft, coaches: AssignmentCoach[]): ProfilePayload {
  if (!draft.name.trim()) throw new Error("Enter the athlete’s name.");
  if (draft.primaryCoachId && draft.primaryCoachId === draft.secondaryCoachId) throw new Error("Choose different primary and supporting coaches.");
  if (draft.accessStartDate && draft.accessEndDate && draft.accessEndDate < draft.accessStartDate) throw new Error("Access end must be on or after access start.");
  if (draft.coachAlias.trim().length > 80) throw new Error("Keep the coach alias to 80 characters or fewer.");
  const tags = clientTags(draft);
  const tagColors = Object.fromEntries(tags.filter(tag => validTagColor(draft.tagColors[tag])).map(tag => [tag, draft.tagColors[tag]]));
  return { ...draft, tags, categories: [], tagColors, coachAlias: draft.coachAlias.trim(), name: draft.name.trim(), clientRecordId: client.id, coach: resolveCoach(draft.primaryCoachId, coaches)?.name || draft.primaryCoachId };
}
export function athleteOrders(client: Pick<Client, "id" | "clientCode">, orders: ProductOrder[]) {
  // Identity only: two athletes can have the same name or share a phone.
  return orders.filter(o => o.clientId && [client.id, client.clientCode].includes(o.clientId))
    .sort((a, b) => orderDate(b) - orderDate(a));
}
const orderDate = (o: ProductOrder) => Date.parse(o.paidAt || o.purchasedAt || "") || 0;
export const paidOrders = (orders: ProductOrder[]) => orders.filter(o => /^paid$/i.test(o.paymentStatus.trim()));
export function latestPayment(orders: ProductOrder[]) {
  return paidOrders(orders).filter(o => o.paidAt && Number.isFinite(Date.parse(o.paidAt)))
    .sort((a, b) => Date.parse(b.paidAt!) - Date.parse(a.paidAt!))[0];
}
export function profileDate(value?: string, zh = false) {
  if (!value || value === "--") return zh ? "未记录" : "Not recorded";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return zh ? "未记录" : "Not recorded";
  return new Intl.DateTimeFormat(zh ? "zh-CN" : "en-GB", { year: "numeric", month: "short", day: "numeric", timeZone: "Asia/Shanghai" }).format(date);
}
export function paymentDateInput(value?: string) {
  if (!value || !Number.isFinite(Date.parse(value))) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}
export function subscriptionDraft(sub?: Subscription | null) {
  return { plan: sub?.plan || "Online Coaching", price: sub ? String(sub.price) : "", currency: sub?.currency || "CNY",
    billingCycle: sub?.billingCycle || "1 Month", startDate: text(sub?.startDate), nextBillingDate: text(sub?.nextBillingDate),
    status: sub?.status || "Active", autoRenew: sub?.autoRenew || false, paymentId: sub?.paymentId || "" };
}
