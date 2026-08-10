#!/usr/bin/env node
import { createHash } from "node:crypto";
import {
  FeishuClient,
  formatApiError,
  loadCompanyOpsConfig,
} from "./client.mjs";

const args = process.argv.slice(2);
const sendMode = args.includes("--send");
if (args.includes("--apply")) throw new Error("Use --send for delivery; --apply is not supported here.");
if (sendMode && args.includes("--dry")) throw new Error("Choose either --dry or --send, not both.");
const allowed = args.filter(
  (arg) => !["--dry", "--send", "--json"].includes(arg) && !arg.startsWith("--date="),
);
if (allowed.length) throw new Error(`Unknown argument(s): ${allowed.join(", ")}`);
if (sendMode && process.env.COMPANY_OPS_REMINDERS_ENABLED !== "true") {
  throw new Error(
    "Reminder delivery is disabled. Set COMPANY_OPS_REMINDERS_ENABLED=true only after reviewing a dry run and employee opt-ins.",
  );
}

function shanghaiToday() {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

const dateArgument = args.find((arg) => arg.startsWith("--date="))?.slice(7);
const reportingDate = dateArgument || shanghaiToday();
if (!/^\d{4}-\d{2}-\d{2}$/.test(reportingDate)) {
  throw new Error("--date must use YYYY-MM-DD");
}

const config = loadCompanyOpsConfig();
const client = new FeishuClient(config);
const outputJson = args.includes("--json");
const warnings = [];
const results = [];
const reminderRules = [];
const delivery = { eligibleRecipients: 0, sent: 0, skipped: 0, failed: 0 };
const dayStart = Date.parse(`${reportingDate}T00:00:00+08:00`);
if (!Number.isFinite(dayStart)) throw new Error(`Invalid reporting date: ${reportingDate}`);
const dayEnd = dayStart + 86_400_000 - 1;
const tomorrowEnd = dayEnd + 86_400_000;

function plainText(value) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value.map((item) => item?.text || item?.name || item || "").join(" ");
  }
  if (value && typeof value === "object") {
    return value.text || value.name || value.value || "";
  }
  return value == null ? "" : String(value);
}

function timestamp(value) {
  if (value == null || value === "") return undefined;
  if (Array.isArray(value)) return timestamp(value[0]);
  if (value && typeof value === "object") {
    return timestamp(value.value ?? value.timestamp ?? value.date);
  }
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return numeric < 10_000_000_000 ? numeric * 1000 : numeric;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function includesAny(value, terms) {
  const normalized = plainText(value).toLowerCase();
  return terms.some((term) => normalized.includes(term.toLowerCase()));
}

const isClosed = (value) => includesAny(value, [
  "已完成", "completed", "done", "已关闭", "closed", "cancelled", "已取消",
  "won't fix", "不处理", "已成交", "won", "lost", "流失", "archive", "归档",
]);

function userOpenIds(value) {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return values
    .map((item) => {
      if (typeof item === "string") return item.startsWith("ou_") ? item : undefined;
      return item?.open_id || item?.id || item?.user_id;
    })
    .filter((value) => typeof value === "string" && value.startsWith("ou_"));
}

function optedIn(value) {
  return value === true || value === 1 || plainText(value).toLowerCase() === "true";
}

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function loadBase(appToken) {
  const tables = await client.paginate(`/bitable/v1/apps/${appToken}/tables`);
  return new Map(tables.map((table) => [table.name, table]));
}

async function recordsFor(baseKey, tableName, tableMaps, { required = false } = {}) {
  const table = tableMaps[baseKey].get(tableName);
  if (!table) {
    const message = `${baseKey}/${tableName}: table unavailable; run the company-ops migration first`;
    if (required) throw new Error(message);
    warnings.push(message);
    return [];
  }
  return client.paginate(
    `/bitable/v1/apps/${config.bases[baseKey]}/tables/${table.table_id}/records`,
    { query: { user_id_type: "open_id" }, pageSize: 500 },
  );
}

function add(role, key, label, chineseLabel, records, predicate, targeting = {}) {
  const count = records.reduce((total, record) => {
    try {
      return total + (predicate(record.fields || {}) ? 1 : 0);
    } catch {
      return total;
    }
  }, 0);
  results.push({ role, key, label, count });
  reminderRules.push({
    role,
    key,
    label,
    chineseLabel,
    records,
    predicate,
    founderOnly: Boolean(targeting.founderOnly),
    assigneeFields: targeting.assigneeFields || [],
  });
}

function assignedTo(fields, fieldNames, openId) {
  return fieldNames.some((fieldName) => userOpenIds(fields[fieldName]).includes(openId));
}

async function founderIds() {
  const members = await client.paginate(
    `/drive/v1/permissions/${config.bases.confidential}/members`,
    { query: { type: "bitable" } },
  );
  return new Set([
    ...config.founderOpenIds,
    ...members
      .filter((item) => item.member_type === "openid" && item.perm === "full_access")
      .map((item) => item.member_id),
  ]);
}

function deliveryFields(deliveryKey, openId, rule, count, status, extra = {}) {
  const fields = {
    "幂等键 Idempotency Key": deliveryKey,
    "提醒日期 Reminder Date": dayStart,
    "接收人哈希 Recipient Hash": hash(openId).slice(0, 16),
    "提醒类别 Category": rule.key,
    "待办数量 Item Count": count,
    "发送状态 Delivery Status": status,
    ...extra,
  };
  return Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined));
}

