import { afterEach, describe, expect, it, vi } from "vitest";
import { notifyCoach } from "../../../api/_notify.ts";
import { stubFetch } from "../helpers.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("api/_notify", () => {
  it("is a silent no-op when FEISHU_BOT_WEBHOOK_URL is unset", async () => {
    vi.stubEnv("FEISHU_BOT_WEBHOOK_URL", "");
    const impl = stubFetch([]); // unmatched URLs would throw

    await notifyCoach("hello");

    expect(impl).not.toHaveBeenCalled();
  });

  it("POSTs a Feishu text message to the webhook", async () => {
    vi.stubEnv("FEISHU_BOT_WEBHOOK_URL", "https://webhook.test/bot-hook");
    const impl = stubFetch([{ match: "webhook.test/bot-hook", json: { code: 0 } }]);

    await notifyCoach("New order from Alice");

    expect(impl).toHaveBeenCalledTimes(1);
    const [url, options] = impl.mock.calls[0];
    expect(String(url)).toBe("https://webhook.test/bot-hook");
    expect(options.method).toBe("POST");
    expect(options.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(options.body)).toEqual({
      msg_type: "text",
      content: { text: "New order from Alice" },
    });
  });

  it("never throws even when the webhook request fails", async () => {
    vi.stubEnv("FEISHU_BOT_WEBHOOK_URL", "https://webhook.test/unrouted");
    stubFetch([]); // fetch will reject (unmatched URL)

    await expect(notifyCoach("boom")).resolves.toBeUndefined();
  });
});
