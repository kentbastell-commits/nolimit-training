import { useCallback, useEffect, useState } from "react";
import { CalendarDays, ArrowUpRight, Check, CreditCard, Pencil, Users, X, UserRound, ShieldCheck, Tag, RefreshCw } from "lucide-react";
import type { Client, Coach, ProductOrder, Subscription, Team, Program } from "./appCore";
import { coachKey, primaryCoachValue, resolveCoach } from "./coachAssignment";
import { athleteOrders, latestPayment, paidOrders, paymentDateInput, profileDate, profileDraft, profilePayload, subscriptionDraft, type ProfileDraft, type ProfilePayload } from "./clientProfile";
import { clientTags, DEFAULT_TAG_COLOR, tagStyle, TAG_PALETTE } from "./clientIdentity";
import { useDialog } from "./useDialog";
import "./ClientProfilePanel.css";

type Props = {
  accountClient: Client; allCoaches: Coach[]; teams: Team[]; programs: Program[]; accountSubscription?: Subscription | null; paceZh?: boolean;
  setAccountClientId: (id: string) => void; openAthleteCalendar: (client: Client) => void;
  openProfileTraining: (client: Client) => void; openProfileOrders: (client: Client) => void;
  saveProfile: (payload: ProfilePayload) => Promise<void>; reloadProfileSubscriptions: () => Promise<unknown>;
  saveProfileTeam: (team: Team, members: string[], positions: Record<string, string>) => Promise<void>;
  initialEditing?: boolean;
  tagOptions?: string[];
  subscriptionState?: "loading" | "ready" | "error";
  registerClose?: (handler: (() => boolean) | null) => void;
};
type Tab = "overview" | "coaching" | "payments" | "groups";
const money = (amount: string | number, currency = "CNY") => {
  if (amount === "" || !Number.isFinite(Number(amount))) return "—";
  try { return new Intl.NumberFormat("en", { style: "currency", currency: currency || "CNY", maximumFractionDigits: 2 }).format(Number(amount) || 0); }
  catch { return `${currency} ${amount}`; }
};