async function saveDeliveryLog(logTable, existing, fields) {
  const path = `/bitable/v1/apps/${config.bases.teamOps}/tables/${logTable.table_id}/records`;
  if (existing) {
    await client.put(`${path}/${existing.record_id}`, { fields });
    existing.fields = { ...(existing.fields || {}), ...fields };
    return existing;
  }
  const response = await client.post(path, { fields }, { idempotent: true });
  const record = response.data?.record;
  if (!record?.record_id) throw new Error("Reminder log record was created without a record ID");
  return record;
}

async function deliverReminders(tableMaps) {
  const logTable = tableMaps.teamOps.get("提醒发送记录 Reminder Delivery Log");
  if (!logTable) throw new Error("Reminder Delivery Log is missing; apply and verify the company-ops migration before sending.");
  const staff = await recordsFor(
    "confidential",
    "员工名册 Staff",
    tableMaps,
    { required: true },
  );
  const optedInIds = new Set(
    staff
      .filter((record) => optedIn(record.fields?.["机器人提醒 Bot Reminders"]))
      .flatMap((record) => userOpenIds(record.fields?.["飞书用户 Feishu User"])),
  );
  delivery.eligibleRecipients = optedInIds.size;
  if (!optedInIds.size) {
    warnings.push("No Staff row has both a Feishu Open ID and Bot Reminders=true; nothing was sent.");
    return;
  }

  const founders = await founderIds();
  const logRecords = await recordsFor(
    "teamOps",
    "提醒发送记录 Reminder Delivery Log",
    tableMaps,
    { required: true },
  );
  const byKey = new Map(
    logRecords.map((record) => [plainText(record.fields?.["幂等键 Idempotency Key"]), record]),
  );

  for (const openId of optedInIds) {
    for (const rule of reminderRules) {
      if (rule.founderOnly && !founders.has(openId)) continue;
      if (!rule.founderOnly && !rule.assigneeFields.length) continue;
      const count = rule.records.reduce((total, record) => {
        const fields = record.fields || {};
        const targeted = rule.founderOnly || assignedTo(fields, rule.assigneeFields, openId);
        return total + (targeted && rule.predicate(fields) ? 1 : 0);
      }, 0);
      if (!count) continue;

      const deliveryKey = hash(`${reportingDate}|${openId}|${rule.key}`);
      let logRecord = byKey.get(deliveryKey);
      if (includesAny(logRecord?.fields?.["发送状态 Delivery Status"], ["已发送", "sent"])) {
        delivery.skipped += 1;
        continue;
      }

      logRecord = await saveDeliveryLog(
        logTable,
        logRecord,
        deliveryFields(deliveryKey, openId, rule, count, "发送中 Sending", {
          "错误代码 Error Code": "",
        }),
      );
      byKey.set(deliveryKey, logRecord);
      const messageText = [
        `跃燃体育 Company Ops 提醒 · ${reportingDate}`,
        `${rule.chineseLabel}：${count}项`,
        `${rule.label}: ${count}`,
        "请在公司运营工作台处理。此消息只包含待办数量，不包含客户、人事、工资、健康或其他记录详情。",
      ].join("\n");

      try {
        const response = await client.post(
          "/im/v1/messages",
          {
            receive_id: openId,
            msg_type: "text",
            content: JSON.stringify({ text: messageText }),
            uuid: `ops-${deliveryKey.slice(0, 32)}`,
          },
          { query: { receive_id_type: "open_id" }, retry: true },
        );
        const messageId = response.data?.message_id || response.data?.message?.message_id || "";
        logRecord = await saveDeliveryLog(
          logTable,
          logRecord,
          deliveryFields(deliveryKey, openId, rule, count, "已发送 Sent", {
            "发送时间 Sent At": Date.now(),
            "飞书消息ID Message ID": messageId,
            "错误代码 Error Code": "",
          }),
        );
        byKey.set(deliveryKey, logRecord);
        delivery.sent += 1;
      } catch (error) {
        const errorCode = String(error.code || error.status || "unknown").slice(0, 64);
        await saveDeliveryLog(
          logTable,
          logRecord,
          deliveryFields(deliveryKey, openId, rule, count, "失败 Failed", {
            "错误代码 Error Code": errorCode,
          }),
        );
        warnings.push(`Reminder category ${rule.key} failed for one opted-in recipient (code ${errorCode}).`);
        delivery.failed += 1;
      }
    }
  }
}

