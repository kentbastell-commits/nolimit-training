// 1:1 Online Coaching purchase flow — the paid coaching signup.
// Commitment → Details (5-field qualifier, PRE-payment) → Payment (WeChat QR) →
// Onboarding (deep questionnaire, POST-payment, all optional) → Done.
// Self-contained: manages its own step machine + fields and posts to
// /api/coachingSignup. Client-facing (public bundle), bilingual EN / 中文.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import "./CoachingFlowPage.css";
import { reportClientEvent } from "./telemetry";

type Step = "commitment" | "qualifier" | "payment" | "onboarding" | "done";

type Tier = {
  id: string;
  months: number;
  label: string; // English, persisted — never localise this
  perMo: number;
  total: number;
  save: number;
  tag: "" | "popular" | "best";
};

const TIERS: Tier[] = [
  { id: "m1", months: 1, label: "1 Month", perMo: 2500, total: 2500, save: 0, tag: "" },
  { id: "m3", months: 3, label: "3 Months", perMo: 2100, total: 6300, save: 1200, tag: "" },
  { id: "m6", months: 6, label: "6 Months", perMo: 1900, total: 11400, save: 3600, tag: "popular" },
  { id: "m12", months: 12, label: "12 Months", perMo: 1700, total: 20400, save: 9600, tag: "best" },
];

const money = (n: number) => `CNY ${n.toLocaleString("en-US")}`;

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function genPaymentCode() {
  let out = "";
  for (let i = 0; i < 6; i++)
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return out;
}

