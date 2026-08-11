// The website WeChat-login handshake table against real Postgres: two app
// processes share it behind nginx, so this must be DB-backed and race-safe.
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  completeWxLoginToken,
  createWxLoginToken,
  getWxLoginToken,
} from "../../../server/db/pg/wxLoginTokens.ts";
import { closeDb, resetDb, rows } from "./helpers.ts";

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await closeDb();
});

describe("wx_login_tokens (postgres)", () => {
  it("creates pending tokens and completes them exactly once", async () => {
    const token = await createWxLoginToken();
    const before = await getWxLoginToken(token);
    expect(before).toMatchObject({ status: "pending", expired: false });

    expect(await completeWxLoginToken(token, "CL-9001")).toBe(true);
    const after = await getWxLoginToken(token);
    expect(after).toMatchObject({ status: "ok", clientCode: "CL-9001" });

    // A second completion (double scan) must not steal the token.
    expect(await completeWxLoginToken(token, "CL-6666")).toBe(false);
    expect((await getWxLoginToken(token))?.clientCode).toBe("CL-9001");
  });

  it("reports unknown tokens as null and old tokens as expired", async () => {
    expect(await getWxLoginToken("nope")).toBeNull();
    const token = await createWxLoginToken();
    await rows("update wx_login_tokens set created_at = $1 where token = $2", [
      Date.now() - 10 * 60_000,
      token,
    ]);
    expect((await getWxLoginToken(token))?.expired).toBe(true);
  });
});
