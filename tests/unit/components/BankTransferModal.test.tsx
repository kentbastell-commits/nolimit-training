import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import BankTransferModal from "../../../src/BankTransferModal";
import { newBankTransferDraft } from "../../../src/bankTransfer";
import type { BankTransferOrder } from "../../../src/bankTransfer";

const details = { accountName: "广州跃燃体育信息咨询有限公司", accountNumber: "3602011009200555212", bankName: "中国工商银行股份有限公司广州建设六马路支行" };
const order = { recordId: "REC-JASON", orderId: "ORD-JASON", clientName: "Jason", productName: "November coaching", paymentReference: "NL-JASON" };
function Example({ close = vi.fn() }: { close?: () => void }) {
  const [draft, setDraft] = useState(newBankTransferDraft(order, false));
  return <BankTransferModal isChinese={false} order={order} orders={[order]} draft={draft} onDraftChange={setDraft} onOrderChange={vi.fn()} onClose={close} />;
}

describe("bank transfer message", () => {
  it("previews and copies the edited reference and customer remark in the selected language", async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => details });
    vi.stubGlobal("fetch", fetch);
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(<Example />);
    await screen.findByLabelText("Message preview");
    fireEvent.change(screen.getByLabelText("Transfer reference"), { target: { value: "Jason November" } });
    fireEvent.change(screen.getByLabelText("Remark (optional)"), { target: { value: "November coaching renewal" } });
    fireEvent.change(screen.getByLabelText("Message language"), { target: { value: "zh" } });
    fireEvent.click(screen.getByRole("button", { name: "Copy message" }));
    await screen.findByText("Copied. Ready to paste into WeChat or email.");
    const copied = writeText.mock.calls[0][0];
    expect(copied).toContain("3602011009200555212");
    expect(copied).toContain("转账备注: Jason November");
    expect(copied).toContain("补充说明: November coaching renewal");
    expect(copied).toContain("ORD-JASON");
    expect(copied).not.toContain("BASTELL KENT");
    expect(fetch.mock.calls.every(call => call[0] === "/api/bankTransferDetails" && !call[1]?.method)).toBe(true);
    fireEvent.change(screen.getByLabelText("Remark (optional)"), { target: { value: "Updated" } });
    expect(screen.queryByText("Copied. Ready to paste into WeChat or email.")).not.toBeInTheDocument();
  });
  it("retains the remark during loading failure and retry, and reports clipboard failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({ ok: false }).mockResolvedValue({ ok: true, json: async () => details }));
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error("Denied")) } });
    render(<Example />);
    fireEvent.change(screen.getByLabelText("Remark (optional)"), { target: { value: "Keep this note" } });
    await screen.findByRole("alert");
    expect(screen.getByRole("button", { name: "Copy message" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await screen.findByLabelText("Message preview");
    expect(screen.getByLabelText("Remark (optional)")).toHaveValue("Keep this note");
    fireEvent.click(screen.getByRole("button", { name: "Copy message" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Could not copy or share"));
    expect(screen.queryByText("Copied. Ready to paste into WeChat or email.")).not.toBeInTheDocument();
  });
  it("uses a general template without leaking another customer's details and closes with Escape", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => details }));
    const close = vi.fn();
    const noOrder: BankTransferOrder | null = null;
    render(<BankTransferModal isChinese order={noOrder} orders={[order]} draft={newBankTransferDraft(noOrder, true)} onDraftChange={vi.fn()} onOrderChange={vi.fn()} onClose={close} />);
    const preview = await screen.findByLabelText("信息预览");
    expect((preview as HTMLTextAreaElement).value).toContain("付款人姓名 + 服务名称或订单编号");
    expect((preview as HTMLTextAreaElement).value).not.toContain("Jason");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(close).toHaveBeenCalledOnce();
  });
});
