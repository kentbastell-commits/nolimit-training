import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import handler from "../../../api/clientLog.ts";
import { makeReq, makeRes } from "../helpers.ts";

describe("api/clientLog", () => {
  beforeEach(() => {
    vi.spyOn(fs, "mkdirSync").mockImplementation(() => undefined);
    vi.spyOn(fs, "appendFileSync").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("accepts a crash event and appends one JSONL line", async () => {
    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: {
          kind: "crash",
          event: "window_error",
          message: "boom",
          stack: "Error: boom\n  at x",
          url: "/?portal=client",
        },
        headers: { "user-agent": "test-ua" },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(204);
    expect(fs.appendFileSync).toHaveBeenCalledTimes(1);
    const line = String(vi.mocked(fs.appendFileSync).mock.calls[0][1]);
    const event = JSON.parse(line);
    expect(event.kind).toBe("crash");
    expect(event.message).toBe("boom");
    expect(event.url).toBe("/?portal=client");
  });

  it("rejects an unknown kind", async () => {
    const res = makeRes();
    await handler(
      makeReq({ method: "POST", body: { kind: "hack" } }) as any,
      res as any
    );

    expect(res.statusCode).toBe(400);
    expect(fs.appendFileSync).not.toHaveBeenCalled();
  });

  it("truncates oversized fields instead of storing them", async () => {
    const res = makeRes();
    await handler(
      makeReq({
        method: "POST",
        body: { kind: "api_fail", message: "x".repeat(9000) },
      }) as any,
      res as any
    );

    expect(res.statusCode).toBe(204);
    const line = String(vi.mocked(fs.appendFileSync).mock.calls[0][1]);
    expect(JSON.parse(line).message.length).toBe(500);
  });

  it("GET returns recent events newest-first", async () => {
    vi.spyOn(fs, "readFileSync").mockReturnValue(
      [
        JSON.stringify({ ts: "1", kind: "funnel", event: "a" }),
        JSON.stringify({ ts: "2", kind: "crash", event: "b" }),
      ].join("\n") + "\n"
    );

    const res = makeRes();
    await handler(makeReq({ method: "GET" }) as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.body.events).toHaveLength(2);
    expect(res.body.events[0].event).toBe("b"); // newest first
  });
});
