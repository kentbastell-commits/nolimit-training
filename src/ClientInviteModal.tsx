// "Invite via WeChat" for one athlete (coach console).
//
// Optional first step: collect a payment. When an amount is entered, a pay
// link is created for THIS client and the invite code stays locked until the
// order is Paid (polled). With no amount the invite shows at once.
//
// The invite is the athlete's personal mini program scan code: whoever
// long-presses it in WeChat and taps "Continue with WeChat" gets that WeChat
// bound to this account — so a parent can forward the image to a child.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import PortalToApp from "./PortalToApp";
import "./ClientInviteModal.css";

type Props = {
  client: { clientCode: string; name: string };
  isChinese: boolean;
  onClose: () => void;
};

type Invite = { image: string; expiresAt: number };

export default function ClientInviteModal({ client, isChinese, onClose }: Props) {
  const t = (en: string, zh: string) => (isChinese ? zh : en);
  const [amount, setAmount] = useState("");
  const [label, setLabel] = useState(isChinese ? "1对1在线训练" : "1:1 Online Coaching");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [payLink, setPayLink] = useState<{ url: string; key: string } | null>(null);
  const [paid, setPaid] = useState(false);
  const [invite, setInvite] = useState<Invite | null>(null);
  const [copied, setCopied] = useState("");
  const pollRef = useRef<number | null>(null);

  const loadInvite = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/clientInvite?clientCode=${encodeURIComponent(client.clientCode)}`);
      const data = await res.json();
      if (!res.ok || !data.image) throw new Error(data.message || data.error || "invite failed");
      setInvite({ image: data.image, expiresAt: Number(data.expiresAt) || 0 });
    } catch (e: any) {
      setError(t("Could not create the invite code: ", "无法生成邀请码：") + String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  // No payment requested → the invite is available immediately.
  useEffect(() => {
    if (!payLink) void loadInvite();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Payment requested → poll the order; unlock the invite once Paid.
  useEffect(() => {
    if (!payLink || paid) return;
    const tick = async () => {
      try {
        const res = await fetch(`/api/payLink?key=${encodeURIComponent(payLink.key)}`);
        const data = await res.json();
        if (res.ok && data.paid) {
          setPaid(true);
          void loadInvite();
        }
      } catch {
        /* keep polling */
      }
    };
    pollRef.current = window.setInterval(tick, 5000);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payLink, paid]);

  const createPayLink = async () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError(t("Enter an amount in CNY.", "请输入金额（元）。"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/wxpayCollect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: value,
          label: label.trim() || "1:1 Online Coaching",
          clientName: client.name,
          clientCode: client.clientCode,
          productType: "Online Coaching",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.payLinkKey) throw new Error(data.message || data.error || "collect failed");
      setPayLink({ key: String(data.payLinkKey), url: `${window.location.origin}/pay/${data.payLinkKey}` });
      setInvite(null); // locked until paid
      setPaid(false);
    } catch (e: any) {
      setError(t("Could not create the pay link: ", "无法生成付款链接：") + String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      window.setTimeout(() => setCopied(""), 1800);
    } catch {
      window.prompt(t("Copy this:", "请复制："), text);
    }
  };

  const inviteLocked = Boolean(payLink) && !paid;

  return (
    <PortalToApp>
      <div className="clientInviteScrim" role="dialog" aria-modal="true" onClick={onClose}>
        <div className="clientInviteModal" onClick={(e) => e.stopPropagation()}>
          <header>
            <strong>
              {t("Invite via WeChat", "微信邀请")} · {client.name}
            </strong>
            <button type="button" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </header>

          <section className="clientInviteSection">
            <h4>{t("1. Collect payment first (optional)", "1. 先收款（可选）")}</h4>
            {payLink ? (
              <>
                <p className="clientInviteHint">
                  {paid
                    ? t("Paid. The invite below is unlocked.", "已付款，下方邀请码已解锁。")
                    : t(
                        "Send this link in WeChat. The invite unlocks automatically once it is paid.",
                        "把这个链接发到微信。付款成功后，邀请码会自动解锁。",
                      )}
                </p>
                <div className="clientInviteLinkRow">
                  <input readOnly value={payLink.url} onFocus={(e) => e.currentTarget.select()} />
                  <button type="button" onClick={() => void copy(payLink.url, "link")}>
                    {copied === "link" ? t("Copied", "已复制") : t("Copy link", "复制链接")}
                  </button>
                </div>
              </>
            ) : (
              <div className="clientInviteFields">
                <label>
                  <span>{t("Amount (CNY)", "金额（元）")}</span>
                  <input
                    inputMode="decimal"
                    placeholder={t("leave empty to skip", "留空则跳过收款")}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </label>
                <label>
                  <span>{t("Label", "项目")}</span>
                  <input value={label} onChange={(e) => setLabel(e.target.value)} />
                </label>
                <button
                  type="button"
                  className="clientInvitePrimary"
                  disabled={busy || !amount.trim()}
                  onClick={() => void createPayLink()}
                >
                  {busy ? "…" : t("Create pay link", "生成付款链接")}
                </button>
              </div>
            )}
          </section>

          <section className="clientInviteSection">
            <h4>{t("2. Invite code", "2. 邀请码")}</h4>
            {inviteLocked ? (
              <p className="clientInviteLocked">
                {t("Locked until the payment above is confirmed.", "待上方付款确认后解锁。")}
              </p>
            ) : invite ? (
              <>
                <img className="clientInviteImage" src={invite.image} alt="Invite code" />
                <p className="clientInviteHint">
                  {t(
                    "Send this image in WeChat. Whoever long-presses it and taps “Continue with WeChat” is signed in to this account — no phone number needed, so a parent can forward it to their child. It stops working once an account is bound, and expires in 30 days.",
                    "把这张图发到微信。对方长按识别并点击“微信一键登录”即可进入此账户，无需手机号，家长可转发给孩子。账户绑定后此码失效，30 天后过期。",
                  )}
                </p>
                <div className="clientInviteActions">
                  <a href={invite.image} download={`nxlimit-invite-${client.clientCode}.jpg`}>
                    {t("Save image", "保存图片")}
                  </a>
                  <button type="button" onClick={() => void loadInvite()} disabled={busy}>
                    {t("Refresh", "刷新")}
                  </button>
                </div>
              </>
            ) : (
              <p className="clientInviteHint">{busy ? t("Creating…", "生成中…") : ""}</p>
            )}
          </section>

          {error ? <p className="clientInviteError">{error}</p> : null}
        </div>
      </div>
    </PortalToApp>
  );
}
