import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "../../../api/bankTransferDetails.ts";
import { COACH_ONLY_HANDLERS } from "../../../api/_coachAuth.ts";

function request(method = "GET", key?: string) {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis(), setHeader: vi.fn() };
  handler({ method, headers: key ? { "x-coach-key": key } : {} } as never, res as never);
  return res;
}
afterEach(() => vi.unstubAllEnvs());
describe("coach bank transfer details", () => {
  it("returns only the approved customer fields to a verified coach", () => {
    vi.stubEnv("COACH_ACCESS_KEY", "bank-test-key");
    const res = request("GET", "bank-test-key");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ accountName: "广州跃燃体育信息咨询有限公司", accountNumber: "3602011009200555212", bankName: "中国工商银行股份有限公司广州建设六马路支行" });
    expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "private, no-store");
    expect(COACH_ONLY_HANDLERS.has("bankTransferDetails")).toBe(true);
  });
  it("does not expose bank details without positive coach authentication, including an unset key", () => {
    vi.stubEnv("COACH_ACCESS_KEY", "bank-test-key");
    for (const key of [undefined, "wrong"]) {
      const res = request("GET", key);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(JSON.stringify(res.json.mock.calls)).not.toContain("3602011009200555212");
    }
    vi.stubEnv("COACH_ACCESS_KEY", "");
    expect(request("GET", "bank-test-key").status).toHaveBeenCalledWith(401);
  });
  it("does not accept writes", () => {
    vi.stubEnv("COACH_ACCESS_KEY", "bank-test-key");
    expect(request("POST", "bank-test-key").status).toHaveBeenCalledWith(405);
  });
});
