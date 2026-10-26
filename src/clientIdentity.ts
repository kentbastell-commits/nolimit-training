import type { Client } from "./appCore";

export const DEFAULT_TAG_COLOR = "#e8ddbf";
export const TAG_PALETTE = ["#e8ddbf", "#dcebdd", "#dce7f5", "#e9def1", "#f3dce2", "#f4dfc7", "#d7eaea", "#445c50"];
export const validTagColor = (value: unknown): value is string => typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
export const clientTags = (client: Pick<Client, "tags" | "categories">) =>
  [...new Set([...(client.tags || []), ...(client.categories || [])].map(t => t.trim()).filter(Boolean))];
export function tagStyle(color?: string) {
  const bg = validTagColor(color) ? color : DEFAULT_TAG_COLOR;
  const [r, g, b] = [1, 3, 5].map(i => parseInt(bg.slice(i, i + 2), 16));
  // Choose readable text for arbitrary coach-selected chip backgrounds.
  const luminance = [r, g, b].map(v => { const n = v / 255; return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4; });
  return { backgroundColor: bg, color: luminance[0] * .2126 + luminance[1] * .7152 + luminance[2] * .0722 > .179 ? "#171717" : "#ffffff", borderColor: bg };
}
export const coachClientName = (client: Pick<Client, "name" | "coachAlias">) =>
  client.coachAlias?.trim() ? `${client.name} · ${client.coachAlias.trim()}` : client.name;
