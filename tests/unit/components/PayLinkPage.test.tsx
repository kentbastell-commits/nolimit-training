import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import PayLinkPage from "../../../src/PayLinkPage";

vi.mock("../../../src/WxPayPanel", () => ({
  default: ({ onPaid }: { onPaid: () => void }) => <button onClick={onPaid}>Pay with WeChat</button>,
}));
vi.mock("../../../src/useWxpayEnabled", () => ({ useWxpayEnabled: () => true }));

beforeEach(() => {
  window.history.replaceState(null, "", "/pay/test-key-123?lang=en");
});

const base = {
  orderId: "ORD-1", amount: 1500, currency: "CNY", label: "Training payment",
  clientName: "Test Athlete", paid: false, needsIdentity: false,
  clientCode: "", paymentOnly: true, fapiao: null,
};

function load(info = base) {
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => info })));
  render(<PayLinkPage />);
}

describe("PayLinkPage", () => {
  it("goes straight to payment and confirmation with no account prompts", async () => {
    load();
    fireEvent.click(await screen.findByRole("button", { name: "Pay with WeChat" }));
    expect(screen.getByText("Paid. Thank you!")).toBeInTheDocument();
    expect(screen.queryByLabelText(/Mobile number/)).not.toBeInTheDocument();
    expect(screen.queryByText("Your training account is ready")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Open my portal" })).not.toBeInTheDocument();
    expect(screen.getByText("Need a fapiao (发票)?")).toBeInTheDocument();
  });

  it("keeps payment-only confirmation on reload even with an attached account", async () => {
    load({ ...base, paid: true, clientCode: "CL-9001" });
    await screen.findByText("Paid. Thank you!");
    expect(screen.queryByText("Your training account is ready")).not.toBeInTheDocument();
    expect(screen.queryByAltText("NX LIMIT mini program code")).not.toBeInTheDocument();
  });

  it("keeps the identity step for new online clients", async () => {
    load({ ...base, paymentOnly: false, needsIdentity: true });
    expect(await screen.findByLabelText("Mobile number *")).toBeRequired();
    expect(screen.getByRole("button", { name: "Continue to payment" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pay with WeChat" })).not.toBeInTheDocument();
  });

  it("keeps online account access after payment", async () => {
    load({ ...base, paymentOnly: false, paid: true, clientCode: "CL-9001" });
    expect(await screen.findByRole("link", { name: "Open my portal" })).toHaveAttribute("href", "/?portal=client&client=CL-9001");
    expect(screen.getByText("Your training account is ready")).toBeInTheDocument();
  });
});