async function main() {
  await client.authenticate();
  const tableMaps = {
    confidential: await loadBase(config.bases.confidential),
    teamOps: await loadBase(config.bases.teamOps),
    growth: await loadBase(config.bases.growth),
  };

  const [
    content,
    campaigns,
    partners,
    leads,
    weekly,
    expenses,
    onboardingTasks,
    support,
  ] = await Promise.all([
    recordsFor("growth", "内容日历 Content Calendar", tableMaps),
    recordsFor("growth", "营销活动 Campaigns", tableMaps),
    recordsFor("growth", "合作伙伴 KOL & Partners", tableMaps),
    recordsFor("growth", "线索 Leads CRM", tableMaps),
    recordsFor("growth", "周报与里程碑 Weekly Reports & Milestones", tableMaps),
    recordsFor("confidential", "报销记录 Expenses", tableMaps),
    recordsFor("teamOps", "入职任务 Onboarding Tasks", tableMaps),
    recordsFor("teamOps", "产品与应用支持 Product & App Support", tableMaps),
  ]);

  add("Founder", "content_review", "Content awaiting founder review", "待创始人审核的内容", content, (fields) =>
    includesAny(fields["审核状态 Approval Status"], ["待创始人审核", "awaiting review"]),
    { founderOnly: true },
  );
  add("Brand & Growth", "publish_due", "Content due to publish by tomorrow", "明日前应发布的内容", content, (fields) => {
    const due = timestamp(fields["发布日期 Publish Date"]);
    return due !== undefined && due <= tomorrowEnd && !isClosed(fields["状态 Status"]);
  }, { assigneeFields: ["负责人 Owner (Feishu)"] });
  add("Brand & Growth", "analysis_due", "Published content analysis due", "到期的内容复盘", content, (fields) => {
    const due = timestamp(fields["复盘截止 Analysis Due"]);
    return due !== undefined && due <= dayEnd && includesAny(fields["状态 Status"], ["已发布", "published"]);
  }, { assigneeFields: ["负责人 Owner (Feishu)"] });
  add("Founder", "campaign_approval", "Campaigns awaiting approval", "待批准的营销活动", campaigns, (fields) =>
    includesAny(fields["状态 Status"], ["待批准", "pending approval"]),
    { founderOnly: true },
  );
  add("Brand & Growth", "campaign_review", "Campaign reviews due", "到期的活动复盘", campaigns, (fields) => {
    const due = timestamp(fields["下次决策/复盘 Next Review"]);
    return due !== undefined && due <= dayEnd && !isClosed(fields["状态 Status"]);
  }, { assigneeFields: ["负责人 Owner"] });
  add("Brand & Growth", "partner_follow_up", "Partner follow-ups due", "到期的合作伙伴跟进", partners, (fields) => {
    const due = timestamp(fields["下次跟进 Next Date"]);
    return due !== undefined && due <= dayEnd && !isClosed(fields["状态 Status"]);
  }, { assigneeFields: ["负责人 Owner"] });
  add("Brand & Growth", "lead_follow_up", "Lead follow-ups due", "到期的线索跟进", leads, (fields) => {
    const due = timestamp(fields["下次跟进 Next Date"]);
    return due !== undefined && due <= dayEnd && !isClosed(fields["阶段 Stage"]);
  }, { assigneeFields: ["负责人（飞书） Owner (Feishu)", "负责人 Owner"] });
  add("Founder", "weekly_review", "Weekly reports awaiting review", "待查看的周报", weekly, (fields) =>
    !fields["查看时间 Reviewed At"] && Boolean(plainText(fields["报告 Report"])),
    { founderOnly: true },
  );
  add("Founder", "weekly_decision", "Weekly reports needing a decision", "需要决定的周报事项", weekly, (fields) =>
    includesAny(fields["决策状态 Decision Status"], ["待创始人决策", "pending"]),
    { founderOnly: true },
  );
  add("Admin & Finance", "expense_review", "Expense claims awaiting review", "待审核的报销", expenses, (fields) =>
    includesAny(fields["状态 Status"], ["待审核", "待审批", "pending", "submitted"]),
    { assigneeFields: ["审批人 Approver"] },
  );
  add("Admin & Managers", "onboarding_due", "Open onboarding tasks due", "到期的入职任务", onboardingTasks, (fields) => {
    const due = timestamp(fields["截止日期 Due"]);
    return due !== undefined && due <= dayEnd && !isClosed(fields["状态 Status"]);
  }, { assigneeFields: ["负责人 Assignee"] });
  add("Founder & Managers", "onboarding_blocked", "Blocked onboarding tasks", "受阻的入职任务", onboardingTasks, (fields) =>
    includesAny(fields["状态 Status"], ["受阻", "blocked"]),
    { assigneeFields: ["负责人 Assignee"] },
  );
  add("Product & Development", "critical_support", "Open P0/P1 product issues", "未关闭的P0/P1产品问题", support, (fields) =>
    includesAny(fields["严重级别 Severity"], ["P0", "P1"]) && !isClosed(fields["状态 Status"]),
    { assigneeFields: ["开发负责人 Developer Owner"] },
  );
  add("Product & Development", "support_verify", "Resolved issues awaiting verification", "待验证的产品问题", support, (fields) =>
    includesAny(fields["状态 Status"], ["待验证", "ready to verify"]),
    { assigneeFields: ["业务负责人 Business Owner", "验证人 Verified By"] },
  );

  if (sendMode) await deliverReminders(tableMaps);

  const payload = {
    mode: sendMode ? "gated reminder delivery" : "read-only reminder preview",
    date: reportingDate,
    timezone: "Asia/Shanghai",
    reminders: results,
    ...(sendMode ? { delivery } : {}),
    warnings,
    privacy: "Aggregate counts only; no employee, lead, client, salary, health, or record details are emitted or messaged.",
  };
  if (outputJson) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log(`MODE|${payload.mode}`);
    console.log(`DATE|${reportingDate}|timezone=Asia/Shanghai`);
    for (const item of results) {
      console.log(`REMINDER|${item.role}|${item.key}|${item.count}|${item.label}`);
    }
    if (sendMode) {
      console.log(`DELIVERY|eligible_recipients=${delivery.eligibleRecipients}|sent=${delivery.sent}|skipped=${delivery.skipped}|failed=${delivery.failed}`);
    }
    for (const warning of warnings) console.log(`WARN|${warning}`);
    console.log(`SUMMARY|reminder_groups=${results.length}|total_items=${results.reduce((sum, item) => sum + item.count, 0)}|warnings=${warnings.length}`);
    console.log("PRIVACY|Aggregate counts only; no employee, lead, client, salary, health, or record details were emitted or messaged.");
  }
  if (delivery.failed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`FAILED|${formatApiError(error)}`);
  process.exitCode = 1;
});
