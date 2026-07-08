import { afterEach, describe, expect, it, vi } from "vitest";
import { coachKeyOk, COACH_ONLY_HANDLERS } from "../../../api/_coachAuth.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("api/_coachAuth", () => {
  it("allows every request when COACH_ACCESS_KEY is unset (gating off)", () => {
    vi.stubEnv("COACH_ACCESS_KEY", "");
    expect(coachKeyOk({ headers: {} })).toBe(true);
    expect(coachKeyOk({ headers: { "x-coach-key": "anything" } })).toBe(true);
  });

  it("accepts a request carrying the exact key", () => {
    vi.stubEnv("COACH_ACCESS_KEY", "secret-key");
    expect(coachKeyOk({ headers: { "x-coach-key": "secret-key" } })).toBe(true);
  });

  it("rejects a missing or wrong key when gating is on", () => {
    vi.stubEnv("COACH_ACCESS_KEY", "secret-key");
    expect(coachKeyOk({ headers: {} })).toBe(false);
    expect(coachKeyOk({ headers: { "x-coach-key": "wrong" } })).toBe(false);
    // Non-string header values never pass.
    expect(coachKeyOk({ headers: { "x-coach-key": ["secret-key"] } })).toBe(false);
  });

  it("gates coach/admin handlers but not athlete-facing ones", () => {
    expect(COACH_ONLY_HANDLERS.has("createProgram")).toBe(true);
    expect(COACH_ONLY_HANDLERS.has("analytics")).toBe(true);
    expect(COACH_ONLY_HANDLERS.has("createProductOrder")).toBe(true);
    // Athlete portal / public store endpoints stay open.
    expect(COACH_ONLY_HANDLERS.has("clients")).toBe(false);
    expect(COACH_ONLY_HANDLERS.has("createClient")).toBe(false);
    expect(COACH_ONLY_HANDLERS.has("coaches")).toBe(false);
    expect(COACH_ONLY_HANDLERS.has("autoLoadProgram")).toBe(false);
  });
});
