// Ported from tests/unit/api/{clients,createClient,updateClient,recordLogin}
// .test.ts. The client record is the spine of the product — orders, workouts,
// assignments and referral credit all hang off it — so the invariants worth
// pinning are identity (one row per athlete) and that edits reach columns
// rather than being silently dropped.
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import listHandler from "../../../api/clients.ts";
import createHandler from "../../../api/createClient.ts";
import updateHandler from "../../../api/updateClient.ts";
import loginHandler from "../../../api/recordLogin.ts";
import { closeDb, makeReq, makeRes, resetDb, rows, seedClient, seedProgram } from "./helpers.ts";

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await closeDb();
});

async function post(handler: any, body: Record<string, any>) {
  const res = makeRes();
  await handler(makeReq({ method: "POST", body }) as any, res as any);
  return res;
}

describe("api/createClient (postgres)", () => {
  it("rejects non-POST with 405", async () => {
    const res = makeRes();
    await createHandler(makeReq({ method: "GET" }) as any, res as any);
    expect(res.statusCode).toBe(405);
  });

  it("400s without a name", async () => {
    const res = await post(createHandler, { phone: "13800000001" });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Missing client name");
    expect(await rows("select 1 from clients")).toHaveLength(0);
  });

  it("mints a client code when none is supplied", async () => {
    const res = await post(createHandler, { name: "Bob Tan", phone: "13800000001" });
    expect(res.statusCode).toBe(200);

    const [client] = await rows("select client_id, full_name from clients");
    expect(client.client_id).toMatch(/^CL-/);
    expect(client.full_name).toBe("Bob Tan");
  });

  it("mints sequential codes rather than colliding on a second client", async () => {
    await post(createHandler, { name: "Bob Tan" });
    await post(createHandler, { name: "Mei Lin" });

    const ids = await rows("select client_id from clients");
    expect(ids).toHaveLength(2);
    expect(new Set(ids.map((r) => r.client_id)).size).toBe(2);
  });

  it("persists the optional fields the coach console sends", async () => {
    await seedProgram({ program_id: "PR-1001", name: "Test Program" });
    const res = await post(createHandler, {
      name: "Bob Tan",
      email: "bob@example.com",
      phone: "13800000001",
      clientType: "Online Coaching",
      intakeStatus: "Sent",
      paymentStatus: "Paid",
      program: "PR-1001",
      languagePreference: "Chinese",
    });
    expect(res.statusCode).toBe(200);

    const [client] = await rows(
      "select email, client_type, intake_status, payment_status, program_id, language_preference from clients"
    );
    expect(client.email).toBe("bob@example.com");
    expect(client.client_type).toBe("Online Coaching");
    expect(client.intake_status).toBe("Sent");
    expect(client.payment_status).toBe("Paid");
    expect(client.program_id).toBe("PR-1001");
    expect(client.language_preference).toBe("Chinese");
  });
});

describe("api/updateClient (postgres)", () => {
  it("400s without a clientRecordId", async () => {
    const res = await post(updateHandler, { name: "Nope" });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Missing clientRecordId");
  });

  it("updates the fields provided and leaves the rest alone", async () => {
    await seedClient({
      client_id: "CL-9001",
      full_name: "Bob Tan",
      email: "old@example.com",
      phone: "13800000001",
    });

    const res = await post(updateHandler, {
      clientRecordId: "CL-9001",
      email: "new@example.com",
    });
    expect(res.statusCode).toBe(200);

    const [client] = await rows("select full_name, email, phone from clients");
    expect(client.email).toBe("new@example.com");
    // A patch must not blank the fields the editor didn't send (#43).
    expect(client.full_name).toBe("Bob Tan");
    expect(client.phone).toBe("13800000001");
  });

  it("treats an explicit empty string as a clear", async () => {
    await seedProgram({ program_id: "PR-1001", name: "Test Program" });
    await seedClient({ client_id: "CL-9001", full_name: "Bob Tan", program_id: "PR-1001" });

    const res = await post(updateHandler, { clientRecordId: "CL-9001", program: "" });
    expect(res.statusCode).toBe(200);

    // On Postgres "" means CLEAR — the Feishu-era omit made "remove this
    // program" a silent no-op (#43).
    const [client] = await rows("select program_id from clients");
    expect(client.program_id).toBeNull();
  });
});

describe("api/recordLogin (postgres)", () => {
  it("400s without any client reference", async () => {
    const res = await post(loginHandler, {});
    expect(res.statusCode).toBe(400);
  });

  it("stamps last_login for a known client", async () => {
    await seedClient({ client_id: "CL-9001", full_name: "Bob Tan" });

    const res = await post(loginHandler, { clientCode: "CL-9001" });
    expect(res.statusCode).toBe(200);

    const [client] = await rows("select last_login from clients");
    expect(client.last_login).toBeTruthy();
  });

  it("404s for an unknown client instead of silently succeeding", async () => {
    const res = await post(loginHandler, { clientCode: "CL-NOPE" });
    expect(res.statusCode).toBe(404);
  });
});

describe("api/clients list (postgres)", () => {
  it("returns [] when there are no clients", async () => {
    const res = makeRes();
    await listHandler(makeReq({ method: "GET" }) as any, res as any);
    expect(res.statusCode).toBe(200);
    expect(res.body.clients).toEqual([]);
  });

  it("returns created clients in the console shape", async () => {
    await post(createHandler, { name: "Bob Tan", phone: "13800000001" });

    const res = makeRes();
    await listHandler(makeReq({ method: "GET" }) as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.body.clients).toHaveLength(1);
    expect(res.body.clients[0].name).toBe("Bob Tan");
  });

  it("?code returns only that client's row, never the roster", async () => {
    await seedClient({ client_id: "CL-9001", full_name: "Bob Tan" });
    await seedClient({ client_id: "CL-9002", full_name: "Mei Lin" });

    const res = makeRes();
    await listHandler(makeReq({ method: "GET", query: { code: "CL-9001" } }) as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.body.clients).toHaveLength(1);
    expect(JSON.stringify(res.body)).not.toContain("Mei Lin");
  });

  it("full list is coach-only once COACH_ACCESS_KEY is set (mistake #49)", async () => {
    const vi = await import("vitest").then((m) => m.vi);
    vi.stubEnv("COACH_ACCESS_KEY", "secret-key");
    try {
      await seedClient({ client_id: "CL-9001", full_name: "Bob Tan" });

      const noKey = makeRes();
      await listHandler(makeReq({ method: "GET" }) as any, noKey as any);
      expect(noKey.statusCode).toBe(401);

      // ?code single-row stays open — the athlete portal depends on it.
      const single = makeRes();
      await listHandler(
        makeReq({ method: "GET", query: { code: "CL-9001" } }) as any,
        single as any
      );
      expect(single.statusCode).toBe(200);

      const withKey = makeRes();
      await listHandler(
        makeReq({ method: "GET", headers: { "x-coach-key": "secret-key" } }) as any,
        withKey as any
      );
      expect(withKey.statusCode).toBe(200);
      expect(withKey.body.clients).toHaveLength(1);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
