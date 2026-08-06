// Ported from tests/unit/api/findMyPortal.test.ts. This is the login path for
// both the web portal and the WeChat mini program, so its security properties
// matter as much as its happy path: a phone number alone must never be enough
// to enumerate someone else's portal.
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import handler from "../../../api/findMyPortal.ts";
import { closeDb, makeReq, makeRes, resetDb, seedClient } from "./helpers.ts";

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await closeDb();
});

async function lookup(body: Record<string, any>) {
  const res = makeRes();
  await handler(makeReq({ method: "POST", body }) as any, res as any);
  return res;
}

describe("api/findMyPortal (postgres)", () => {
  it("rejects non-POST with 405", async () => {
    const res = makeRes();
    await handler(makeReq({ method: "GET" }) as any, res as any);
    expect(res.statusCode).toBe(405);
  });

  it("400s without both phone and name", async () => {
    expect((await lookup({ phone: "13800000001" })).statusCode).toBe(400);
    expect((await lookup({ name: "Bob Tan" })).statusCode).toBe(400);
  });

  it("logs in with the simple per-athlete pin", async () => {
    await seedClient({
      client_id: "CL-9001",
      full_name: "Bob Tan",
      phone: "13800000001",
      login_pin: "111111",
    });

    const res = await lookup({ pin: "111111" });
    expect(res.statusCode).toBe(200);
    expect(res.body.clientCode).toBe("CL-9001");
    // Whitespace tolerated; wrong pin is a generic 404.
    expect((await lookup({ pin: " 111111 " })).body.clientCode).toBe("CL-9001");
    expect((await lookup({ pin: "222222" })).statusCode).toBe(404);
  });

  it("returns the client code on a phone + name match", async () => {
    await seedClient({ client_id: "CL-9001", full_name: "Bob Tan", phone: "13800000001" });

    const res = await lookup({ phone: "13800000001", name: "Bob Tan" });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.clientCode).toBe("CL-9001");
  });

  it("tolerates surrounding whitespace on the phone", async () => {
    await seedClient({ client_id: "CL-9001", full_name: "Bob Tan", phone: "13800000001" });

    const res = await lookup({ phone: "  13800000001  ", name: "Bob Tan" });
    expect(res.statusCode).toBe(200);
    expect(res.body.clientCode).toBe("CL-9001");
  });

  it("matches on the Chinese name when that is what the client registered", async () => {
    await seedClient({
      client_id: "CL-9002",
      full_name: "Mei Lin",
      full_name_cn: "林美",
      phone: "13800000002",
    });

    const res = await lookup({ phone: "13800000002", name: "林美" });
    expect(res.statusCode).toBe(200);
    expect(res.body.clientCode).toBe("CL-9002");
  });

  it("404s when the phone matches but the name does not", async () => {
    await seedClient({ client_id: "CL-9001", full_name: "Bob Tan", phone: "13800000001" });

    // The whole point of the name check: knowing a phone number must not be
    // enough to open someone else's training portal.
    const res = await lookup({ phone: "13800000001", name: "Someone Else" });
    expect(res.statusCode).toBe(404);
    expect(res.body.clientCode).toBeUndefined();
  });

  it("404s with an identical message whether or not the phone exists", async () => {
    await seedClient({ client_id: "CL-9001", full_name: "Bob Tan", phone: "13800000001" });

    const known = await lookup({ phone: "13800000001", name: "Someone Else" });
    const unknown = await lookup({ phone: "13900000000", name: "Someone Else" });

    // Deliberately indistinguishable — a differing response would confirm
    // which numbers are registered.
    expect(known.statusCode).toBe(404);
    expect(unknown.statusCode).toBe(404);
    expect(known.body.error).toBe(unknown.body.error);
  });
});
