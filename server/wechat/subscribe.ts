// WeChat mini-program subscribe messages ("订阅消息").
//
// WeChat's model: an athlete taps "allow" inside the mini program and that
// grants permission for exactly ONE future push per template. The mini
// program banks each grant through /api/wxSubscribeBank into
// wx_subscribe_credits; every send here consumes the oldest unused credit
// of that kind, so a push can never be sent without a matching grant.
//
// Templates were created by Kent in the MP console on 2026-11-06 (功能 →
// 订阅消息 → 我的模板). The ids are public (the mini program ships them in
// its bundle), only the app secret is not. Keyword ORDER is fixed at
// creation and the field codes below mirror the console's 详情 page — a
// wrong code is rejected by WeChat (errcode 47003), never silently sent.
import { and, eq, gte, isNull, lt, max, ne, or, sql } from "drizzle-orm";
import { db } from "../db/client.ts";
import { assignedWorkouts, clients, wxSubscribeCredits } from "../db/schema.ts";
import { getMiniAccessToken, resetMiniAccessTokenCache } from "./miniPhone.ts";

export type SubscribeKind = "session" | "summary";

export const SUBSCRIBE_TEMPLATES: Record<SubscribeKind, { id: string; title: string; page: string; fields: string[] }> = {
  // 训练提醒: 训练名称 / 预约时间 / 温馨提示 — "you have a session today".
  session: {
    id: "GZWzlqOXkCDP6LTZ6NGEW9Avn84_2g4B_xl8FgGYbUg",
    title: "训练提醒",
    page: "pages/home/index",
    fields: ["thing1", "time2", "thing3"],
  },
  // 训练总结通知: 教练姓名 / 训练部位 / 发布时间 — "coach replied to your video".
  summary: {
    id: "VU4xOzkO15iC5y4Cv5ftpu1_4otvIQQ_ZXBPmwymcXc",
    title: "训练总结通知",
    page: "pages/inbox/index",
    fields: ["thing1", "thing2", "time3"],
  },
};

export type PushOutcome =
  | "unconfigured"
  | "no-openid"
  | "no-credit"
  | "throttled"
  | "sent"
  | "revoked"
  | `error:${string}`;

export function isSubscribeConfigured(): boolean {
  return Boolean(process.env.WECHAT_MINI_APPID && process.env.WECHAT_MINI_SECRET);
}

// `thing` fields take at most 20 characters and no emoji; `time` fields
// want "YYYY-MM-DD HH:mm". Values are clipped, never rejected, so a long
// session name degrades to a prefix instead of a lost push.
export function clipThing(value: string, limit = 20): string {
  const clean = String(value || "")
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}️]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  const chars = Array.from(clean);
  return chars.length > limit ? chars.slice(0, limit).join("") : clean || "-";
}

