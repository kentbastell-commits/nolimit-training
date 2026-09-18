// Public payment page for a coach-collected amount: trainnolimit.cn/pay/<signed order key>.
// Sent by WeChat message instead of a QR screenshot (which WeChat refuses to
// pay from). Inside WeChat it opens the native payment sheet via WxPayPanel's
// JSAPI path; in any other browser WxPayPanel falls back to a scannable QR.
// After (or before) paying, the payer can request a 发票 by filling in the
// invoice title; issuing stays manual until an e-invoice provider exists.
import { useEffect, useState } from "react";
import WxPayPanel, { useWxpayEnabled } from "./WxPayPanel";
import "./PayLinkPage.css";

type LinkInfo = {
  orderId: string;
  amount: number;
  currency: string;
  label: string;
  clientName: string;
  paid: boolean;
  needsIdentity: boolean;
  clientCode: string;
  /** Data URL of the athlete's personal invite scan code, once paid. */
  inviteImage?: string;
  fapiao: { title: string; taxId: string; email: string; requestedAt: string } | null;
};

const IS_WECHAT = /MicroMessenger/i.test(navigator.userAgent);

function detectLang(): "en" | "zh" {
  const q = new URLSearchParams(window.location.search).get("lang");
  if (q === "en" || q === "zh") return q;
  return /^zh/i.test(navigator.language || "") ? "zh" : "en";
}

