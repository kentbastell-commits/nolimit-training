// The athlete-initiated "写给教练" loop: create -> coach queue -> reply ->
// athlete sees the reply. Mail, not chat — one body, one reply, a status
// the review queue can drain.
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/clientMessages.ts";
import { closeDb, makeReq, makeRes, resetDb, rows, seedClient } from "./helpers.ts";

beforeEach(async () => {
  await resetDb();
  vi.stubEnv("COACH_ACCESS_KEY", "test-coach");
  await seedClient({ client_id: "CL-9001", full_name: "Bob Tan" });
});
afterEach(() => vi.unstubAllEnvs());

afterAll(async () => {
  await closeDb();
});

async function call(req: Record<string, any>) {
  const res = makeRes();
  await handler(makeReq(req) as any, res as any);
  return res;
}

const post = (body: Record<string, any>) => call({ method: "POST", body, headers: { "x-coach-key": "test-coach" } });
const get = (query: Record<string, any> = {}) => call({ method: "GET", query, headers: { "x-coach-key": "test-coach" } });

describe("api/clientMessages (postgres)", () => {
  it("rejects a forged coach reply and leaves the athlete's message unchanged", async () => {
    const created = await post({ clientId: "CL-9001", body: "Question for my coach" });
    const rejected = await call({ method: "POST", body: { messageId: created.body.messageId, coachReply: "Forged reply" } });
    expect(rejected.statusCode).toBe(401);
    expect((await rows("select status,coach_reply from client_messages"))[0]).toMatchObject({ status: "New", coach_reply: null });
  });
  it("rejects a message without a real client id or without a body", async () => {
    expect((await post({ clientId: "bogus", body: "hi" })).statusCode).toBe(400);
    expect((await post({ clientId: "CL-9001", body: "   " })).statusCode).toBe(400);
    expect(await rows("select 1 from client_messages")).toHaveLength(0);
  });

  it("creates a New message and lists it in the coach queue", async () => {
    const res = await post({
      clientId: "CL-9001",
      clientName: "Bob Tan",
      body: "My week 3 looks empty — is that right?",
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.messageId).toMatch(/^MSG-/);

    const queue = await get({ status: "New" });
    expect(queue.body.messages).toHaveLength(1);
    expect(queue.body.messages[0].body).toContain("week 3");
    expect(queue.body.messages[0].status).toBe("New");
  });

  it("caps a runaway body at 1000 characters", async () => {
    await post({ clientId: "CL-9001", body: "x".repeat(5000) });
    const [row] = await rows("select body from client_messages");
    expect(row.body).toHaveLength(1000);
  });

  it("reply marks the message Replied and the athlete reads it back", async () => {
    const created = await post({ clientId: "CL-9001", body: "Login is broken" });
    const messageId = created.body.messageId;

    const reply = await post({ messageId, coachReply: "Fixed — try again now." });
    expect(reply.statusCode).toBe(200);

    // The reply is visible to the athlete on their own history...
    const mine = await get({ clientId: "CL-9001" });
    expect(mine.body.messages[0].coachReply).toBe("Fixed — try again now.");
    expect(mine.body.messages[0].status).toBe("Replied");

    // ...and the message has LEFT the coach's New queue (the cache must have
    // been invalidated by the write, not waited out — mistake #5).
    const queue = await get({ status: "New" });
    expect(queue.body.messages).toHaveLength(0);
  });

  it("404s a reply to a message that does not exist", async () => {
    const res = await post({ messageId: "MSG-NOPE", coachReply: "hello?" });
    expect(res.statusCode).toBe(404);
  });

  it("an empty reply is rejected before touching the row", async () => {
    const created = await post({ clientId: "CL-9001", body: "hello" });
    const res = await post({ messageId: created.body.messageId, coachReply: "  " });
    expect(res.statusCode).toBe(400);
    const [row] = await rows("select status from client_messages");
    expect(row.status).toBe("New");
  });

  it("scopes an athlete's list to their own messages", async () => {
    await seedClient({ client_id: "CL-9002", full_name: "Amy Wu" });
    await post({ clientId: "CL-9001", body: "from Bob" });
    await post({ clientId: "CL-9002", body: "from Amy" });
    const mine = await get({ clientId: "CL-9002" });
    expect(mine.body.messages).toHaveLength(1);
    expect(mine.body.messages[0].body).toBe("from Amy");
  });
});