export function formatWxTime(ms: number): string {
  const d = new Date(ms + 8 * 3600 * 1000); // China time
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

export function isChinese(languagePreference: string | null | undefined): boolean {
  return /chinese|zh/i.test(String(languagePreference || ""));
}

export async function takeCredit(clientId: string, kind: SubscribeKind): Promise<string | null> {
  const rows = await db
    .select({ creditId: wxSubscribeCredits.creditId })
    .from(wxSubscribeCredits)
    .where(and(eq(wxSubscribeCredits.clientId, clientId), eq(wxSubscribeCredits.templateType, kind), isNull(wxSubscribeCredits.usedAt)))
    .orderBy(wxSubscribeCredits.grantedAt)
    .limit(1);
  return rows[0]?.creditId ?? null;
}

async function retireCredit(creditId: string): Promise<void> {
  await db.update(wxSubscribeCredits).set({ usedAt: Date.now() }).where(eq(wxSubscribeCredits.creditId, creditId));
}

async function lastPushAt(clientId: string, kind: SubscribeKind): Promise<number> {
  const rows = await db
    .select({ at: max(wxSubscribeCredits.usedAt) })
    .from(wxSubscribeCredits)
    .where(and(eq(wxSubscribeCredits.clientId, clientId), eq(wxSubscribeCredits.templateType, kind)));
  return Number(rows[0]?.at ?? 0);
}

export type SendInput = {
  openid: string;
  kind: SubscribeKind;
  values: string[];
  lang?: "zh_CN" | "en";
  fetcher?: typeof fetch;
};

// Raw WeChat call. Returns the errcode (0 = delivered). A stale access token
// (40001/42001) is retried once with a fresh one.
export async function sendSubscribeMessage(input: SendInput): Promise<{ errcode: number; errmsg: string }> {
  const fetcher = input.fetcher ?? fetch;
  const template = SUBSCRIBE_TEMPLATES[input.kind];
  const data: Record<string, { value: string }> = {};
  template.fields.forEach((field, i) => {
    const raw = input.values[i] ?? "";
    data[field] = { value: field.startsWith("time") ? raw : clipThing(raw) };
  });
  const once = async () => {
    const token = await getMiniAccessToken(fetcher);
    const res = await fetcher(`https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ touser: input.openid, template_id: template.id, page: template.page, lang: input.lang || "zh_CN", data }),
    });
    const body = (await res.json().catch(() => ({}))) as { errcode?: number; errmsg?: string };
    return { errcode: Number(body.errcode ?? -1), errmsg: String(body.errmsg || "") };
  };
  let result = await once();
  if (result.errcode === 40001 || result.errcode === 42001) {
    resetMiniAccessTokenCache();
    result = await once();
  }
  return result;
}

export type PushInput = {
  clientId: string;
  kind: SubscribeKind;
  values: string[];
  // Skip when a push of this kind reached the athlete within this window —
  // a session-level video reply writes several records in a burst.
  minGapMs?: number;
  fetcher?: typeof fetch;
  log?: (line: string) => void;
};

// Full flow: credit → openid → send → retire credit. Never throws: a push
// is best-effort decoration on a save that has already succeeded.
export async function pushToClient(input: PushInput): Promise<PushOutcome> {
  const log = input.log ?? ((line: string) => console.log(line));
  try {
    if (!isSubscribeConfigured()) return "unconfigured";
    const [client] = await db
      .select({ openid: clients.wechatOpenid, lang: clients.languagePreference })
      .from(clients)
      .where(eq(clients.clientId, input.clientId))
      .limit(1);
    if (!client?.openid) return "no-openid";
    const creditId = await takeCredit(input.clientId, input.kind);
    if (!creditId) return "no-credit";
    if (input.minGapMs && Date.now() - (await lastPushAt(input.clientId, input.kind)) < input.minGapMs) return "throttled";
    const result = await sendSubscribeMessage({
      openid: client.openid,
      kind: input.kind,
      values: input.values,
      lang: isChinese(client.lang) ? "zh_CN" : "en",
      fetcher: input.fetcher,
    });
    // 0 = delivered; 43101 = the athlete revoked the subscription. The credit
    // is spent either way. Any other error keeps it for the next attempt.
    if (result.errcode === 0 || result.errcode === 43101) {
      await retireCredit(creditId);
      return result.errcode === 0 ? "sent" : "revoked";
    }
    log(`wx-subscribe: ${input.kind} to ${input.clientId} failed ${result.errcode} ${result.errmsg}`);
    return `error:${result.errcode}`;
  } catch (error: any) {
    log(`wx-subscribe: ${input.kind} to ${input.clientId} threw ${error?.message || error}`);
    return "error:exception";
  }
}

// Coach replied to an athlete's exercise video → 训练总结通知.
export async function notifyVideoReply(video: {
  clientId: string;
  exerciseName?: string | null;
  exerciseNameCn?: string | null;
  workoutName?: string | null;
  workoutNameCn?: string | null;
}, fetcher?: typeof fetch): Promise<PushOutcome> {
  const [client] = await db
    .select({ coach: clients.primaryCoachId, coachAssigned: clients.coachAssigned, lang: clients.languagePreference })
    .from(clients)
    .where(eq(clients.clientId, video.clientId))
    .limit(1);
  const zh = isChinese(client?.lang);
  const coach = String(client?.coach || client?.coachAssigned || "NX LIMIT").trim();
  const part = zh
    ? video.exerciseNameCn || video.exerciseName || video.workoutNameCn || video.workoutName
    : video.exerciseName || video.workoutName || video.exerciseNameCn;
  return pushToClient({
    clientId: video.clientId,
    kind: "summary",
    values: [coach, String(part || (zh ? "动作视频" : "Exercise video")), formatWxTime(Date.now())],
    minGapMs: 30 * 60 * 1000,
    fetcher,
  });
}

export type SessionReminderTarget = {
  clientId: string;
  sessionName: string;
  sessionNameCn: string;
  languagePreference: string;
};

// Athletes with a published, not-yet-completed workout scheduled on the
// China day starting at `dayStartMs`, a WeChat identity, and an unused
// session credit. One row per athlete: the first workout of the day.
export async function listSessionReminderTargets(dayStartMs: number): Promise<SessionReminderTarget[]> {
  const dayEndMs = dayStartMs + 24 * 3600 * 1000;
  const rows = await db
    .selectDistinctOn([assignedWorkouts.clientId], {
      clientId: assignedWorkouts.clientId,
      sessionName: assignedWorkouts.sessionName,
      sessionNameCn: assignedWorkouts.sessionNameCn,
      languagePreference: clients.languagePreference,
    })
    .from(assignedWorkouts)
    .innerJoin(clients, eq(clients.clientId, assignedWorkouts.clientId))
    .where(and(
      gte(assignedWorkouts.scheduledDate, dayStartMs),
      lt(assignedWorkouts.scheduledDate, dayEndMs),
      eq(assignedWorkouts.isDraft, false),
      or(isNull(assignedWorkouts.completionStatus), ne(assignedWorkouts.completionStatus, "Completed")),
      sql`coalesce(${clients.wechatOpenid}, '') <> ''`,
      sql`exists (select 1 from ${wxSubscribeCredits} w where w.client_id = ${assignedWorkouts.clientId} and w.template_type = 'session' and w.used_at is null)`,
    ))
    .orderBy(assignedWorkouts.clientId, sql`${assignedWorkouts.dayOrder} asc nulls last`, assignedWorkouts.assignedWorkoutId);
  return rows.map((r) => ({
    clientId: String(r.clientId),
    sessionName: String(r.sessionName || ""),
    sessionNameCn: String(r.sessionNameCn || ""),
    languagePreference: String(r.languagePreference || ""),
  }));
}

export function sessionReminderValues(target: SessionReminderTarget, dayStartMs: number): string[] {
  const zh = isChinese(target.languagePreference);
  const name = zh ? target.sessionNameCn || target.sessionName : target.sessionName || target.sessionNameCn;
  return [
    name || (zh ? "今日训练" : "Today's session"),
    formatWxTime(dayStartMs + 7.5 * 3600 * 1000),
    zh ? "打开小程序查看今天的训练安排" : "Your plan is ready",
  ];
}
