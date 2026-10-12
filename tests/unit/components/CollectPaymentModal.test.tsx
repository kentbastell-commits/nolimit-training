import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import CollectPaymentModal from "../../../src/CollectPaymentModal";

vi.mock("qrcode", () => ({ default: { toDataURL: async () => "data:image/png;base64,test" } }));

describe("CollectPaymentModal", () => {
  it.each([
    ["Online Coaching", "Online Coaching", undefined],
    ["Online Coaching Renewal", "Online Coaching", "renewal"],
    ["In-Person Training", "In-Person Training", undefined],
  ])("creates the selected %s payment link with its persisted purpose", async (selection, productType, paymentPurpose) => {
    const fetcher = vi.fn(async (_url: unknown, options?: RequestInit) => ({
      ok: true,
      json: async () => options?.method === "POST"
        ? { codeUrl: "weixin://test", tradeNo: "NLTEST", payLinkKey: "signed-test-key" }
        : { coaches: [{ name: "Kent" }] },
    }));
    vi.stubGlobal("fetch", fetcher);
    render(<CollectPaymentModal isChinese={false} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Amount (CNY)"), { target: { value: "1500" } });
    fireEvent.change(screen.getByLabelText("What is it for?"), { target: { value: "October training" } });
    fireEvent.change(screen.getByLabelText("Type"), { target: { value: selection } });
    if (selection !== "Online Coaching") {
      expect(screen.getByText("Payment only — no app signup or training-account prompts.")).toBeInTheDocument();
    }
    fireEvent.click(screen.getByRole("button", { name: "Generate payment QR" }));
    await waitFor(() => expect(screen.getByLabelText("Payment link")).toHaveValue("http://localhost:3000/pay/signed-test-key"));
    const posted = fetcher.mock.calls.find(([, options]) => options?.method === "POST");
    expect(JSON.parse(String(posted?.[1]?.body))).toMatchObject({ amount: 1500, label: "October training", productType });
    expect(JSON.parse(String(posted?.[1]?.body)).paymentPurpose).toBe(paymentPurpose);
  });
});
