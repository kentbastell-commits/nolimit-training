import { useEffect, useState } from "react";
import { Copy, Landmark, Share2, X } from "lucide-react";
import PortalToApp from "./PortalToApp";
import { useDialog } from "./useDialog";
import { bankTransferMessage } from "./bankTransfer";
import type { BankTransferDetails, BankTransferDraft, BankTransferOrder } from "./bankTransfer";
import "./BankTransferModal.css";

export default function BankTransferModal({ isChinese, order, orders, draft, onDraftChange, onOrderChange, onClose }: {
  isChinese: boolean; order: BankTransferOrder | null; orders: BankTransferOrder[]; draft: BankTransferDraft;
  onDraftChange: (draft: BankTransferDraft) => void; onOrderChange: (order: BankTransferOrder | null) => void; onClose: () => void;
}) {
  const tr = (en: string, cn: string) => isChinese ? cn : en;
  const dialog = useDialog(onClose);
  const [details, setDetails] = useState<BankTransferDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reload, setReload] = useState(0);
  const [feedback, setFeedback] = useState<"copied" | "failed" | "shared" | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setLoadError(false); setDetails(null);
    void fetch("/api/bankTransferDetails", { signal: controller.signal, cache: "no-store" })
      .then(async response => {
        if (!response.ok) throw Error("Bank details unavailable");
        const data = await response.json();
        if (![data.accountName, data.accountNumber, data.bankName].every(value => typeof value === "string" && value.trim())) throw Error("Invalid bank details");
        if (!controller.signal.aborted) setDetails(data);
      })
      .catch(() => { if (!controller.signal.aborted) setLoadError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reload]);
  useEffect(() => { setFeedback(null); }, [draft, order]);
  const message = details ? bankTransferMessage(details, draft, order) : "";
  const edit = (changes: Partial<BankTransferDraft>) => onDraftChange({ ...draft, ...changes });
  const copy = async () => {
    if (!message || busy) return;
    setBusy(true); setFeedback(null);
    try { await navigator.clipboard.writeText(message); setFeedback("copied"); }
    catch { setFeedback("failed"); }
    finally { setBusy(false); }
  };
  const share = async () => {
    if (!message || busy) return;
    setBusy(true); setFeedback(null);
    try {
      await navigator.share({ title: draft.language === "zh" ? "银行转账信息" : "Bank transfer details", text: message });
      setFeedback("shared");
    } catch (error) { if (!(error instanceof Error && error.name === "AbortError")) setFeedback("failed"); }
    finally { setBusy(false); }
  };
  return <PortalToApp><div className="bankTransferScrim" onClick={onClose}>
    <div className="bankTransferDialog" ref={dialog} role="dialog" aria-modal="true" aria-labelledby="bank-transfer-title" onClick={event => event.stopPropagation()}>
      <header className="bankTransferHead">
        <div><Landmark size={20} aria-hidden="true" /><h2 id="bank-transfer-title">{tr("Bank transfer instructions", "银行转账信息")}</h2></div>
        <button type="button" aria-label={tr("Close bank transfer instructions", "关闭银行转账信息")} onClick={onClose}><X size={20} /></button>
      </header>
      <div className="bankTransferBody">
        <label>{tr("Order (optional)", "订单（可选）")}
          <select disabled={busy} value={order?.recordId || order?.orderId || ""} onChange={event => onOrderChange(orders.find(item => (item.recordId || item.orderId) === event.target.value) || null)}>
            <option value="">{tr("General bank details", "通用收款信息")}</option>
            {orders.map(item => <option key={item.recordId || item.orderId} value={item.recordId || item.orderId}>{[item.clientName, item.productName, item.orderId].filter(Boolean).join(" · ")}</option>)}
          </select>
        </label>
        <div className="bankTransferFields">
          <label>{tr("Message language", "信息语言")}<select disabled={busy} value={draft.language} onChange={event => edit({ language: event.target.value as "en" | "zh" })}><option value="zh">中文</option><option value="en">English</option></select></label>
          <label>{tr("Transfer reference", "转账备注")}<input disabled={busy} value={draft.reference} maxLength={120} onChange={event => edit({ reference: event.target.value })} placeholder={tr("Customer name or order number", "客户姓名或订单编号")} /></label>
        </div>
        <label>{tr("Remark (optional)", "补充说明（可选）")}<textarea disabled={busy} rows={3} maxLength={1000} value={draft.remark} onChange={event => edit({ remark: event.target.value })} placeholder={tr("Add a note for this customer before sharing", "分享前，可填写给这位客户的说明")} /></label>
        {loading && <p role="status">{tr("Loading bank details…", "正在加载银行信息…")}</p>}
        {loadError && <div className="bankTransferError" role="alert">{tr("Bank details could not be loaded.", "银行信息加载失败。")} <button type="button" onClick={() => setReload(value => value + 1)}>{tr("Retry", "重试")}</button></div>}
        {details && <label>{tr("Message preview", "信息预览")}<textarea className="bankTransferPreview" rows={12} readOnly value={message} /></label>}
      </div>
      <footer className="bankTransferFoot">
        {feedback && <p role={feedback === "failed" ? "alert" : "status"}>{feedback === "copied" ? tr("Copied. Ready to paste into WeChat or email.", "已复制，可粘贴到微信或邮件。") : feedback === "shared" ? tr("Share completed.", "已完成分享。") : tr("Could not copy or share. You can select and copy the preview text.", "复制或分享失败，可选中预览文字后手动复制。")}</p>}
        <div><button className="bankTransferCopy" type="button" disabled={!message || busy} onClick={() => void copy()}><Copy size={16} />{tr("Copy message", "复制信息")}</button>
        {typeof navigator.share === "function" && <button type="button" disabled={!message || busy} onClick={() => void share()}><Share2 size={16} />{tr("Share", "分享")}</button>}</div>
      </footer>
    </div>
  </div></PortalToApp>;
}
