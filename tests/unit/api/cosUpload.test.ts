import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { makeRes } from "../helpers.ts";
import { COACH_ONLY_HANDLERS } from "../../../api/_coachAuth.ts";
import { cosAuthorization } from "../../../server/cos.ts";

// The fast upload path for the exercise library (CLAUDE.md #67): browser →
// COS acceleration host → server pulls it in. These tests never touch COS:
// fetch is stubbed, and the uploads dir is a temp folder via UPLOADS_DIR.
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nl-cos-"));
process.env.UPLOADS_DIR = tmpDir;
const ticket = (await import("../../../api/cosUploadTicket.ts")).default;
const finish = (await import("../../../api/cosUploadFinish.ts")).default;

function post(handler: any, body: Record<string, unknown>) {
  const res = makeRes();
  return Promise.resolve(handler({ method: "POST", body, headers: {}, query: {} }, res)).then(() => res);
}

describe("api/cosUploadTicket + api/cosUploadFinish", () => {
  beforeEach(() => {
    process.env.COS_SECRET_ID = "AKIDtest";
    process.env.COS_SECRET_KEY = "secret";
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("both handlers are coach-only (acceleration bills per GB)", () => {
    expect(COACH_ONLY_HANDLERS.has("cosUploadTicket")).toBe(true);
    expect(COACH_ONLY_HANDLERS.has("cosUploadFinish")).toBe(true);
  });

  it("503s when COS is not configured so the client falls back to the direct route", async () => {
    delete process.env.COS_SECRET_ID;
    expect((await post(ticket, { name: "a.mp4", size: 10, contentType: "video/mp4" })).statusCode).toBe(503);
    expect((await post(finish, { key: "web-inbox/x.mp4", kind: "exercise" })).statusCode).toBe(503);
  });

  it("refuses unsupported types and oversized files before signing anything", async () => {
    expect((await post(ticket, { name: "a.exe", size: 10, contentType: "video/mp4" })).statusCode).toBe(400);
    expect((await post(ticket, { name: "a.mp4", size: 600 * 1024 * 1024, contentType: "video/mp4" })).statusCode).toBe(400);
    expect((await post(ticket, { name: "a.mp4", size: 0, contentType: "video/mp4" })).statusCode).toBe(400);
  });

  it("signs a PUT to the acceleration host that is bound to the declared size", async () => {
    const res = await post(ticket, { name: "Hip CARS.MOV", size: 1234, contentType: "video/quicktime" });
    expect(res.statusCode).toBe(200);
    expect(res.body.key).toMatch(/^web-inbox\/\d+-[0-9a-f]{16}\.mov$/);
    expect(res.body.url).toBe(`https://nxlimit-footage-1454208796.cos.accelerate.myqcloud.com/${res.body.key}`);
    expect(res.body.headers["Content-Type"]).toBe("video/quicktime");
    const auth = String(res.body.headers.Authorization);
    expect(auth).toContain("q-ak=AKIDtest");
    // content-length is in the signed header list, so the ticket cannot be
    // reused for a bigger file.
    expect(auth).toContain("q-header-list=content-length;content-type;host");
    expect(auth).toMatch(/q-signature=[0-9a-f]{40}/);
  });

  it("the signature matches the reference implementation for the same inputs", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-23T00:00:00Z"));
    const a = cosAuthorization({ method: "PUT", pathname: "/web-inbox/a.mp4", headers: { host: "h", "content-length": "5" } });
    const b = cosAuthorization({ method: "PUT", pathname: "/web-inbox/a.mp4", headers: { "Content-Length": "5", HOST: "h" } });
    expect(a).toBe(b); // header names are lower-cased and sorted before signing
    vi.useRealTimers();
  });

  it("pulls the object from the regional host into /uploads, verifies the size, deletes it, and answers like the direct route", async () => {
    const bytes = Buffer.from("fake-video-bytes");
    const calls: Array<{ url: string; method: string }> = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, method: init?.method || "GET" });
      if ((init?.method || "GET") === "GET") {
        return new Response(bytes, { status: 200, headers: { "content-length": String(bytes.length) } });
      }
      return new Response(null, { status: 204 });
    }));

    const res = await post(finish, { key: "web-inbox/123-abcdef.mp4", kind: "exercise", size: bytes.length });
    expect(res.statusCode).toBe(200);
    expect(res.body.url).toMatch(/^\/uploads\/ex-[0-9a-f]{24}\.mp4$/);
    const onDisk = fs.readFileSync(path.join(tmpDir, path.basename(res.body.url)));
    expect(onDisk.equals(bytes)).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, `${path.basename(res.body.url)}.part`))).toBe(false);

    expect(calls[0].url).toBe("https://nxlimit-footage-1454208796.cos.ap-guangzhou.myqcloud.com/web-inbox/123-abcdef.mp4");
    expect(calls[1].method).toBe("DELETE");
  });

  it("rejects keys outside the inbox prefix and an incomplete transfer", async () => {
    expect((await post(finish, { key: "footage/private.mp4", kind: "exercise" })).statusCode).toBe(400);
    expect((await post(finish, { key: "web-inbox/../etc.mp4", kind: "exercise" })).statusCode).toBe(400);

    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response(Buffer.from("short"), { status: 200, headers: { "content-length": "5" } })
    ));
    const res = await post(finish, { key: "web-inbox/1-a.mp4", kind: "exercise", size: 999 });
    expect(res.statusCode).toBe(502);
    expect(fs.readdirSync(tmpDir).filter((f) => f.endsWith(".part"))).toEqual([]);
  });

  it("404s when the browser never finished its PUT", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 404 })));
    expect((await post(finish, { key: "web-inbox/1-a.mp4", kind: "exercise" })).statusCode).toBe(404);
  });
});