export default function PayLinkPage() {
  const key = (window.location.pathname.match(/^\/pay\/([A-Za-z0-9._-]{8,200})/) || [])[1] || "";
  const [lang, setLang] = useState<"en" | "zh">(detectLang);
  const tr = (en: string, zh: string) => (lang === "zh" ? zh : en);
  const [info, setInfo] = useState<LinkInfo | null>(null);
  const [error, setError] = useState("");
  const [paid, setPaid] = useState(false);
  const wxpayEnabled = useWxpayEnabled();

  const [title, setTitle] = useState("");
  const [taxId, setTaxId] = useState("");
  const [email, setEmail] = useState("");
  const [fapiaoBusy, setFapiaoBusy] = useState(false);
  const [fapiaoError, setFapiaoError] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [identBusy, setIdentBusy] = useState(false);
  const [identError, setIdentError] = useState("");

  // A stranger from a social-media link has no account yet: name + phone
  // create (or find) it and attach this order BEFORE the payment sheet, so
  // nothing needs linking by hand afterwards.
  const submitIdentity = async () => {
    if (!info || identBusy) return;
    setIdentBusy(true);
    setIdentError("");
    try {
      const res = await fetch("/api/payLink", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, action: "identify", name, phone }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.clientCode) {
        throw new Error(
          data?.error === "phone invalid"
            ? tr("Please enter a valid mobile number", "请输入有效的手机号")
            : tr("Could not save your details", "信息保存失败，请重试"),
        );
      }
      setInfo({ ...info, needsIdentity: false, clientCode: String(data.clientCode), clientName: name });
    } catch (err) {
      setIdentError(err instanceof Error ? err.message : tr("Could not save your details", "信息保存失败，请重试"));
    } finally {
      setIdentBusy(false);
    }
  };

  useEffect(() => {
    document.title = lang === "zh" ? "NX LIMIT 付款" : "NX LIMIT Payment";
  }, [lang]);

  useEffect(() => {
    if (!key) {
      setError("missing");
      return;
    }
    let cancelled = false;
    fetch(`/api/payLink?key=${encodeURIComponent(key)}`)
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok || !data?.orderId) {
          setError(res.status === 404 ? "unknown" : "failed");
          return;
        }
        setInfo(data as LinkInfo);
        setPaid(Boolean(data.paid));
        if (data.needsIdentity && data.clientName && data.clientName !== data.label) setName(String(data.clientName));
        if (data.fapiao) {
          setTitle(data.fapiao.title || "");
          setTaxId(data.fapiao.taxId || "");
          setEmail(data.fapiao.email || "");
        }
      })
      .catch(() => {
        if (!cancelled) setError("failed");
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  const submitFapiao = async () => {
    if (!info || fapiaoBusy) return;
    setFapiaoBusy(true);
    setFapiaoError("");
    try {
      const res = await fetch("/api/payLink", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, title, taxId, email }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.fapiao) {
        throw new Error(
          data?.error === "taxId must be 15-20 letters/digits"
            ? tr("Tax ID should be 15-20 letters or digits", "税号应为 15-20 位字母或数字")
            : data?.error === "email invalid"
              ? tr("That email doesn't look right", "邮箱格式不正确")
              : tr("Could not save the invoice request", "发票信息保存失败"),
        );
      }
      setInfo({ ...info, fapiao: data.fapiao });
    } catch (err) {
      setFapiaoError(err instanceof Error ? err.message : tr("Could not save the invoice request", "发票信息保存失败"));
    } finally {
      setFapiaoBusy(false);
    }
  };

  const amountLabel = info
    ? `¥${info.amount.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "";

  return (
    <main className="payLink">
      <header className="payLinkHeader">
        <span className="payLinkBrand">NX LIMIT</span>
        <button
          type="button"
          className="payLinkLang"
          onClick={() => setLang(lang === "zh" ? "en" : "zh")}
          aria-label={tr("切换到中文", "Switch to English")}
        >
          {lang === "zh" ? "EN" : "中文"}
        </button>
      </header>

      {error ? (
        <section className="payLinkCard payLinkCard--error" role="alert">
          <strong>
            {error === "unknown"
              ? tr("This payment link isn't valid", "此付款链接无效")
              : error === "missing"
                ? tr("No payment link here", "缺少付款链接")
                : tr("Couldn't load this payment", "付款信息加载失败")}
          </strong>
          <p>{tr("Ask your coach to send a fresh link.", "请让教练重新发送链接。")}</p>
        </section>
      ) : !info ? (
        <section className="payLinkCard payLinkCard--loading" aria-busy="true">
          {tr("Loading…", "加载中…")}
        </section>
      ) : (
        <>
          <section className="payLinkCard">
            <span className="payLinkEyebrow">{tr("Payment request", "付款请求")}</span>
            <h1 className="payLinkAmount">{amountLabel}</h1>
            <p className="payLinkLabel">{info.label}</p>
            {info.clientName && info.clientName !== info.label ? (
              <p className="payLinkFor">{tr("Athlete", "训练者")}: {info.clientName}</p>
            ) : null}

            {paid ? (
              <>
                <div className="payLinkPaid" role="status">
                  <span aria-hidden="true">✓</span>
                  <strong>{tr("Paid. Thank you!", "已付款，谢谢！")}</strong>
                </div>
                {info.clientCode ? (
                  <div className="payLinkAccount">
                    <strong>{tr("Your training account is ready", "你的训练账户已开通")}</strong>
                    <p className="payLinkHint">
                      {tr(
                        "Open the NX LIMIT mini program in WeChat and log in with this phone number, or use the web portal:",
                        "在微信搜索 NX LIMIT 小程序并用此手机号登录，或使用网页版：",
                      )}
                    </p>
                    <a className="payLinkCta payLinkCta--link" href={`/?portal=client&client=${encodeURIComponent(info.clientCode)}`}>
                      {tr("Open my portal", "打开我的训练页面")}
                    </a>
                    <div className="payLinkAppCode">
                      <img
                        src={info.inviteImage || "/mini-program-code.jpg"}
                        alt="NX LIMIT mini program code"
                      />
                      <p className="payLinkHint">
                        {info.inviteImage
                          ? tr(
                              "This code is yours. Long-press it in WeChat to open the NX LIMIT mini program, tap “Continue with WeChat”, and you are signed in. Training for someone else? Save the image and send it to their phone — whoever opens it gets this account.",
                              "这是你的专属码。在微信里长按识别，打开 NX LIMIT 小程序，点击“微信一键登录”即可进入账户。如果是为家人购买，把图片保存并发给对方手机，谁打开谁登录。",
                            )
                          : tr(
                              "Long-press the code to open the NX LIMIT mini program in WeChat, then tap “Continue with WeChat” — your account is matched by this phone number.",
                              "长按识别小程序码，打开 NX LIMIT 小程序，点击“微信一键登录”即可进入你的账户（按此手机号匹配）。",
                            )}
                      </p>
                    </div>
                  </div>
                ) : null}
              </>
            ) : info.needsIdentity ? (
              <form
                className="payLinkForm"
                onSubmit={(event) => {
                  event.preventDefault();
                  void submitIdentity();
                }}
              >
                <p className="payLinkHint">
                  {tr(
                    "First, who will be training? Enter the athlete's name and the phone number on the WeChat they will use — paying for your child? Enter the child's details, then pay with your own WeChat.",
                    "请先填写训练者信息：训练者姓名和其微信绑定的手机号。为孩子购买？请填写孩子的信息，再用你自己的微信付款。",
                  )}
                </p>
                <label>
                  <span>{tr("Your name", "姓名")} *</span>
                  <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required autoComplete="name" />
                </label>
                <label>
                  <span>{tr("Mobile number", "手机号")} *</span>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} required inputMode="tel" autoComplete="tel" placeholder="138 0000 0000" />
                </label>
                {identError ? <p className="payLinkError" role="alert">{identError}</p> : null}
                <button type="submit" className="payLinkCta" disabled={identBusy || name.trim().length < 2 || phone.replace(/[\s-]/g, "").length < 7}>
                  {identBusy ? tr("Saving…", "保存中…") : tr("Continue to payment", "下一步：付款")}
                </button>
              </form>
            ) : !wxpayEnabled ? (
              <p className="payLinkHint">{tr("WeChat Pay is not available right now.", "微信支付暂不可用。")}</p>
            ) : (
              <>
                <WxPayPanel orderId={info.orderId} lang={lang} variant="collect" onPaid={() => setPaid(true)} />
                {!IS_WECHAT ? (
                  <p className="payLinkHint">
                    {tr(
                      "Scan the code with WeChat, or open this link inside WeChat to pay without scanning.",
                      "用微信扫码付款，或在微信内打开此链接直接付款。",
                    )}
                  </p>
                ) : null}
              </>
            )}
          </section>

          <section className="payLinkCard payLinkFapiao">
            <h2>{tr("Need a fapiao (发票)?", "需要发票？")}</h2>
            {info.fapiao ? (
              <div className="payLinkFapiaoDone" role="status">
                <strong>{tr("Invoice requested", "已登记发票信息")}</strong>
                <p>
                  {info.fapiao.title}
                  {info.fapiao.taxId ? ` · ${info.fapiao.taxId}` : ""}
                  {info.fapiao.email ? ` · ${info.fapiao.email}` : ""}
                </p>
                <p className="payLinkHint">
                  {tr("We'll issue it after payment and send it to the email above (or via your coach).", "付款后我们将开具发票并发送到上述邮箱（或由教练转交）。")}
                </p>
                <button type="button" className="payLinkText" onClick={() => setInfo({ ...info, fapiao: null })}>
                  {tr("Change details", "修改信息")}
                </button>
              </div>
            ) : (
              <form
                className="payLinkForm"
                onSubmit={(event) => {
                  event.preventDefault();
                  void submitFapiao();
                }}
              >
                <label>
                  <span>{tr("Invoice title (抬头)", "发票抬头")} *</span>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={tr("Company name or your name", "公司名称或个人姓名")}
                    maxLength={120}
                    required
                  />
                </label>
                <label>
                  <span>{tr("Tax ID (税号)", "纳税人识别号")}</span>
                  <input
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    placeholder={tr("Companies only", "企业需填写")}
                    maxLength={20}
                    autoCapitalize="characters"
                  />
                </label>
                <label>
                  <span>{tr("Email for the invoice", "接收发票的邮箱")}</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    maxLength={120}
                  />
                </label>
                {fapiaoError ? <p className="payLinkError" role="alert">{fapiaoError}</p> : null}
                <button type="submit" className="payLinkCta" disabled={fapiaoBusy || title.trim().length < 2}>
                  {fapiaoBusy ? tr("Saving…", "保存中…") : tr("Request invoice", "登记发票信息")}
                </button>
              </form>
            )}
          </section>

          <footer className="payLinkFooter">
            {tr("Payments are processed by WeChat Pay to 广州跃燃体育.", "由微信支付处理，收款方：广州跃燃体育。")}
          </footer>
        </>
      )}
    </main>
  );
}