export default function ClientProfilePanel({ accountClient: client, allCoaches: coaches, teams, programs, accountSubscription: subscription, paceZh: zh = false, initialEditing = false, subscriptionState = "ready", tagOptions = [],
  setAccountClientId, openAthleteCalendar, openProfileTraining, openProfileOrders, saveProfile, reloadProfileSubscriptions, saveProfileTeam, registerClose }: Props) {
  const tr = (en: string, cn: string) => zh ? cn : en;
  const [tab, setTab] = useState<Tab>("overview");
  const [editDraft, setDraft] = useState(() => profileDraft(client, coaches));
  const [editing, setEditing] = useState(initialEditing);
  const draft = editing ? editDraft : profileDraft(client, coaches);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pendingAction, setPendingAction] = useState<null | (() => void)>(null);
  const [orders, setOrders] = useState<ProductOrder[]>([]);
  const [paymentState, setPaymentState] = useState<"loading" | "ready" | "error">("loading");
  const [reload, setReload] = useState(0);
  const [paymentEdit, setPaymentEdit] = useState<{ order: ProductOrder; date: string } | null>(null);
  const [subEditing, setSubEditing] = useState(false);
  const [sub, setSub] = useState(() => subscriptionDraft(subscription));
  const [subSaving, setSubSaving] = useState(false);
  const [savedSubId, setSavedSubId] = useState("");
  const [teamBusy, setTeamBusy] = useState("");
  const [positions, setPositions] = useState<Record<string, string>>({});
  const [newTag, setNewTag] = useState("");
  const [newTagColor, setNewTagColor] = useState(DEFAULT_TAG_COLOR);
  const dirty = editing && JSON.stringify(draft) !== JSON.stringify(profileDraft(client, coaches));
  const subDirty = subEditing && JSON.stringify(sub) !== JSON.stringify(subscriptionDraft(subscription));
  const paymentDirty = Boolean(paymentEdit && paymentEdit.date !== paymentDateInput(paymentEdit.order.paidAt));
  const busy = saving || subSaving || Boolean(teamBusy);
  const request = useCallback((action: () => void) => {
    if (busy) return;
    if (dirty || subDirty || paymentDirty) setPendingAction(() => action); else action();
  }, [busy, dirty, subDirty, paymentDirty]);
  const close = useCallback(() => request(() => setAccountClientId("")), [request, setAccountClientId]);
  const dialog = useDialog(close);
  useEffect(() => {
    registerClose?.(() => { close(); return !(busy || dirty || subDirty || paymentDirty); });
    return () => registerClose?.(null);
  }, [registerClose, busy, dirty, subDirty, paymentDirty, close]);
  const selectTab = (value: Tab) => {
    setTab(value); setError("");
    const scroll = dialog.current?.querySelector(".cpScroll");
    if (scroll) scroll.scrollTop = 0;
  };
  const clientId = client.id, clientCode = client.clientCode;
  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/productOrders?clientCode=${encodeURIComponent(clientCode || clientId)}`, { signal: controller.signal })
      .then(async res => { const data = await res.json(); if (!res.ok || !Array.isArray(data.orders)) throw new Error("Unavailable"); return data.orders; })
      .then(data => { if (!controller.signal.aborted) { setOrders(athleteOrders({ id: clientId, clientCode }, data)); setPaymentState("ready"); } })
      .catch(() => { if (!controller.signal.aborted) setPaymentState("error"); });
    return () => controller.abort();
  }, [clientId, clientCode, reload]);

  const update = <K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) => { setDraft(d => ({ ...d, [key]: value })); setNotice(""); setError(""); };
  const coachName = (value?: string) => resolveCoach(value, coaches)?.name || value || tr("Unassigned", "待分配");
  const latest = latestPayment(orders);
  const undated = paidOrders(orders).filter(o => !o.paidAt).length;
  const tabs = [
    { key: "overview" as const, name: tr("Overview", "概览"), Icon: UserRound },
    { key: "coaching" as const, name: tr("Coaching & access", "教练与服务"), Icon: ShieldCheck },
    { key: "payments" as const, name: tr("Payments", "付款"), Icon: CreditCard },
    { key: "groups" as const, name: tr("Teams & tags", "团队与标签"), Icon: Tag },
  ];
  const field = (key: keyof ProfileDraft, label: string, options?: string[], type = "text") => {
    const value = String(draft[key] || ""), id = `cp-${key}`;
    return <div className="cpField" key={key}><label htmlFor={id}>{label}</label>{editing ? options ?
      <select id={id} value={value} disabled={saving} onChange={e => update(key, e.target.value as never)}><option value="">{tr("Not set", "未设置")}</option>{Array.from(new Set([...options, ...(value ? [value] : [])])).map(v => <option key={v} value={v}>{v}</option>)}</select>
      : <input id={id} type={type} value={value} disabled={saving} onChange={e => update(key, e.target.value as never)} />
      : <p id={id} className={!value ? "cpEmptyValue" : ""}>{(type === "date" ? profileDate(value, zh) : value) || tr("Not set", "未设置")}</p>}</div>;
  };
  const coachField = (key: "primaryCoachId" | "secondaryCoachId", label: string) => {
    const value = draft[key], available = coaches.filter(c => c.status !== "Inactive" || coachKey(c) === value);
    return <div className="cpField"><label htmlFor={`cp-${key}`}>{label}</label>{editing ? <select id={`cp-${key}`} disabled={saving} value={value} onChange={e => {
      update(key, e.target.value); if (key === "primaryCoachId" && e.target.value === draft.secondaryCoachId) update("secondaryCoachId", "");
    }}><option value="">{key === "primaryCoachId" ? tr("Unassigned", "待分配") : tr("None", "无")}</option>{value && !available.some(c => coachKey(c) === value) && <option value={value}>{value}</option>}{available.map(c => <option key={coachKey(c)} value={coachKey(c)} disabled={key === "secondaryCoachId" && coachKey(c) === draft.primaryCoachId}>{c.name}{c.status === "Inactive" ? tr(" (inactive)", "（停用）") : ""}</option>)}</select> : <p>{value ? coachName(value) : key === "primaryCoachId" ? tr("Unassigned", "待分配") : tr("None", "无")}</p>}</div>;
  };
  const save = async () => {
    setError(""); setSaving(true);
    try { await saveProfile(profilePayload(client, draft, coaches)); setEditing(false); setNotice(tr("Profile saved", "资料已保存")); }
    catch (e) { setError(e instanceof Error ? e.message : tr("Could not save. Your changes are still here.", "保存失败，您的修改已保留。")); }
    finally { setSaving(false); }
  };
  const saveSub = async () => {
    if (!sub.price || !Number.isFinite(Number(sub.price)) || Number(sub.price) < 0) { setError(tr("Enter a valid subscription price.", "请输入有效的订阅价格。")); return; }
    if (sub.startDate && sub.nextBillingDate && sub.nextBillingDate < sub.startDate) { setError(tr("Next billing must be on or after the start date.", "下次付款日期不能早于开始日期。")); return; }
    setSubSaving(true); setError("");
    try {
      const res = await fetch("/api/upsertSubscription", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...sub, recordId: subscription?.id || savedSubId || undefined, clientRecordId: client.id, coach: primaryCoachValue(client) ? coachName(primaryCoachValue(client)) : "" }) });
      const data = await res.json(); if (!res.ok || !data.success) throw new Error(data.error || tr("Could not save subscription.", "订阅保存失败。"));
      setSavedSubId(data.recordId || subscription?.id || savedSubId);
      await reloadProfileSubscriptions(); setSubEditing(false); setNotice(tr("Subscription saved", "订阅已保存"));
    } catch (e) { setError(e instanceof Error ? e.message : tr("Could not save subscription.", "订阅保存失败。")); }
    finally { setSubSaving(false); }
  };
  const savePayment = async () => {
    if (!paymentEdit) return;
    setSaving(true); setError("");
    try {
      const paidAt = paymentEdit.date ? `${paymentEdit.date}T12:00:00+08:00` : "";
      const res = await fetch("/api/updateProductOrder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recordId: paymentEdit.order.recordId, paidAt }) });
      const data = await res.json(); if (!res.ok || !data.success) throw new Error(data.error || tr("Could not save payment date.", "付款日期保存失败。"));
      setOrders(orders.map(o => o.recordId === paymentEdit.order.recordId ? { ...o, paidAt } : o)); setPaymentEdit(null); setNotice(tr("Payment date saved", "付款日期已保存"));
    } catch (e) { setError(e instanceof Error ? e.message : tr("Could not save payment date.", "付款日期保存失败。")); }
    finally { setSaving(false); }
  };
  const saveTeam = async (team: Team, members: string[], nextPositions: Record<string, string>) => {
    setTeamBusy(team.id); setError("");
    try { await saveProfileTeam(team, members, nextPositions); setNotice(tr("Team saved", "团队已保存")); }
    catch (e) { setError(e instanceof Error ? e.message : tr("Could not save team.", "团队保存失败。")); setPositions(d => { const next = { ...d }; delete next[team.id]; return next; }); }
    finally { setTeamBusy(""); }
  };
  const addTag = () => {
    const value = newTag.trim();
    if (!value) return;
    if (value.length > 100) { setError(tr("Keep tag names to 100 characters or fewer.", "标签名称请勿超过100个字符。")); return; }
    update("tags", clientTags({ tags: [...draft.tags, value] }));
    update("tagColors", { ...draft.tagColors, [value]: draft.tagColors[value] || newTagColor });
    setNewTag("");
  };
  const subField = (key: keyof typeof sub, label: string, options?: string[], type = "text") => {
    const id = `cp-sub-${key}`;
    return <div className="cpField"><label htmlFor={id}>{label}</label>{options ? <select id={id} value={String(sub[key])} onChange={e => setSub(d => ({ ...d, [key]: e.target.value }))} disabled={subSaving}>{Array.from(new Set([...options, String(sub[key])])).map(v => <option key={v}>{v}</option>)}</select> : <input id={id} type={type} value={String(sub[key])} disabled={subSaving} onChange={e => setSub(d => ({ ...d, [key]: e.target.value }))} />}</div>;
  };
  return <div className="cpScrim" onMouseDown={e => { if (e.target === e.currentTarget) close(); }}><div className="cpPanel" ref={dialog} role="dialog" aria-modal="true" aria-labelledby="cp-profile-title">
    <header className="cpHeader"><div className="cpIdentity"><div className="cpAvatar" aria-hidden="true">{client.initials}</div><div><span className="cpEyebrow">{tr("Athlete profile", "运动员资料")} <span> / {client.clientCode}</span></span><h2 id="cp-profile-title">{client.name}</h2>{client.coachAlias && <p className="cpAlias">{client.coachAlias} <span>{tr("Coach only", "仅教练可见")}</span></p>}<div className="cpIdentityMeta"><span className={`cpStatus ${/^active$/i.test(client.status) ? "active" : ""}`}>{client.status || "Active"}</span><span>{client.clientType || tr("Client type not set", "未设置客户类型")}</span></div></div></div><button type="button" className="cpIconButton" onClick={close} disabled={busy} aria-label={tr("Close profile", "关闭资料")}><X size={20} /></button></header>
    <div className="cpActionBar"><button type="button" onClick={() => request(() => openAthleteCalendar(client))}><CalendarDays size={16} />{tr("Calendar", "日历")}</button><button type="button" onClick={() => request(() => openProfileTraining(client))}><ArrowUpRight size={16} />{tr("Training overview", "训练概览")}</button><button type="button" className="cpEditButton" disabled={busy || editing} onClick={() => { setDraft(profileDraft(client, coaches)); setEditing(true); setNotice(""); }}><Pencil size={15} />{editing ? tr("Editing profile", "编辑资料中") : tr("Edit profile", "编辑资料")}</button></div>
    {pendingAction && <div className="cpDiscard" role="alert"><span>{tr("You have unsaved changes. Discard them?", "有未保存的修改，是否放弃？")}</span><button onClick={() => setPendingAction(null)}>{tr("Keep editing", "继续编辑")}</button><button onClick={() => { const action = pendingAction; setPendingAction(null); action(); }}>{tr("Discard changes", "放弃修改")}</button></div>}
    <div className="cpLayout"><nav className="cpTabs" aria-label={tr("Profile sections", "资料分类")}>{tabs.map(({ key, name, Icon }) => <button type="button" key={key} aria-current={tab === key ? "page" : undefined} onClick={() => selectTab(key)}><Icon size={17} />{name}</button>)}<p>{tr("One place for the details behind their training.", "训练背后的重要信息，一目了然。")}</p></nav><div className="cpScroll">
      <div className="cpSummary"><div><span>{tr("Primary coach", "主教练")}</span><strong>{coachName(primaryCoachValue(client))}</strong><button type="button" className="cpAssignLink" disabled={busy} onClick={() => { if (!editing) { setDraft(profileDraft(client, coaches)); setEditing(true); } selectTab("coaching"); }}>{tr("Assign coaches", "分配教练")}</button>{client.secondaryCoach && <small>{tr("With", "辅助教练")} {coachName(client.secondaryCoach)}</small>}</div><div><span>{undated ? tr("Last dated payment", "最近有日期的付款") : tr("Last payment", "最近付款")}</span><strong>{paymentState === "loading" ? tr("Loading…", "加载中…") : paymentState === "error" ? tr("Unavailable", "暂不可用") : latest ? profileDate(latest.paidAt, zh) : paidOrders(orders).length ? tr("Date not recorded", "未记录日期") : tr("No payment recorded", "暂无付款记录")}</strong>{latest && paymentState === "ready" && <small>{money(latest.amount, latest.currency)}</small>}</div><div><span>{tr("Next billing", "下次付款")}</span><strong>{subscriptionState === "loading" ? tr("Loading...", "\u52a0\u8f7d\u4e2d") : subscriptionState === "error" ? tr("Unavailable", "\u6682\u4e0d\u53ef\u7528") : profileDate(subscription?.nextBillingDate, zh)}</strong><small>{subscriptionState === "ready" ? subscription?.plan || tr("No subscription", "暂无订阅"): ""}</small></div></div>
      {tab === "overview" && <>
        <section className="cpSection cpPrivateIdentity"><div className="cpSectionHead"><div><h3>{tr("Coach alias", "教练端别名")}</h3><p>{tr("A familiar name for your coaching team. Searchable in Clients and the athlete switcher. Never shown in the client portal.", "方便教练团队识别和搜索的称呼，可在客户名单和运动员切换中查找，客户端不会显示。")}</p></div><ShieldCheck size={19} /></div>
          <div className="cpField"><label htmlFor="cp-coachAlias">{tr("Coach alias", "教练端别名")}</label>{editing ? <input id="cp-coachAlias" value={draft.coachAlias} maxLength={80} disabled={saving} onChange={e => update("coachAlias", e.target.value)} placeholder={tr("e.g. Jason, William, or a familiar nickname", "例如英文名或便于记忆的昵称")} /> : <p className={!draft.coachAlias ? "cpEmptyValue" : ""}>{draft.coachAlias || tr("No alias yet", "尚未设置别名")}</p>}</div>
        </section>
        <section className="cpSection"><div className="cpSectionHead"><div><h3>{tr("Personal details", "基本信息")}</h3><p>{tr("Contact information and preferences.", "联系方式与偏好。")}</p></div><UserRound size={19} /></div><div className="cpFieldGrid">{field("name", tr("Name", "姓名"))}{field("phone", tr("Phone / WeChat", "电话 / 微信"), undefined, "tel")}{field("email", tr("Email", "邮箱"), undefined, "email")}{field("languagePreference", tr("Language", "语言"), ["English", "Chinese", "中文"])}{field("startDate", tr("Client since", "加入日期"), undefined, "date")}{field("source", tr("How they joined", "来源"), ["Mini program", "Coach Invite", "Referral", "Manual Entry", "Store", "Pay link"])}</div></section>
        <section className="cpSection"><div className="cpSectionHead"><div><h3>{tr("Coaching at a glance", "教练与服务概览")}</h3><p>{tr("Ownership, service, and onboarding.", "负责教练、服务类型与入门状态。")}</p></div><button type="button" onClick={() => selectTab("coaching")}>{tr("View details", "查看详情")} <ArrowUpRight size={14} /></button></div><div className="cpFieldGrid">{field("clientType", tr("Client type", "客户类型"), ["Online Coaching", "In-Person Training", "Digital Program", "Hybrid", "Team Athlete"])}{field("packageType", tr("Roster status", "名单状态"), ["Active", "Paused", "Archived"])}{field("intakeStatus", tr("Intake", "入门问卷"), ["Not Sent", "Sent", "Submitted", "Reviewed", "Received", "Not Needed"])}{field("paymentStatus", tr("Account payment status", "账户付款状态"), ["Unpaid", "Pending", "Paid", "Failed", "Refunded"])}</div></section>
        <section className="cpSection"><div className="cpSectionHead"><div><h3>{tr("Coach notes", "教练备注")}</h3><p>{tr("Training context, goals, and things to remember.", "训练背景、目标及需要注意的事项。")}</p></div></div>{editing ? <textarea aria-label={tr("Coach notes", "教练备注")} value={draft.notes} disabled={saving} onChange={e => update("notes", e.target.value)} placeholder={tr("Add context for the coaching team…", "记录教练团队需要了解的信息…")} /> : <p className={`cpNotes${client.notes ? "" : " cpEmptyValue"}`}>{client.notes || tr("No notes yet.", "暂无备注。")}</p>}</section>
      </>}
      {tab === "coaching" && <>
        <section className="cpSection"><div className="cpSectionHead"><div><h3>{tr("Coaching team", "教练团队")}</h3><p>{tr("Choose who leads and who supports this athlete.", "指定主教练与辅助教练。")}</p></div><Users size={19} /></div><div className="cpFieldGrid">{coachField("primaryCoachId", tr("Primary coach", "主教练"))}{coachField("secondaryCoachId", tr("Supporting coach", "辅助教练"))}{field("clientType", tr("Client type", "客户类型"), ["Online Coaching", "In-Person Training", "Digital Program", "Hybrid", "Team Athlete"])}{field("packageName", tr("Package", "服务套餐"))}</div></section>
        <section className="cpSection"><div className="cpSectionHead"><div><h3>{tr("Service & access", "服务与访问权限")}</h3><p>{tr("Account access is separate from payment history.", "账户访问权限与付款记录分别管理。")}</p></div></div><div className="cpFieldGrid">{field("subscriptionStatus", tr("Service status", "服务状态"), ["Active", "Trial", "Paused", "Cancelled", "Expired"])}{field("packageType", tr("Roster status", "名单状态"), ["Active", "Paused", "Archived"])}{field("accessStartDate", tr("Access starts", "访问开始"), undefined, "date")}{field("accessEndDate", tr("Access ends", "访问结束"), undefined, "date")}{field("intakeStatus", tr("Intake", "入门问卷"), ["Not Sent", "Sent", "Submitted", "Reviewed", "Received", "Not Needed"])}
          <div className="cpField"><label htmlFor="cp-purchased-program">{tr("Purchased program", "已购计划")}</label>{editing ? <select id="cp-purchased-program" value={draft.purchasedProgramId} onChange={e => update("purchasedProgramId", e.target.value)}><option value="">{tr("None", "无")}</option>{draft.purchasedProgramId && !programs.some(p => p.programId === draft.purchasedProgramId) && <option value={draft.purchasedProgramId}>{draft.purchasedProgramId}</option>}{programs.map(p => <option key={p.programId} value={p.programId}>{zh ? p.programNameCn || p.programName : p.programName}</option>)}</select> : <p>{programs.find(p => p.programId === client.purchasedProgramId)?.programName || client.purchasedProgramId || tr("None", "无")}</p>}</div></div></section>
      </>}
      {tab === "payments" && <>
        <section className="cpSection"><div className="cpSectionHead"><div><h3>{tr("Subscription", "订阅")}</h3><p>{tr("Plan, price, and renewal schedule.", "套餐、价格与续费安排。")}</p></div><button type="button" disabled={subEditing || busy || subscriptionState !== "ready"} onClick={() => { setSub(subscriptionDraft(subscription)); setSubEditing(true); }}><Pencil size={14} />{subscription ? tr("Edit subscription", "编辑订阅") : tr("Add subscription", "添加订阅")}</button></div>
          {subscriptionState === "loading" && <p role="status">{tr("Loading subscription...", "\u6b63\u5728\u52a0\u8f7d\u8ba2\u9605")}</p>}
          {subscriptionState === "error" && <div className="cpLoadError" role="alert">{tr("Subscription details could not be loaded.", "\u8ba2\u9605\u4fe1\u606f\u52a0\u8f7d\u5931\u8d25") }<button type="button" onClick={() => void reloadProfileSubscriptions().catch(() => {})}>{tr("Retry", "\u91cd\u8bd5")}</button></div>}
          {subscriptionState === "ready" && (subEditing ? <><div className="cpFieldGrid">{subField("plan", tr("Plan", "套餐"), ["Online Coaching", "In-Person Coaching", "Hybrid", "Custom"])}{subField("status", tr("Subscription status", "订阅状态"), ["Active", "Trial", "Past Due", "Paused", "Cancelled"])}{subField("price", tr("Price", "价格"), undefined, "number")}{subField("currency", tr("Currency", "币种"), ["CNY", "USD"])}{subField("billingCycle", tr("Billing cycle", "付款周期"), ["1 Month", "3 Month", "6 Month", "1 Year"])}{subField("startDate", tr("Subscription starts", "订阅开始"), undefined, "date")}{subField("nextBillingDate", tr("Next billing date", "下次付款日期"), undefined, "date")}{subField("paymentId", tr("Payment reference", "付款参考号"))}</div><label className="cpCheckbox"><input type="checkbox" checked={sub.autoRenew} onChange={e => setSub(d => ({ ...d, autoRenew: e.target.checked }))} disabled={subSaving} />{tr("Auto-renew", "自动续费")}</label><div className="cpInlineActions"><button type="button" disabled={subSaving} onClick={() => { setSubEditing(false); setSub(subscriptionDraft(subscription)); }}>{tr("Cancel", "取消")}</button><button type="button" className="cpPrimary" onClick={() => void saveSub()} disabled={subSaving}>{subSaving ? tr("Saving…", "保存中…") : tr("Save subscription", "保存订阅")}</button></div></>
            : subscription ? <div className="cpFieldGrid"><div className="cpField"><span>{tr("Plan", "套餐")}</span><p>{subscription.plan}</p></div><div className="cpField"><span>{tr("Price / cycle", "价格 / 周期")}</span><p>{money(subscription.price, subscription.currency)} / {subscription.billingCycle}</p></div><div className="cpField"><span>{tr("Status", "状态")}</span><p>{subscription.status}</p></div><div className="cpField"><span>{tr("Next billing", "下次付款")}</span><p>{profileDate(subscription.nextBillingDate, zh)}</p></div></div> : <p className="cpEmptyValue">{tr("No subscription yet. Paid orders appear separately below.", "暂无订阅。已付款订单显示在下方。")}</p>)}</section>
        <section className="cpSection"><div className="cpSectionHead"><div><h3>{tr("Payment history", "付款记录")}</h3><p>{tr("Confirmed payments and orders for this athlete only.", "仅显示该运动员的付款与订单。")}</p></div><button type="button" onClick={() => request(() => openProfileOrders(client))}>{tr("Manage orders", "管理订单")}<ArrowUpRight size={14} /></button></div>
          {paymentState === "loading" ? <p role="status">{tr("Loading payments…", "正在加载付款记录…")}</p> : paymentState === "error" ? <div className="cpLoadError" role="alert">{tr("Payment history could not be loaded.", "付款记录加载失败。")}<button type="button" onClick={() => { setPaymentState("loading"); setReload(n => n + 1); }}><RefreshCw size={14} />{tr("Retry", "重试")}</button></div> : orders.length === 0 ? <div className="cpEmptyHistory"><CreditCard size={24} /><strong>{tr("No payments recorded", "暂无付款记录")}</strong><p>{tr("Orders linked to this athlete will appear here.", "与此运动员关联的订单将显示在这里。")}</p></div> : <>
            {undated > 0 && <p className="cpPaymentHint">{tr(`${undated} paid order(s) have no payment date. Add known dates below; order dates are shown separately.`, `${undated} 笔已付款订单未记录付款日期。可补充已知日期，订单日期单独显示。`)}</p>}
            <div className="cpPaymentList">{orders.map(order => <article key={order.recordId} className="cpPayment"><div className="cpPaymentTop"><div><strong>{order.productName || order.productType}</strong><small>{order.orderId} · {order.paymentProvider || tr("Method not recorded", "未记录付款方式")}</small></div><div><strong>{money(order.amount, order.currency)}</strong><span className={`cpPaymentStatus ${/^paid$/i.test(order.paymentStatus) ? "paid" : ""}`}>{order.paymentStatus}</span></div></div><div className="cpPaymentBottom"><span>{tr("Paid", "付款日期")}: {profileDate(order.paidAt, zh)} <small> · {tr("Order", "订单日期")}: {profileDate(order.purchasedAt, zh)}</small></span>{/^paid$/i.test(order.paymentStatus) && <button type="button" disabled={busy} onClick={() => request(() => setPaymentEdit({ order, date: paymentDateInput(order.paidAt) }))}>{order.paidAt ? tr("Edit date", "编辑日期") : tr("Add date", "添加日期")}</button>}</div>
              {paymentEdit?.order.recordId === order.recordId && <div className="cpPaymentEdit"><label htmlFor="cp-paid-date">{tr("Payment date", "付款日期")}<input id="cp-paid-date" type="date" value={paymentEdit.date} onChange={e => setPaymentEdit({ ...paymentEdit, date: e.target.value })} disabled={saving} /></label><button type="button" disabled={saving} onClick={() => setPaymentEdit(null)}>{tr("Cancel", "取消")}</button><button type="button" className="cpPrimary" disabled={saving} onClick={() => void savePayment()}>{saving ? tr("Saving…", "保存中…") : tr("Save date", "保存日期")}</button></div>}</article>)}</div></>}
        </section></>}
      {tab === "groups" && <>
        <section className="cpSection"><div className="cpSectionHead"><div><h3>{tr("Teams", "团队")}</h3><p>{tr("Membership and positions save when you change them.", "成员与位置修改后立即保存。")}</p></div><Users size={19} /></div>{teams.length === 0 ? <p className="cpEmptyValue">{tr("No teams created yet.", "暂无团队。")}</p> : <div className="cpTeamList">{teams.map(team => {
          const member = team.memberIds.includes(client.id);
          return <div className="cpTeamRow" key={team.id}><label className="cpCheckbox"><input type="checkbox" checked={member} disabled={busy} onChange={() => { const next = { ...team.positions }; if (member) delete next[client.id]; void saveTeam(team, member ? team.memberIds.filter(id => id !== client.id) : [...team.memberIds, client.id], next); }} />{team.name}</label>{member && <label className="cpPosition"><span>{tr("Position / group", "位置 / 分组")}</span><input value={positions[team.id] ?? team.positions[client.id] ?? ""} disabled={Boolean(teamBusy)} onChange={e => setPositions(d => ({ ...d, [team.id]: e.target.value }))} onBlur={e => { const value = e.target.value.trim(); if (value !== (team.positions[client.id] || "")) { const next = { ...team.positions }; if (value) next[client.id] = value; else delete next[client.id]; void saveTeam(team, team.memberIds, next); } }} /></label>}</div>;
        })}</div>}</section>
        <section className="cpSection"><div className="cpSectionHead"><div><h3>{tr("Tags", "标签")}</h3><p>{tr("Use one set of labels for sports, groups, and anything your team needs. Choose a colour for each tag.", "用统一标签管理运动项目、分组和团队需要的分类，并为每个标签选择颜色。")}</p></div></div>
          <div className="cpTagList">{draft.tags.length ? draft.tags.map(value => <div className="cpTagRow" key={value}><span className="cpTag" style={tagStyle(draft.tagColors[value])}>{value}</span>{editing && <><label className="cpTagColour"><span>{tr("Colour", "颜色")}</span><input type="color" aria-label={`${tr("Colour for", "标签颜色")} ${value}`} value={draft.tagColors[value] || DEFAULT_TAG_COLOR} disabled={saving} onChange={e => update("tagColors", { ...draft.tagColors, [value]: e.target.value })} /></label><button type="button" aria-label={`${tr("Remove", "移除")} ${value}`} disabled={saving} onClick={() => update("tags", draft.tags.filter(v => v !== value))}><X size={15} /></button></>}</div>) : <p className="cpEmptyValue">{tr("No tags yet", "暂无标签")}</p>}</div>
          {editing && <><div className="cpChipInput"><input aria-label={tr("New tag", "新标签")} list="cp-existing-tags" placeholder={tr("Choose or create a tag", "选择或创建标签")} maxLength={100} value={newTag} disabled={saving} onChange={e => setNewTag(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }} /><input className="cpNewTagColour" type="color" aria-label={tr("New tag colour", "新标签颜色")} value={newTagColor} disabled={saving} onChange={e => setNewTagColor(e.target.value)} /><button type="button" disabled={saving || !newTag.trim()} onClick={addTag}>{tr("Add", "添加")}</button></div><datalist id="cp-existing-tags">{tagOptions.filter(tag => !draft.tags.includes(tag)).map(tag => <option value={tag} key={tag} />)}</datalist><div className="cpTagPalette" aria-label={tr("Suggested tag colours", "推荐标签颜色")}>{TAG_PALETTE.map(color => <button type="button" key={color} aria-label={`${tr("Use colour", "使用颜色")} ${color}`} aria-pressed={newTagColor === color} disabled={saving} style={tagStyle(color)} onClick={() => setNewTagColor(color)}>{newTagColor === color && <Check size={14} />}</button>)}</div></>}
        </section>
      </>}
    </div></div>
    <footer className="cpFooter"><div aria-live="polite">{error ? <span className="cpError" role="alert">{error}</span> : notice ? <span className="cpSaved"><Check size={15} />{notice}</span> : editing ? tr("Changes apply to this athlete’s account.", "修改将应用于该运动员的账户。") : tr("Profile and coaching details", "运动员资料与教练信息")}</div><div>{editing ? <><button type="button" disabled={busy} onClick={() => request(() => { setDraft(profileDraft(client, coaches)); setEditing(false); setError(""); })}>{tr("Cancel editing", "取消编辑")}</button><button type="button" className="cpPrimary" disabled={busy || !dirty} onClick={() => void save()}>{saving ? tr("Saving…", "保存中…") : tr("Save changes", "保存修改")}</button></> : <button type="button" disabled={busy} onClick={close}>{tr("Done", "完成")}</button>}</div></footer>
  </div></div>;
}
