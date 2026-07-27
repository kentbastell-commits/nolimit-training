// Morning "daily wellness" WeChat ping for coached athletes.
//
//   node --env-file=.env scripts/sendWellnessPings.mjs          (cron, 07:30 CST)
//   node --env-file=.env scripts/sendWellnessPings.mjs --dry    (print, send nothing)
//
// WeChat's rule for mini programs: one subscribe-message push per "allow"
// the athlete granted (banked in wx_subscribe_credits by /api/wxSubscribeBank).
// This consumes at most ONE credit per client per run, and only for athletes
// who (a) are Online Coaching / In-Person, (b) have a bound openid, and
// (c) haven't already submitted today's wellness check-in. No credit = no
// ping — that's WeChat's constraint, not a bug.
//
// Safe-by-default (named mistake #45): without WECHAT_WELLNESS_TEMPLATE_ID
// it exits quietly having sent nothing. A send failure marks the credit used
// anyway when WeChat says the user revoked (43101), so we don't burn retries
// on someone who unsubscribed.
import pg from "pg";

const DRY = process.argv.includes("--dry");
const APPID = process.env.WECHAT_MINI_APPID || "";
const SECRET = process.env.WECHAT_MINI_SECRET || "";
const TEMPLATE_ID = process.env.WECHAT_WELLNESS_TEMPLATE_ID || "";
// Template field mapping, e.g. '{"thing1":"记录今天的训练状态","date2":"{date}"}'
// — keys must match the template Kent creates in the MP console.
const FIELDS_RAW = process.env.WECHAT_WELLNESS_TEMPLATE_FIELDS || "";

function chinaTodayISO() {
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString().split("T")[0];
}

if (!APPID || !SECRET || !TEMPLATE_ID) {
  console.log("wellness-ping: WECHAT_MINI_APPID/SECRET/WELLNESS_TEMPLATE_ID not all set — nothing to do");
  process.exit(0);
}

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("wellness-ping: DATABASE_URL missing");
  process.exit(1);
}
const client = new pg.Client({ connectionString: dbUrl });
await client.connect();

try {
  // China "today" spans [00:00, 24:00) Beijing = epoch-ms window.
  const today = chinaTodayISO();
  const dayStart = Date.parse(`${today}T00:00:00+08:00`);
  const dayEnd = dayStart + 24 * 3600 * 1000;

  // One row per eligible client with their OLDEST unused wellness credit.
  const { rows } = await client.query(
    `select distinct on (c.client_id)
            c.client_id, c.wechat_openid, c.language_preference, w.credit_id
       from clients c
       join wx_subscribe_credits w
         on w.client_id = c.client_id
        and w.used_at is null
        and w.template_type = 'wellness'
      where c.wechat_openid is not null and c.wechat_openid <> ''
        and c.client_type ~* 'online coaching|in[- ]?person'
        and not exists (
          select 1 from check_ins ci
           where ci.client_id = c.client_id
             and ci.submitted_date >= $1 and ci.submitted_date < $2
        )
      order by c.client_id, w.granted_at asc`,
    [dayStart, dayEnd]
  );

  console.log(`wellness-ping: ${rows.length} eligible athlete(s) on ${today}${DRY ? " (dry run)" : ""}`);
  if (DRY || rows.length === 0) process.exit(0);

  const tokenRes = await fetch(
    `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${APPID}&secret=${SECRET}`
  );
  const tokenJson = await tokenRes.json();
  if (!tokenJson.access_token) {
    console.error("wellness-ping: token fetch failed", JSON.stringify(tokenJson));
    process.exit(1);
  }

  let fieldsTemplate = {};
  try {
    fieldsTemplate = FIELDS_RAW ? JSON.parse(FIELDS_RAW) : {};
  } catch {
    console.error("wellness-ping: WECHAT_WELLNESS_TEMPLATE_FIELDS is not valid JSON — sending empty data");
  }
  const data = {};
  for (const [key, value] of Object.entries(fieldsTemplate)) {
    data[key] = { value: String(value).replace("{date}", today) };
  }

  let sent = 0;
  let failed = 0;
  for (const row of rows) {
    const res = await fetch(
      `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${tokenJson.access_token}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          touser: row.wechat_openid,
          template_id: TEMPLATE_ID,
          page: "pages/checkin/index",
          lang: /chinese/i.test(row.language_preference || "") ? "zh_CN" : "en",
          data,
        }),
      }
    );
    const json = await res.json().catch(() => ({}));
    // 0 = delivered; 43101 = user revoked the subscription — the credit is
    // dead either way. Any other error keeps the credit for tomorrow.
    if (json.errcode === 0 || json.errcode === 43101) {
      await client.query(`update wx_subscribe_credits set used_at = $1 where credit_id = $2`, [
        Date.now(),
        row.credit_id,
      ]);
      if (json.errcode === 0) sent += 1;
      else console.log(`wellness-ping: ${row.client_id} revoked (43101), credit retired`);
    } else {
      failed += 1;
      console.error(`wellness-ping: send failed for ${row.client_id}:`, JSON.stringify(json));
    }
  }
  console.log(`wellness-ping: sent ${sent}, failed ${failed}`);
} finally {
  await client.end();
}
