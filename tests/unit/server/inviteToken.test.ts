import { afterEach, describe, expect, it, vi } from "vitest";
import {
  inviteTokenExpiry,
  makeInviteToken,
  verifyInviteToken,
} from "../../../server/wechat/invite.ts";

afterEach(() => vi.unstubAllEnvs());

describe("server/wechat/invite token", () => {
  it("round-trips a client code inside the 32-char scene limit", () => {
    vi.stubEnv("PAY_LINK_SECRET", "s1");
    const token = makeInviteToken("CL-0001");
    expect(token.length).toBeLessThanOrEqual(32);
    expect(token.startsWith("i.CL-0001.")).toBe(true);
    expect(verifyInviteToken(token)).toBe("CL-0001");
    expect(inviteTokenExpiry(token)).toBeGreaterThan(Date.now() + 29 * 24 * 3600_000);
  });

  it("rejects a forged, tampered or expired token", () => {
    vi.stubEnv("PAY_LINK_SECRET", "s1");
    const token = makeInviteToken("CL-0001");
    const [i, code, exp, sig] = token.split(".");
    expect(verifyInviteToken(`${i}.CL-0002.${exp}.${sig}`)).toBeNull(); // another athlete
    // Always change the signature; it can legitimately already end in x.
    const tamperedSig = `${sig.slice(0, -1)}${sig.endsWith("x") ? "y" : "x"}`;
    expect(verifyInviteToken(`${i}.${code}.${exp}.${tamperedSig}`)).toBeNull();
    expect(verifyInviteToken("i.CL-0001.abc")).toBeNull(); // malformed
    expect(verifyInviteToken(makeInviteToken("CL-0001", -1000))).toBeNull(); // expired
    vi.stubEnv("PAY_LINK_SECRET", "s2");
    expect(verifyInviteToken(token)).toBeNull(); // different secret
  });
});
