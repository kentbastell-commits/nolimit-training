export type BankTransferDetails = { accountName: string; accountNumber: string; bankName: string };
export type BankTransferOrder = {
  recordId?: string; orderId?: string; clientName?: string; productName?: string; paymentReference?: string;
};
export type BankTransferDraft = { language: "en" | "zh"; reference: string; remark: string };

export const bankTransferDraftKey = (order: BankTransferOrder | null) =>
  order ? `order:${order.recordId || order.orderId}` : "general";

export function newBankTransferDraft(order: BankTransferOrder | null, isChinese: boolean): BankTransferDraft {
  return {
    language: isChinese ? "zh" : "en",
    reference: order?.paymentReference || [order?.clientName, order?.orderId].filter(Boolean).join(" "),
    remark: "",
  };
}

export function bankTransferMessage(details: BankTransferDetails, draft: BankTransferDraft, order: BankTransferOrder | null) {
  const zh = draft.language === "zh";
  const tr = (en: string, cn: string) => zh ? cn : en;
  return [
    tr("Company bank transfer details", "公司银行转账信息"),
    "",
    `${tr("Account name", "账户名称")}: ${details.accountName}`,
    `${tr("Account number", "账户号码")}: ${details.accountNumber}`,
    `${tr("Bank", "开户银行")}: ${details.bankName}`,
    "",
    ...(order?.clientName ? [`${tr("Customer", "客户")}: ${order.clientName}`] : []),
    ...(order?.productName ? [`${tr("Service", "服务")}: ${order.productName}`] : []),
    ...(order?.orderId ? [`${tr("Order", "订单编号")}: ${order.orderId}`] : []),
    `${tr("Transfer reference", "转账备注")}: ${draft.reference.trim() || tr("Payer's name + service name or order number", "付款人姓名 + 服务名称或订单编号")}`,
    ...(draft.remark.trim() ? ["", `${tr("Remark", "补充说明")}: ${draft.remark.trim()}`] : []),
    "",
    tr("After transferring, please send us your payment confirmation so we can match the transfer and confirm receipt.",
      "转账完成后，请将付款凭证发送给我们，方便核对到账并确认您的付款。"),
  ].join("\n");
}
