// Fire-and-forget coach notifications via a Feishu custom-bot webhook.
//
// Setup (one-time): in Feishu, open (or create) a group for yourself →
// Settings → Bots → Add Bot → Custom Bot → copy the webhook URL → set it as
// FEISHU_BOT_WEBHOOK_URL in the server .env and restart. Until that env var
// exists this is a silent no-op, so it is always safe to call.
export async function notifyCoach(text: string) {
  const url = process.env.FEISHU_BOT_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ msg_type: "text", content: { text } }),
    });
  } catch {
    // Never let a notification failure break the business flow it reports on.
  }
}