export default function CoachingFlowPage() {
  const [lang, setLang] = useState<"en" | "zh">("en");
  const zh = lang === "zh";
  const t = (en: string, cn: string) => (zh ? cn : en);

  const [step, setStep] = useState<Step>("commitment");
  const [tierId, setTierId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [paymentCode, setPaymentCode] = useState("");
  const [orderId, setOrderId] = useState("");
  const [clientCode, setClientCode] = useState("");
  const [clientRecordId, setClientRecordId] = useState("");

  // qualifier (pre-payment)
  const [name, setName] = useState("");
  const [wechat, setWechat] = useState("");
  const [sport, setSport] = useState("");
  const [startDate, setStartDate] = useState("");
  const [goal, setGoal] = useState("");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [crossBorderAccepted, setCrossBorderAccepted] = useState(false);
  // onboarding (post-payment, all optional)
  const [trainingAge, setTrainingAge] = useState("");
  const [position, setPosition] = useState("");
  const [days, setDays] = useState("");
  const [compDate, setCompDate] = useState("");
  const [injuries, setInjuries] = useState("");
  const [equipment, setEquipment] = useState("");
  const [notes, setNotes] = useState("");
  const [healthConsent, setHealthConsent] = useState(false);

  const tier = useMemo(() => TIERS.find((x) => x.id === tierId) || null, [tierId]);
  const tierLabel = (x: Tier) =>
    zh ? `${x.months} 个月` : x.label;

  const qualifierValid =
    name.trim() &&
    wechat.trim() &&
    sport &&
    startDate &&
    goal.trim() &&
    privacyAccepted &&
    crossBorderAccepted;
  const healthConsentRequired = !!injuries.trim();

  useEffect(() => {
    if (step === "payment" && !paymentCode) {
      setPaymentCode(genPaymentCode());
      // Funnel: reached the payment step (fires once per session — the code
      // only generates on first entry).
      reportClientEvent("funnel", "coaching_payment_step_reached");
    }
  }, [step, paymentCode]);

  const fmtDate = (iso: string) => {
    if (!iso) return "—";
    const d = new Date(iso + "T00:00:00");
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(zh ? "zh-CN" : "en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const next = () => {
    if (step === "commitment" && tierId) setStep("qualifier");
    else if (step === "qualifier" && qualifierValid) setStep("payment");
  };
  const back = () => {
    if (step === "qualifier") setStep("commitment");
    else if (step === "payment") setStep("qualifier");
  };
  const goStep = (target: Step) => {
    const order: Step[] = ["commitment", "qualifier", "payment"];
    if (order.indexOf(target) <= order.indexOf(step as Step)) setStep(target);
  };

  const pay = async () => {
    if (!tier) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/coachingSignup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: "order",
          clientName: name.trim(),
          phone: wechat.trim(),
          sport,
          startDate,
          goal: goal.trim(),
          termLabel: tier.label,
          months: tier.months,
          amount: tier.total,
          currency: "CNY",
          paymentCode,
          languagePreference: zh ? "Chinese" : "English",
          privacyAccepted,
          crossBorderAccepted,
          consentVersion: "2026-07-12",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success)
        throw new Error(data.error || data.message || "Signup failed");
      reportClientEvent("funnel", "coaching_signup_submitted", {
        clientId: String(data.clientCode || ""),
      });
      setOrderId(data.orderId || data.clientCode || "");
      setClientCode(data.clientCode || "");
      setClientRecordId(data.clientRecordId || "");
      setStep("onboarding");
    } catch (err: unknown) {
      reportClientEvent("api_fail", "coaching_signup_failed", {
        message: err instanceof Error ? err.message : "Signup failed",
      });
      setError(
        t(
          "Something went wrong saving your signup. Please try again or contact us on WeChat.",
          "保存报名信息时出错，请重试或通过微信联系我们。"
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  const finish = async () => {
    setSubmitting(true);
    try {
      await fetch("/api/coachingSignup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: "intake",
          clientRecordId,
          clientCode,
          clientName: name.trim(),
          trainingAge,
          position,
          days,
          compDate,
          injuries,
          equipment,
          notes,
          healthConsent,
          consentVersion: "2026-07-12",
        }),
      });
    } catch {
      /* best-effort — payment + qualifier already captured */
    } finally {
      setSubmitting(false);
      setStep("done");
    }
  };

  const portalLink = clientCode
    ? `${window.location.origin}/?portal=client&client=${encodeURIComponent(clientCode)}`
    : "";

  // stepper
  const order: Step[] = ["commitment", "qualifier", "payment"];
  const curIdx =
    step === "onboarding" || step === "done" ? 3 : order.indexOf(step);
  const stepMeta = [
    { key: "commitment" as Step, num: "1", label: t("Commitment", "指导周期") },
    { key: "qualifier" as Step, num: "2", label: t("Details", "基本信息") },
    { key: "payment" as Step, num: "3", label: t("Payment", "支付") },
  ];

  const showStepper = step !== "done";
  const showFooter = step === "commitment" || step === "qualifier";
  const nextEnabled =
    step === "commitment" ? !!tierId : step === "qualifier" ? qualifierValid : true;

  const firstName = name.trim().split(/\s+/)[0] || t("athlete", "同学");

  return (
    <div className={`cfpWrap ${zh ? "zh" : "en"}`}>
      <div className="cfpShell">
        {/* top bar */}
        <div className="cfpTop">
          <div className="cfpBrand">
            <img className="cfpLogo" src="/nx_limit_training_white_on_black.png" alt="NX LIMIT Training" />
            <span className="cfpBadge">{t("1:1 COACHING", "一对一私教")}</span>
          </div>
          <div className="cfpTopRight">
            <span className="cfpTopHint">
              {t("Questions?", "有疑问？")}{" "}
              <span className="cfpGoldText">{t("Scan WeChat", "扫码问我们")}</span>
            </span>
            <button
              type="button"
              className="cfpLangToggle"
              onClick={() => setLang(zh ? "en" : "zh")}
            >
              {zh ? "EN" : "中文"}
            </button>
          </div>
        </div>

        {/* stepper */}
        {showStepper && (
          <div className="cfpStepper">
            {stepMeta.map((sm, i) => {
              const done = i < curIdx;
              const active = i === curIdx;
              const reachable = i <= curIdx;
              return (
                <div className="cfpStepGroup" key={sm.key}>
                  <div
                    className="cfpStep"
                    style={{ cursor: reachable ? "pointer" : "default" }}
                    onClick={() => reachable && goStep(sm.key)}
                  >
                    <span
                      className={`cfpDot${active ? " active" : done ? " done" : ""}`}
                    >
                      {sm.num}
                    </span>
                    <span
                      className={`cfpStepLabel${
                        active ? " active" : done ? " done" : ""
                      }`}
                    >
                      {sm.label}
                    </span>
                  </div>
                  {i < stepMeta.length - 1 && (
                    <span className={`cfpBar${i < curIdx ? " filled" : ""}`} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="cfpPad">
          {/* STEP 1 — COMMITMENT */}
          {step === "commitment" && (
            <div className="cfpStepBody" key="commitment">
              <span className="cfpEyebrow">
                {t("STEP 1 · YOUR COMMITMENT", "第一步 · 选择周期")}
              </span>
              <h1 className="cfpH1">
                {t("Choose your coaching term.", "选择你的指导周期。")}
              </h1>
              <p className="cfpLead">
                {t(
                  "Every athlete gets a fully personalised plan, weekly check-ins, and direct WeChat access to your coach. Longer terms unlock a better monthly rate.",
                  "每位学员都会得到完全个性化的训练计划、每周复盘，以及与教练直接微信沟通。周期越长，月均价格越优惠。"
                )}
              </p>

              <div className="cfpTiers">
                {TIERS.map((x) => {
                  const on = x.id === tierId;
                  return (
                    <div
                      key={x.id}
                      className={`cfpTier${on ? " on" : ""}`}
                      onClick={() => setTierId(x.id)}
                    >
                      {x.tag && (
                        <span className="cfpTierTag">
                          {x.tag === "popular"
                            ? t("Most popular", "最受欢迎")
                            : t("Best value", "最超值")}
                        </span>
                      )}
                      <span className="cfpTierLabel">{tierLabel(x)}</span>
                      <div className="cfpTierPrice">
                        <span>{money(x.perMo)}</span>
                        <small>/{t("mo", "月")}</small>
                      </div>
                      <span className="cfpTierTotal">
                        {money(x.total)} {t("total", "总计")}
                      </span>
                      {x.save > 0 && (
                        <span className="cfpTierSave">
                          {t("Save", "省")} {money(x.save)}
                        </span>
                      )}
                      <div className={`cfpTierCheck${on ? " on" : ""}`}>
                        <span className="cfpTierCheckDot">
                          {on && (
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5">
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                          )}
                        </span>
                        {on ? t("Selected", "已选择") : t("Select", "选择")}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="cfpPerks">
                {[
                  t("Weekly plan adjustments", "每周计划调整"),
                  t("Direct WeChat access", "微信直接沟通"),
                  t("Video technique review", "动作视频点评"),
                ].map((p) => (
                  <div className="cfpPerk" key={p}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1f7a43" strokeWidth="2.2">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    {p}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2 — QUALIFIER */}
          {step === "qualifier" && (
            <div className="cfpStepBody" key="qualifier">
              <span className="cfpEyebrow">
                {t("STEP 2 · QUICK DETAILS", "第二步 · 基本信息")}
              </span>
              <h1 className="cfpH1">{t("Let's get you started.", "开始吧。")}</h1>
              <p className="cfpLead">
                {t(
                  "Just the essentials so your coach knows who's coming. The full training questionnaire comes right after payment — no rush now.",
                  "先填最基本的信息，让教练知道你是谁。完整的训练问卷会在支付后填写，现在不着急。"
                )}
              </p>

              <div className="cfpForm">
                <div className="cfpTwo">
                  <label>
                    <span>{t("Your name", "你的姓名")}</span>
                    <input
                      type="text"
                      placeholder={t("First & last", "姓名")}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </label>
                  <label>
                    <span>{t("WeChat ID", "微信号")}</span>
                    <input
                      type="text"
                      placeholder={t("So your coach can add you", "方便教练添加你")}
                      value={wechat}
                      onChange={(e) => setWechat(e.target.value)}
                    />
                  </label>
                </div>
                <div className="cfpTwo">
                  <label>
                    <span>{t("Sport / discipline", "项目 / 方向")}</span>
                    <select value={sport} onChange={(e) => setSport(e.target.value)}>
                      <option value="">{t("Select…", "请选择…")}</option>
                      <option value="Rock Climbing">{t("Rock Climbing", "攀岩")}</option>
                      <option value="Hyrox">Hyrox</option>
                      <option value="Snowboard / Ski">{t("Snowboard / Ski", "单板 / 双板滑雪")}</option>
                      <option value="Running">{t("Running", "跑步")}</option>
                      <option value="Strength / Foundation">{t("Strength / Foundation", "力量 / 基础")}</option>
                      <option value="Other">{t("Other", "其他")}</option>
                    </select>
                  </label>
                  <label>
                    <span>{t("Preferred start date", "希望开始日期")}</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </label>
                </div>
                <label>
                  <span>{t("Primary goal", "主要目标")}</span>
                  <textarea
                    placeholder={t(
                      "What do you most want to achieve with coaching?",
                      "你最想通过指导达成什么？"
                    )}
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                  />
                </label>
                <div className="cfpConsentGroup">
                  <label className="cfpConsentRow">
                    <input
                      type="checkbox"
                      checked={privacyAccepted}
                      onChange={(e) => setPrivacyAccepted(e.target.checked)}
                    />
                    <span>
                      {t("I have read and agree to the ", "我已阅读并同意")}
                      <a href="/terms" target="_blank" rel="noreferrer">{t("Terms", "《服务条款》")}</a>
                      {t(", ", "、")}
                      <a href="/privacy" target="_blank" rel="noreferrer">{t("Privacy Policy", "《隐私政策》")}</a>
                      {t(", and ", "及")}
                      <a href="/refund" target="_blank" rel="noreferrer">{t("Refund Policy", "《退款政策》")}</a>
                      {t(".", "。")}
                    </span>
                  </label>
                  <label className="cfpConsentRow">
                    <input
                      type="checkbox"
                      checked={crossBorderAccepted}
                      onChange={(e) => setCrossBorderAccepted(e.target.checked)}
                    />
                    <span>
                      {t(
                        "I separately consent to necessary processing between mainland China and Hong Kong until the mainland migration is complete.",
                        "我单独同意：在完成中国内地迁移前，为提供服务所必需的信息可能在中国内地与香港之间处理。"
                      )}
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3 — PAYMENT */}
          {step === "payment" && tier && (
            <div className="cfpStepBody" key="payment">
              <span className="cfpEyebrow">{t("STEP 3 · PAYMENT", "第三步 · 支付")}</span>
              <h1 className="cfpH1">{t("Scan to start.", "扫码开始。")}</h1>
              <p className="cfpLead">
                {t(
                  "Pay with WeChat to lock your coaching slot. Right after, you'll complete a short training questionnaire so your coach can build block one.",
                  "微信支付以锁定你的指导名额。支付后你会填写一份简短的训练问卷，教练据此制定第一阶段计划。"
                )}
              </p>

              <div className="cfpPayGrid">
                <div className="cfpOrderCard">
                  <div className="cfpOrderTitle">{t("Order summary", "订单摘要")}</div>
                  <div className="cfpOrderRows">
                    <div><span>{t("Athlete", "学员")}</span><strong>{name.trim() || "—"}</strong></div>
                    <div><span>{t("Online Coaching", "线上指导")}</span><strong>{tierLabel(tier)}</strong></div>
                    <div><span>{t("Monthly rate", "月均价格")}</span><strong>{money(tier.perMo)}/{t("mo", "月")}</strong></div>
                    <div><span>{t("Sport", "项目")}</span><strong>{sport || "—"}</strong></div>
                    <div><span>{t("Start date", "开始日期")}</span><strong>{fmtDate(startDate)}</strong></div>
                    <div className="cfpOrderRule" />
                    <div className="cfpOrderTotal">
                      <span>{t("Total due", "应付总额")}</span>
                      <strong>{money(tier.total)}</strong>
                    </div>
                    {tier.save > 0 && (
                      <div className="cfpOrderSave">
                        {t("You saved", "已为你节省")} {money(tier.save)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="cfpQrCard">
                  <span className="cfpQrLabel">{t("WECHAT PAY", "微信支付")}</span>
                  <div className="cfpQrImg">
                    <img src="/wechat-pay-qr.jpg" alt={t("WeChat Pay QR", "微信支付二维码")} />
                  </div>
                  <span className="cfpQrHint">
                    {t("Open WeChat → Scan → confirm", "打开微信 → 扫一扫 → 确认")}{" "}
                    <strong>{money(tier.total)}</strong>
                  </span>
                  {paymentCode && (
                    <div className="cfpPayCode">
                      {t("Add this code to the transfer note:", "转账备注请填写：")}
                      <strong>{paymentCode}</strong>
                    </div>
                  )}
                </div>
              </div>

              {error && <p className="cfpError" role="alert">{error}</p>}
              <button className="cfpPrimary cfpPayBtn" onClick={pay} disabled={submitting}>
                {submitting
                  ? t("Confirming…", "确认中…")
                  : t("I've paid — continue to questionnaire", "我已支付 — 继续填写问卷")}
              </button>
              <p className="cfpPaySub">
                {t(
                  "Tapping this confirms you've paid via WeChat. Your coach verifies the code.",
                  "点击即表示你已通过微信完成支付。教练会核对备注码。"
                )}
              </p>
            </div>
          )}

          {/* STEP 4 — ONBOARDING */}
          {step === "onboarding" && (
            <div className="cfpStepBody" key="onboarding">
              <div className="cfpPaidPill">
                <span className="cfpPaidCheck">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </span>
                {t("Payment confirmed", "支付已确认")} · {orderId}
              </div>
              <h1 className="cfpH1">{t("Now let's build your plan.", "现在来打造你的计划。")}</h1>
              <p className="cfpLead">
                {t(
                  `You're in, ${firstName}. This questionnaire shapes your first block — be honest about injuries and availability so the plan stays realistic. It takes about two minutes.`,
                  `${firstName}，欢迎加入。这份问卷决定你的第一阶段计划——如实填写伤病和可训练时间，计划才更贴合你。大约需要两分钟。`
                )}
              </p>

              <div className="cfpSection">
                <div className="cfpSectionTitle">{t("Training background", "训练背景")}</div>
                <div className="cfpTwo">
                  <label>
                    <span>{t("Training age", "训练年限")}</span>
                    <select value={trainingAge} onChange={(e) => setTrainingAge(e.target.value)}>
                      <option value="">{t("Select…", "请选择…")}</option>
                      <option value="< 1 year">{t("Under 1 year", "不满 1 年")}</option>
                      <option value="1–3 years">{t("1–3 years", "1–3 年")}</option>
                      <option value="3–5 years">{t("3–5 years", "3–5 年")}</option>
                      <option value="5+ years">{t("5+ years", "5 年以上")}</option>
                    </select>
                  </label>
                  <label>
                    <span>
                      {t("Position / focus", "位置 / 专项")}{" "}
                      <em>{t("(optional)", "（选填）")}</em>
                    </span>
                    <input
                      type="text"
                      placeholder={t("e.g. Boulderer, forward, sprinter", "如：抱石、前锋、短跑")}
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                    />
                  </label>
                </div>
              </div>

              <div className="cfpSection">
                <div className="cfpSectionTitle">{t("Availability", "可训练时间")}</div>
                <div className="cfpTwo">
                  <label>
                    <span>{t("Days per week available", "每周可训练天数")}</span>
                    <select value={days} onChange={(e) => setDays(e.target.value)}>
                      <option value="">{t("Select…", "请选择…")}</option>
                      <option value="2 days">{t("2 days", "2 天")}</option>
                      <option value="3 days">{t("3 days", "3 天")}</option>
                      <option value="4 days">{t("4 days", "4 天")}</option>
                      <option value="5 days">{t("5 days", "5 天")}</option>
                      <option value="6+ days">{t("6+ days", "6 天以上")}</option>
                    </select>
                  </label>
                  <label>
                    <span>
                      {t("Next competition / event", "下一场比赛 / 活动")}{" "}
                      <em>{t("(optional)", "（选填）")}</em>
                    </span>
                    <input type="date" value={compDate} onChange={(e) => setCompDate(e.target.value)} />
                  </label>
                </div>
              </div>

              <div className="cfpSection">
                <div className="cfpSectionTitle">{t("Health & logistics", "健康与条件")}</div>
                <div className="cfpStack">
                  <label>
                    <span>
                      {t("Current injuries or limitations", "当前伤病或限制")}{" "}
                      <em>{t("(optional)", "（选填）")}</em>
                    </span>
                    <textarea
                      placeholder={t(
                        "Anything a coach should program around — or 'none'.",
                        "教练需要避开的问题——没有请填“无”。"
                      )}
                      value={injuries}
                      onChange={(e) => setInjuries(e.target.value)}
                    />
                  </label>
                  <label className="cfpConsentRow cfpHealthConsent">
                    <input
                      type="checkbox"
                      checked={healthConsent}
                      onChange={(e) => setHealthConsent(e.target.checked)}
                    />
                    <span>
                      {t(
                        "I separately consent to NX LIMIT Training processing the injury and health information I provide for safe, personalised coaching. I understand this is not medical care.",
                        "我单独同意 NX LIMIT Training 为安全、个性化地提供训练指导而处理我主动提供的伤病与健康信息。我理解本服务不属于医疗服务。"
                      )}
                    </span>
                  </label>
                  <label>
                    <span>{t("Equipment / gym access", "器械 / 场地条件")}</span>
                    <select value={equipment} onChange={(e) => setEquipment(e.target.value)}>
                      <option value="">{t("Select…", "请选择…")}</option>
                      <option value="Full gym">{t("Full commercial gym", "商业健身房")}</option>
                      <option value="Home rack + weights">{t("Home rack + weights", "家用力量架 + 杠铃")}</option>
                      <option value="Minimal / bodyweight">{t("Minimal / bodyweight", "极简 / 自重")}</option>
                      <option value="Climbing wall / board">{t("Climbing wall / board access", "攀岩馆 / 指力板")}</option>
                    </select>
                  </label>
                  <label>
                    <span>
                      {t("Anything else your coach should know", "还有什么想让教练知道的")}{" "}
                      <em>{t("(optional)", "（选填）")}</em>
                    </span>
                    <textarea
                      placeholder={t(
                        "Schedule quirks, past programs, preferences…",
                        "作息、过往计划、偏好…"
                      )}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </label>
                </div>
              </div>

              <div className="cfpOnboardActions">
                <button
                  className="cfpPrimary"
                  onClick={finish}
                  disabled={submitting || (healthConsentRequired && !healthConsent)}
                >
                  {submitting ? t("Submitting…", "提交中…") : t("Submit questionnaire", "提交问卷")}
                </button>
                <button
                  className="cfpGhost"
                  onClick={finish}
                  disabled={submitting || (healthConsentRequired && !healthConsent)}
                >
                  {t("I'll finish later", "稍后再填")}
                </button>
              </div>
            </div>
          )}

          {/* DONE */}
          {step === "done" && (
            <div className="cfpDone" key="done">
              <div className="cfpSeal">
                <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#1a1712" strokeWidth="3">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <h1 className="cfpH1 cfpDoneH1">{t("You're in the queue.", "你已进入队列。")}</h1>
              <p className="cfpDoneLead">
                {t("Payment received and your questionnaire is with your coach for the ", "支付已收到，你的问卷已发送给教练，指导周期为 ")}
                <strong>{tier ? tierLabel(tier) : ""}</strong>
                {t(" term. They'll add you on WeChat within 24 hours to start.", "。教练会在 24 小时内通过微信添加你，开始训练。")}
              </p>
              <div className="cfpDoneOrder">{t("Order", "订单")} {orderId}</div>

              <div className="cfpNextCard">
                <div className="cfpOrderTitle">{t("What happens next", "接下来会发生什么")}</div>
                <div className="cfpNextList">
                  {[
                    {
                      n: "01",
                      h: t("Coach reaches out on WeChat", "教练通过微信联系你"),
                      p: t("They review your questionnaire and confirm your start.", "教练查看你的问卷并确认开始时间。"),
                    },
                    {
                      n: "02",
                      h: t("Your first block is built", "为你搭建第一阶段计划"),
                      p: t("A personalised plan lands in your app, ready to schedule.", "个性化计划将出现在你的 App 中，随时可安排。"),
                    },
                    {
                      n: "03",
                      h: t("Weekly check-ins begin", "开始每周复盘"),
                      p: t("Log your sessions; your coach adjusts as you progress.", "记录你的训练；教练会根据进展持续调整。"),
                    },
                  ].map((s) => (
                    <div className="cfpNextItem" key={s.n}>
                      <span className="cfpNextNum">{s.n}</span>
                      <div>
                        <strong>{s.h}</strong>
                        <p>{s.p}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {portalLink && (
                <a className="cfpPrimary cfpDoneCta" href={portalLink}>
                  {t("Open my portal", "打开我的主页")}
                </a>
              )}
            </div>
          )}
        </div>

        {/* sticky footer */}
        {showFooter && (
          <div className="cfpFooter">
            <div className="cfpFooterInfo">
              <span className="cfpFooterCaption">
                {tier
                  ? `${tierLabel(tier)} · ${t("pay upfront", "一次性支付")}`
                  : t("Select a term to continue", "选择周期以继续")}
              </span>
              <span className="cfpFooterPrice">{tier ? money(tier.total) : "—"}</span>
            </div>
            <div className="cfpFooterActions">
              {step === "qualifier" && (
                <button className="cfpGhost" onClick={back}>
                  {t("Back", "返回")}
                </button>
              )}
              <button
                className="cfpPrimary"
                onClick={next}
                disabled={!nextEnabled}
              >
                {step === "commitment"
                  ? t("Continue to details", "继续填写信息")
                  : t("Continue to payment", "继续支付")}
              </button>
            </div>
          </div>
        )}
        <div className="cfpPolicyLinks">
          <a href="/privacy">{t("Privacy", "隐私政策")}</a>
          <a href="/terms">{t("Terms", "服务条款")}</a>
          <a href="/refund">{t("Refunds", "退款政策")}</a>
          <a href="/business">{t("Business", "经营者信息")}</a>
        </div>
      </div>
    </div>
  );
}
