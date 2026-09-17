import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import CoachingFlowPage from "../../../src/CoachingFlowPage";
import i18n from "../../../src/i18n";

describe("coaching intake recovery", () => {
  it("retains answers on HTTP failure, shows retry and completes only after acknowledgement", async () => {
    await i18n.changeLanguage("en");
    let rejectIntake = true;
    const requests: any[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_url, init) => {
      const body = JSON.parse(init?.body || "{}");
      requests.push(body);
      const failed = body.stage === "intake" && rejectIntake;
      return { ok: !failed, status: failed ? 503 : 200,
        json: async () => failed ? { error: "Temporarily unavailable" } :
          { success: true, clientCode: "CL-AUDIT", clientRecordId: "CL-AUDIT", orderId: "ORD-AUDIT" } };
    }));
    render(<CoachingFlowPage />);
    fireEvent.click(screen.getByText("1 Month"));
    fireEvent.click(screen.getByRole("button", { name: "Continue to details" }));
    for (const [label, value] of [["Your name", "Audit Athlete"], ["WeChat ID", "audit"], ["Sport / discipline", "Running"], ["Preferred start date", "2026-09-14"], ["Primary goal", "Run stronger"]]) {
      fireEvent.change(screen.getByLabelText(label), { target: { value } });
    }
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Continue to payment" }));
    fireEvent.click(await screen.findByRole("button", { name: "I've paid — continue to questionnaire" }));
    const trainingAge = await screen.findByLabelText("Training age");
    fireEvent.change(trainingAge, { target: { value: "3–5 years" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit questionnaire" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("not submitted");
    expect(screen.getByLabelText("Training age")).toHaveValue("3–5 years");
    expect(screen.getByRole("button", { name: "Submit questionnaire" })).toBeEnabled();
    rejectIntake = false;
    fireEvent.click(screen.getByRole("button", { name: "Submit questionnaire" }));
    expect(await screen.findByRole("link", { name: /Open.*portal/i })).toBeInTheDocument();
    expect(requests.filter((r) => r.stage === "intake").map((r) => r.trainingAge)).toEqual(["3–5 years", "3–5 years"]);
  });
});
