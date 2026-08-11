// Coach-console 收款码: type an amount + label, get a fixed-amount WeChat Pay
// QR to show or forward to the payer. The payment flips itself to Paid via
// the signed callback; this modal polls until then. Self-contained — the
// parent only passes language + a refresh callback.
import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import "./CollectPaymentModal.css";
import PortalToApp from "./PortalToApp";

type Phase =
  | { step: "form" }
  | { step: "creating" }
  | { step: "qr"; qrDataUrl: string; tradeNo: string; amountLabel: string; label: string }
  | { step: "paid"; amountLabel: string; label: string };

export default function CollectPaymentModal({
  isChinese,
  onClose,
  onCollected,
}: {
  isChinese: boolean;
  onClose: () => void;
  onCollected?: () => void;
}) {
  const tr = (en: string, zh: string) => (isChinese ? zh : en);
  const [amount, setAmount] = useState("");
  const [label, setLabel] = useState("");
  const [clientName, setClientName] = useState("");
  const [error, setError] = useState("");
  const [phase, setPhase] = useState<Phase>({ step: "form" });
  const pollRef = useRef<number | null>(null);
  const onCollectedRef = useRef(onCollected);
  onCollectedRef.current = onCollected;

  useEffect(() => {
    return () => {
      if (pollRef.current !== null) window.clearInterval(pollRef.current);
    };
  }, []);

  const startPolling = (tradeNo: string, amountLabel: string, doneLabel: string) => {
    const startedAt = Date.now();
    pollRef.current = window.setInterval(async () => {
      if (Date.now() - startedAt > 2 * 3600_000) {
        if (pollRef.current !== null) window.clearInterval(pollRef.current);
        return;
      }
      try {
        const res = await fetch(`/api/wxpayStatus?tradeNo=${encodeURIComponent(tradeNo)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data?.paid === true) {
          if (pollRef.current !== null) window.clearInterval(pollRef.current);
          setPhase({ step: "paid", amountLabel, label: doneLabel });
          onCollectedRef.current?.();
        }
      } catch {
        // Transient — keep polling.
      }
    }, 4_000);
  };

  const create = async () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 0.01) {
      setError(tr("Enter a valid amount", "请输入有效金额"));
      return;
    }
    if (!label.trim()) {
      setError(tr("Describe what this payment is for", "请填写收款事由"));
      return;
    }
    setError("");
    setPhase({ step: "creating" });
    try {
      const res = await fetch("/api/wxpayCollect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: value,
          label: label.trim(),
          clientName: clientName.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.codeUrl) {
        throw new Error(data?.error || tr("Could not create the payment", "创建收款失败"));
      }
      const qrDataUrl = await QRCode.toDataURL(String(data.codeUrl), {
        width: 260,
        margin: 1,
        color: { dark: "#111111", light: "#ffffff" },
      });
      const amountLabel = `¥${value.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}`;
      setPhase({ step: "qr", qrDataUrl, tradeNo: String(data.tradeNo), amountLabel, label: label.trim() });
      startPolling(String(data.tradeNo), amountLabel, label.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : tr("Could not create the payment", "创建收款失败"));
      setPhase({ step: "form" });
    }
  };

  return (
    <PortalToApp>
      <div className="collectPayScrim" role="dialog" aria-modal="true">
        <div className="collectPayModal">
          <header>
            <strong>{tr("Collect a payment", "收款码")}</strong>
            <button type="button" onClick={onClose} aria-label={tr("Close", "关闭")}>
              <X size={18} />
            </button>
          </header>

          {phase.step === "form" || phase.step === "creating" ? (
            <div className="collectPayBody">
              <p className="collectPayIntro">
                {tr(
                  "Fixed-amount WeChat Pay QR — the payment records itself as a Paid order automatically.",
                  "固定金额微信支付二维码——付款成功后自动记录为已付订单。",
                )}
              </p>
              <label>
                <span>{tr("Amount (CNY)", "金额（元）")}</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  placeholder="e.g. 1500"
                  onChange={(event) => setAmount(event.target.value)}
                />
              </label>
              <label>
                <span>{tr("What is it for?", "收款事由")}</span>
                <input
                  type="text"
                  value={label}
                  placeholder={tr("10 in-person sessions", "例：线下私教10次")}
                  onChange={(event) => setLabel(event.target.value)}
                />
              </label>
              <label>
                <span>{tr("Payer name (optional)", "付款人姓名（可选）")}</span>
                <input
                  type="text"
                  value={clientName}
                  onChange={(event) => setClientName(event.target.value)}
                />
              </label>
              {error ? <p className="collectPayError">{error}</p> : null}
              <button
                type="button"
                className="collectPayCta"
                disabled={phase.step === "creating"}
                onClick={() => void create()}
              >
                {phase.step === "creating"
                  ? tr("Creating…", "生成中…")
                  : tr("Generate payment QR", "生成收款二维码")}
              </button>
            </div>
          ) : null}

          {phase.step === "qr" ? (
            <div className="collectPayBody collectPayBody--qr">
              <span className="collectPayAmount">{phase.amountLabel}</span>
              <span className="collectPayLabel">{phase.label}</span>
              <img src={phase.qrDataUrl} alt={tr("WeChat Pay QR", "微信支付二维码")} />
              <p className="collectPayHint">
                {tr(
                  "Show this QR, or screenshot and send it — they scan with WeChat. Valid ~2 hours; this window turns green the moment they pay.",
                  "出示或截图发送此二维码，对方用微信扫码付款。有效期约2小时；付款成功后此窗口会自动变绿。",
                )}
              </p>
            </div>
          ) : null}

          {phase.step === "paid" ? (
            <div className="collectPayBody collectPayBody--paid" role="status">
              <span className="collectPayPaidMark" aria-hidden="true">✓</span>
              <strong>{tr("Payment received!", "收款成功！")}</strong>
              <span className="collectPayAmount">{phase.amountLabel}</span>
              <span className="collectPayLabel">{phase.label}</span>
              <p>{tr("Recorded as a Paid order.", "已自动记录为已付订单。")}</p>
              <button type="button" className="collectPayCta" onClick={onClose}>
                {tr("Done", "完成")}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </PortalToApp>
  );
}
