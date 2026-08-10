import {
  Banknote,
  BarChart3,
  Bug,
  ClipboardList,
  FileText,
  FlaskConical,
  Handshake,
  Lightbulb,
  Megaphone,
  MessageSquareMore,
  UserPlus,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { FieldError } from "./components";
import { opsText } from "./copy";
import type {
  CompanyOpsLanguage,
  OpsOnboardingCandidate,
  QuickActionKey,
} from "./types";

type FormValue = string | boolean;
type FormState = Record<string, FormValue>;
type SelectOption = readonly [value: string, english: string, chinese: string];

const platformOptions: readonly SelectOption[] = [
  ["xiaohongshu", "Xiaohongshu", "小红书"],
  ["douyin", "Douyin", "抖音"],
  ["wechat official account", "WeChat Official Account", "微信公众号"],
  ["channels", "WeChat Channels", "微信视频号"],
  ["website", "Website", "网站"],
  ["multi-platform", "Multiple platforms", "多平台"],
];

const contentPillarOptions: readonly SelectOption[] = [
  ["education", "Professional education", "专业教育"],
  ["founder", "Founder & brand", "创始人／品牌"],
  ["community", "Client & community", "客户／社群"],
  ["product", "Product & offer", "产品／服务"],
  ["partner", "Partner & KOL", "伙伴／KOL"],
  ["campaign", "Campaign", "活动"],
];

const contentObjectiveOptions: readonly SelectOption[] = [
  ["reach", "Reach", "触达"],
  ["educate", "Educate", "教育"],
  ["engage", "Engage", "互动"],
  ["leads", "Generate leads", "获取线索"],
  ["convert", "Convert", "转化"],
  ["retain", "Retain", "留存"],
];

const leadSourceOptions: readonly SelectOption[] = [
  ...platformOptions.filter(([value]) => value !== "multi-platform"),
  ["referral", "Referral", "转介绍"],
  ["partner", "KOL / partner", "KOL／伙伴"],
  ["offline", "Offline", "线下"],
  ["organic", "Organic", "自然流量"],
  ["other", "Other", "其他"],
];

const productOptions: readonly SelectOption[] = [
  ["digital", "Digital program", "数字计划"],
  ["online coaching", "Online 1:1 coaching", "线上 1 对 1"],
  ["in-person", "In-person coaching", "线下训练"],
  ["team", "Team / institution", "团队／机构"],
  ["unsure", "Not sure yet", "未定"],
];

const campaignProductOptions = productOptions.filter(
  ([value]) => value !== "team" && value !== "unsure",
);
const channelOptions: readonly SelectOption[] = [
  ...platformOptions.filter(([value]) => value !== "multi-platform"),
  ["offline", "Offline", "线下"],
  ["kol", "KOL", "KOL"],
  ["other", "Other", "其他"],
];
const audienceOptions: readonly SelectOption[] = [
  ["climbers", "Climbers", "攀岩者"],
  ["youth parents", "Youth parents", "青少年家长"],
  ["general fitness", "General fitness", "大众健身"],
  ["coaches", "Coaches", "教练"],
  ["institutions", "Institutions / teams", "机构／团队"],
  ["existing clients", "Existing clients", "现有客户"],
];
const fitOptions: readonly SelectOption[] = [
  ["high", "High", "高"],
  ["medium", "Medium", "中"],
  ["low", "Low", "低"],
  ["tbd", "To assess", "待评估"],
];
const supportTypeOptions: readonly SelectOption[] = [
  ["bug", "Bug", "故障"],
  ["data", "Data issue", "数据问题"],
  ["access", "Account / access", "账号／权限"],
  ["performance", "Performance", "性能"],
  ["ux", "Usability", "易用性"],
  ["feature request", "Feature request", "功能建议"],
  ["other", "Other", "其他"],
];
const expenseCategoryOptions: readonly SelectOption[] = [
  ["transport", "Transport", "交通"],
  ["meals", "Meals", "餐饮"],
  ["equipment", "Equipment", "设备"],
  ["marketing", "Marketing spend", "营销投放"],
  ["venue", "Venue", "场地"],
  ["software", "Software subscription", "软件订阅"],
  ["other", "Other", "其他"],
];

const actionIcons = {
  content: Lightbulb,
  lead: UserPlus,
  partner: Handshake,
  campaign: Megaphone,
  experiment: FlaskConical,
  platform_metrics: BarChart3,
  support_issue: Bug,
  onboarding_setup: UserPlus,
  compensation_dispute: Banknote,
  weekly_report: FileText,
  expense: Banknote,
  internal_request: ClipboardList,
  founder_decision: MessageSquareMore,
} satisfies Record<QuickActionKey, typeof Lightbulb>;

function localDate() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
}

function mondayDate() {
  const now = new Date();
  const offset = (now.getDay() + 6) % 7;
  now.setDate(now.getDate() - offset);
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
}

function initialState(action: QuickActionKey): FormState {
  if (action === "content") {
    return {
      workingTitle: "",
      platform: "",
      contentPillar: "",
      objective: "",
      plannedPublishDate: "",
    };
  }
  if (action === "lead") {
    return {
      name: "",
      contact: "",
      source: "",
      productInterest: "",
      nextAction: "",
    };
  }
  if (action === "partner") {
    return {
      name: "",
      platform: "",
      handle: "",
      audienceFit: "",
      proposedCollaboration: "",
      nextFollowUpAt: "",
    };
  }
  if (action === "campaign") {
    return {
      name: "",
      objective: "",
      targetAudience: "",
      offer: "",
      product: "",
      channels: "",
      budget: "",
      start: "",
      end: "",
    };
  }
  if (action === "experiment") {
    return {
      name: "",
      hypothesis: "",
      variable: "",
      channel: "",
      successMetric: "",
      baseline: "",
      target: "",
      start: "",
      end: "",
    };
  }
  if (action === "platform_metrics") {
    return {
      period: "",
      platform: "",
      startFollowers: "",
      endFollowers: "",
      posts: "",
      views: "",
      engagement: "",
      profileVisits: "",
      clicks: "",
      leads: "",
      revenue: "",
      learning: "",
    };
  }
  if (action === "support_issue") {
    return {
      title: "",
      severity: "",
      issueType: "",
      feature: "",
      deviceOs: "",
      description: "",
      reproductionSteps: "",
      affectedCount: "",
      workaround: "",
    };
  }
  if (action === "onboarding_setup") {
    return {
      newHireOpenId: "",
      newHireName: "",
      role: "",
      startDate: "",
    };
  }
  if (action === "internal_request") {
    return { title: "", requestType: "", details: "", neededBy: "" };
  }
  if (action === "compensation_dispute") return { reason: "" };
  if (action === "weekly_report") {
    return {
      reportingWeek: mondayDate(),
      completed: "",
      results: "",
      problems: "",
      learnings: "",
      decisionsNeeded: "",
      nextWeek: "",
    };
  }
  if (action === "expense") {
    return {
      category: "",
      amount: "",
      currency: "CNY",
      expenseDate: localDate(),
      businessPurpose: "",
      relatedProject: "",
      preapproved: false,
      priorApprovalReference: "",
      receiptUrl: "",
      receiptNote: "",
    };
  }
  return {
    title: "",
    category: "",
    context: "",
    neededBy: "",
  };
}

const requiredByAction: Record<QuickActionKey, string[]> = {
  content: [
    "workingTitle",
    "platform",
    "contentPillar",
    "objective",
    "plannedPublishDate",
  ],
  lead: ["name", "contact", "source", "productInterest", "nextAction"],
  partner: ["name", "platform", "audienceFit", "nextFollowUpAt"],
  campaign: [
    "name",
    "objective",
    "targetAudience",
    "offer",
    "product",
    "channels",
    "budget",
    "start",
    "end",
  ],
  experiment: [
    "name",
    "hypothesis",
    "variable",
    "channel",
    "successMetric",
    "baseline",
    "target",
    "start",
    "end",
  ],
  platform_metrics: [
    "period",
    "platform",
    "startFollowers",
    "endFollowers",
    "posts",
    "views",
    "engagement",
    "profileVisits",
    "clicks",
    "leads",
    "revenue",
    "learning",
  ],
  support_issue: [
    "title",
    "severity",
    "issueType",
    "feature",
    "deviceOs",
    "description",
    "reproductionSteps",
  ],
  onboarding_setup: ["newHireOpenId", "newHireName", "role", "startDate"],
  compensation_dispute: ["reason"],
  weekly_report: [
    "reportingWeek",
    "completed",
    "results",
    "problems",
    "learnings",
    "decisionsNeeded",
    "nextWeek",
  ],
  expense: [
    "category",
    "amount",
    "expenseDate",
    "businessPurpose",
    "receiptUrl",
  ],
  internal_request: ["title", "requestType", "details"],
  founder_decision: ["title", "category", "context", "neededBy"],
};

function actionCopy(action: QuickActionKey) {
  if (action === "content")
    return ["contentFormTitle", "contentFormIntro"] as const;
  if (action === "lead") return ["leadFormTitle", "leadFormIntro"] as const;
  if (action === "partner")
    return ["partnerFormTitle", "partnerFormIntro"] as const;
  if (action === "campaign")
    return ["campaignFormTitle", "campaignFormIntro"] as const;
  if (action === "experiment")
    return ["experimentFormTitle", "experimentFormIntro"] as const;
  if (action === "platform_metrics")
    return ["metricsFormTitle", "metricsFormIntro"] as const;
  if (action === "support_issue")
    return ["supportFormTitle", "supportFormIntro"] as const;
  if (action === "onboarding_setup")
    return ["onboardingFormTitle", "onboardingFormIntro"] as const;
  if (action === "compensation_dispute")
    return ["disputeFormTitle", "disputeFormIntro"] as const;
  if (action === "weekly_report")
    return ["reportFormTitle", "reportFormIntro"] as const;
  if (action === "expense")
    return ["expenseFormTitle", "expenseFormIntro"] as const;
  if (action === "internal_request")
    return ["requestFormTitle", "requestFormIntro"] as const;
  return ["decisionFormTitle", "decisionFormIntro"] as const;
}

export default function QuickActionDrawer({
  action,
  language,
  busy,
  error,
  onClose,
  onSubmit,
  onboardingCandidates = [],
}: {
  action: QuickActionKey;
  language: CompanyOpsLanguage;
  busy: boolean;
  error?: string;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => Promise<void> | void;
  onboardingCandidates?: OpsOnboardingCandidate[];
}) {
  const [values, setValues] = useState<FormState>(() => initialState(action));
  const [invalid, setInvalid] = useState<Set<string>>(new Set());
  const dialogRef = useRef<HTMLElement>(null);
  const [titleKey, introKey] = actionCopy(action);
  const Icon = actionIcons[action];

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    const frame = window.requestAnimationFrame(() => {
      dialogRef.current
        ?.querySelector<HTMLElement>("input, select, textarea, button")
        ?.focus();
    });
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.cancelAnimationFrame(frame);
    };
  }, [busy, onClose]);

  const set = (name: string, value: FormValue) => {
    setValues((current) => ({ ...current, [name]: value }));
    setInvalid((current) => {
      if (!current.has(name)) return current;
      const next = new Set(current);
      next.delete(name);
      return next;
    });
  };

  const chooseOnboardingCandidate = (openId: string) => {
    const candidate = onboardingCandidates.find(
      (item) => item.openId === openId,
    );
    setValues((current) => ({
      ...current,
      newHireOpenId: openId,
      newHireName: candidate?.name || "",
      role: candidate?.role || "",
      startDate: candidate?.startDate || "",
    }));
    setInvalid((current) => {
      const next = new Set(current);
      for (const key of ["newHireOpenId", "newHireName", "role", "startDate"]) {
        if (candidate || key === "startDate") next.delete(key);
      }
      return next;
    });
  };

  const required = useMemo(() => new Set(requiredByAction[action]), [action]);
  const validate = () => {
    const missing = new Set(
      [...required].filter((name) => {
        const value = values[name];
        return typeof value === "string" ? !value.trim() : value == null;
      }),
    );
    setInvalid(missing);
    if (missing.size) {
      window.requestAnimationFrame(() => {
        dialogRef.current
          ?.querySelector<HTMLElement>("[aria-invalid='true']")
          ?.focus();
      });
    }
    return missing.size === 0;
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!validate() || busy) return;
    void onSubmit(values);
  };

  const field = (
    name: string,
    label: string,
    input: ReactNode,
    className = "",
  ) => (
    <label className={className}>
      <span>
        {label}
        {required.has(name) ? <em aria-hidden="true">*</em> : null}
      </span>
      {input}
      {invalid.has(name) ? <FieldError language={language} /> : null}
    </label>
  );

  const input = (
    name: string,
    type = "text",
    placeholder = "",
  ) => (
    <input
      name={name}
      type={type}
      value={String(values[name] || "")}
      placeholder={placeholder}
      aria-invalid={invalid.has(name)}
      onChange={(event) => set(name, event.target.value)}
    />
  );

  const textarea = (name: string, rows = 4) => (
    <textarea
      name={name}
      rows={rows}
      value={String(values[name] || "")}
      aria-invalid={invalid.has(name)}
      onChange={(event) => set(name, event.target.value)}
    />
  );

  const selectInput = (
    name: string,
    options: readonly SelectOption[],
    placeholder = opsText(language, "selectOne"),
  ) => (
    <select
      name={name}
      value={String(values[name] || "")}
      aria-invalid={invalid.has(name)}
      onChange={(event) => set(name, event.target.value)}
    >
      <option value="">{placeholder}</option>
      {options.map(([value, english, chinese]) => (
        <option value={value} key={value}>
          {language === "zh" ? chinese : english}
        </option>
      ))}
    </select>
  );

  return (
    <div
      className="fopsDrawerScrim"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <aside
        className="fopsDrawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fops-drawer-title"
        ref={dialogRef}
      >
        <header className="fopsDrawerHeader">
          <span className="fopsDrawerIcon" aria-hidden="true">
            <Icon size={21} />
          </span>
          <div>
            <h2 id="fops-drawer-title">{opsText(language, titleKey)}</h2>
            <p>{opsText(language, introKey)}</p>
          </div>
          <button
            type="button"
            className="fopsIconButton"
            aria-label={opsText(language, "close")}
            onClick={onClose}
            disabled={busy}
          >
            <X size={20} />
          </button>
        </header>

        <form className="fopsDrawerForm" onSubmit={submit} noValidate>
          <div className="fopsFormGrid">
            {action === "content" ? (
              <>
                {field(
                  "workingTitle",
                  opsText(language, "workingTitle"),
                  input("workingTitle"),
                  "fopsFieldWide",
                )}
                {field(
                  "platform",
                  opsText(language, "platform"),
                  selectInput(
                    "platform",
                    platformOptions,
                    opsText(language, "choosePlatform"),
                  ),
                )}
                {field(
                  "plannedPublishDate",
                  opsText(language, "plannedPublishDate"),
                  input("plannedPublishDate", "date"),
                )}
                {field(
                  "contentPillar",
                  opsText(language, "contentPillar"),
                  selectInput("contentPillar", contentPillarOptions),
                )}
                {field(
                  "objective",
                  opsText(language, "objective"),
                  selectInput("objective", contentObjectiveOptions),
                )}
              </>
            ) : null}

            {action === "lead" ? (
              <>
                {field("name", opsText(language, "leadName"), input("name"))}
                {field("contact", opsText(language, "contact"), input("contact"))}
                {field(
                  "source",
                  opsText(language, "source"),
                  selectInput("source", leadSourceOptions),
                )}
                {field(
                  "productInterest",
                  opsText(language, "productInterest"),
                  selectInput("productInterest", productOptions),
                )}
                {field(
                  "nextAction",
                  opsText(language, "leadNextAction"),
                  textarea("nextAction", 3),
                  "fopsFieldWide",
                )}
                <p className="fopsPrivacyNote fopsFieldWide">
                  {opsText(language, "noHealthData")}
                </p>
              </>
            ) : null}

            {action === "partner" ? (
              <>
                {field(
                  "name",
                  opsText(language, "partnerName"),
                  input("name"),
                )}
                {field(
                  "platform",
                  opsText(language, "platform"),
                  selectInput("platform", platformOptions),
                )}
                {field("handle", opsText(language, "handle"), input("handle"))}
                {field(
                  "nextFollowUpAt",
                  opsText(language, "followUpDate"),
                  input("nextFollowUpAt", "date"),
                )}
                {field(
                  "audienceFit",
                  opsText(language, "audienceFit"),
                  selectInput("audienceFit", fitOptions),
                )}
                {field(
                  "proposedCollaboration",
                  opsText(language, "proposedCollaboration"),
                  textarea("proposedCollaboration", 3),
                  "fopsFieldWide",
                )}
              </>
            ) : null}

            {action === "campaign" ? (
              <>
                {field("name", opsText(language, "campaignName"), input("name"))}
                {field(
                  "product",
                  opsText(language, "product"),
                  selectInput("product", campaignProductOptions),
                )}
                {field(
                  "objective",
                  opsText(language, "objective"),
                  textarea("objective", 3),
                  "fopsFieldWide",
                )}
                {field(
                  "targetAudience",
                  opsText(language, "targetAudience"),
                  selectInput("targetAudience", audienceOptions),
                )}
                {field("offer", opsText(language, "offer"), input("offer"))}
                {field(
                  "channels",
                  opsText(language, "channels"),
                  selectInput("channels", channelOptions),
                )}
                {field("budget", opsText(language, "budget"), input("budget", "number"))}
                {field("start", opsText(language, "startDate"), input("start", "date"))}
                {field("end", opsText(language, "endDate"), input("end", "date"))}
              </>
            ) : null}

            {action === "experiment" ? (
              <>
                {field(
                  "name",
                  opsText(language, "experimentName"),
                  input("name"),
                  "fopsFieldWide",
                )}
                {field(
                  "hypothesis",
                  opsText(language, "hypothesis"),
                  textarea("hypothesis", 3),
                  "fopsFieldWide",
                )}
                {field("variable", opsText(language, "variable"), input("variable"))}
                {field(
                  "channel",
                  opsText(language, "channel"),
                  selectInput("channel", channelOptions),
                )}
                {field(
                  "successMetric",
                  opsText(language, "successMetric"),
                  input("successMetric"),
                )}
                {field("baseline", opsText(language, "baseline"), input("baseline"))}
                {field("target", opsText(language, "target"), input("target"))}
                {field("start", opsText(language, "startDate"), input("start", "date"))}
                {field("end", opsText(language, "endDate"), input("end", "date"))}
              </>
            ) : null}

            {action === "platform_metrics" ? (
              <>
                {field("period", opsText(language, "period"), input("period"))}
                {field(
                  "platform",
                  opsText(language, "platform"),
                  selectInput("platform", platformOptions),
                )}
                {(
                  [
                    ["startFollowers", "startFollowers"],
                    ["endFollowers", "endFollowers"],
                    ["posts", "posts"],
                    ["views", "views"],
                    ["engagement", "engagement"],
                    ["profileVisits", "profileVisits"],
                    ["clicks", "clicks"],
                    ["leads", "leads"],
                    ["revenue", "revenue"],
                  ] as const
                ).map(([name, key]) =>
                  field(name, opsText(language, key), input(name, "number")),
                )}
                {field(
                  "learning",
                  opsText(language, "learning"),
                  textarea("learning", 3),
                  "fopsFieldWide",
                )}
              </>
            ) : null}

            {action === "support_issue" ? (
              <>
                {field(
                  "title",
                  opsText(language, "issueTitle"),
                  input("title"),
                  "fopsFieldWide",
                )}
                {field(
                  "severity",
                  opsText(language, "severity"),
                  <select
                    name="severity"
                    value={String(values.severity)}
                    aria-invalid={invalid.has("severity")}
                    onChange={(event) => set("severity", event.target.value)}
                  >
                    <option value="">{opsText(language, "selectOne")}</option>
                    <option value="P0">P0</option>
                    <option value="P1">P1</option>
                    <option value="P2">P2</option>
                    <option value="P3">P3</option>
                  </select>,
                )}
                {field(
                  "issueType",
                  opsText(language, "issueType"),
                  selectInput("issueType", supportTypeOptions),
                )}
                {field("feature", opsText(language, "feature"), input("feature"))}
                {field("deviceOs", opsText(language, "deviceOs"), input("deviceOs"))}
                {field(
                  "affectedCount",
                  opsText(language, "affectedCount"),
                  input("affectedCount", "number"),
                )}
                {field(
                  "description",
                  opsText(language, "issueDescription"),
                  textarea("description", 4),
                  "fopsFieldWide",
                )}
                {field(
                  "reproductionSteps",
                  opsText(language, "reproductionSteps"),
                  textarea("reproductionSteps", 5),
                  "fopsFieldWide",
                )}
                {field(
                  "workaround",
                  opsText(language, "workaround"),
                  textarea("workaround", 3),
                  "fopsFieldWide",
                )}
                <p className="fopsPrivacyNote fopsFieldWide">
                  {opsText(language, "supportFormIntro")}
                </p>
              </>
            ) : null}

            {action === "onboarding_setup" ? (
              <>
                {onboardingCandidates.length
                  ? field(
                      "newHireOpenId",
                      opsText(language, "newHire"),
                      <select
                        name="newHireOpenId"
                        value={String(values.newHireOpenId)}
                        aria-invalid={invalid.has("newHireOpenId")}
                        onChange={(event) =>
                          chooseOnboardingCandidate(event.target.value)
                        }
                      >
                        <option value="">{opsText(language, "selectOne")}</option>
                        {onboardingCandidates.map((candidate) => (
                          <option value={candidate.openId} key={candidate.openId}>
                            {candidate.name}
                          </option>
                        ))}
                      </select>,
                      "fopsFieldWide",
                    )
                  : field(
                      "newHireOpenId",
                      opsText(language, "feishuOpenId"),
                      input("newHireOpenId", "text", "ou_…"),
                      "fopsFieldWide",
                    )}
                {field(
                  "newHireName",
                  opsText(language, "newHireName"),
                  <input
                    name="newHireName"
                    value={String(values.newHireName)}
                    readOnly={onboardingCandidates.length > 0}
                    aria-invalid={invalid.has("newHireName")}
                    onChange={(event) => set("newHireName", event.target.value)}
                  />,
                )}
                {field(
                  "role",
                  opsText(language, "onboardingRole"),
                  selectInput("role", [
                    ["品牌增长 Brand & Growth", "Brand & Growth", "品牌增长"],
                    ["教练 Coach", "Coach", "教练"],
                    ["运营 Operations", "Operations", "运营"],
                    ["行政 Admin", "Administration", "行政"],
                    ["其他 Other", "Other", "其他"],
                  ]),
                )}
                {field(
                  "startDate",
                  opsText(language, "employmentStartDate"),
                  input("startDate", "date"),
                )}
              </>
            ) : null}

            {action === "compensation_dispute" ? (
              <>
                {field(
                  "reason",
                  opsText(language, "disputeReason"),
                  textarea("reason", 6),
                  "fopsFieldWide",
                )}
              </>
            ) : null}

            {action === "weekly_report" ? (
              <>
                {field(
                  "reportingWeek",
                  opsText(language, "reportingWeek"),
                  input("reportingWeek", "date"),
                  "fopsFieldWide",
                )}
                {(
                  [
                    ["completed", "reportCompleted"],
                    ["results", "reportResults"],
                    ["problems", "reportProblems"],
                    ["learnings", "reportLearnings"],
                    ["decisionsNeeded", "reportDecisions"],
                    ["nextWeek", "reportNextWeek"],
                  ] as const
                ).map(([name, key]) =>
                  field(
                    name,
                    opsText(language, key),
                    textarea(name, 4),
                    "fopsFieldWide",
                  ),
                )}
              </>
            ) : null}

            {action === "expense" ? (
              <>
                {field(
                  "category",
                  opsText(language, "expenseCategory"),
                  selectInput("category", expenseCategoryOptions),
                )}
                {field("amount", opsText(language, "amount"), input("amount", "number"))}
                {field(
                  "currency",
                  opsText(language, "currency"),
                  <select
                    name="currency"
                    value={String(values.currency)}
                    onChange={(event) => set("currency", event.target.value)}
                  >
                    <option value="CNY">CNY</option>
                    <option value="THB">THB</option>
                    <option value="USD">USD</option>
                  </select>,
                )}
                {field(
                  "expenseDate",
                  opsText(language, "expenseDate"),
                  input("expenseDate", "date"),
                )}
                {field(
                  "businessPurpose",
                  opsText(language, "businessPurpose"),
                  textarea("businessPurpose", 3),
                  "fopsFieldWide",
                )}
                {field(
                  "relatedProject",
                  opsText(language, "relatedProject"),
                  input("relatedProject"),
                )}
                <label className="fopsCheckField">
                  <input
                    type="checkbox"
                    checked={Boolean(values.preapproved)}
                    onChange={(event) => set("preapproved", event.target.checked)}
                  />
                  <span>{opsText(language, "preapproved")}</span>
                </label>
                {field(
                  "priorApprovalReference",
                  opsText(language, "priorApprovalReference"),
                  input("priorApprovalReference"),
                )}
                {field(
                  "receiptUrl",
                  opsText(language, "receiptUrl"),
                  input(
                    "receiptUrl",
                    "url",
                    "https://example.feishu.cn/file/...",
                  ),
                  "fopsFieldWide",
                )}
                <p className="fopsPrivacyNote fopsFieldWide">
                  {opsText(language, "receiptUrlHint")}
                </p>
                {field(
                  "receiptNote",
                  opsText(language, "receiptNote"),
                  input("receiptNote"),
                )}
              </>
            ) : null}

            {action === "internal_request" ? (
              <>
                {field(
                  "title",
                  opsText(language, "requestTitle"),
                  input("title"),
                  "fopsFieldWide",
                )}
                {field(
                  "requestType",
                  opsText(language, "requestCategory"),
                  input("requestType"),
                )}
                {field(
                  "neededBy",
                  opsText(language, "requestNeededBy"),
                  input("neededBy", "date"),
                )}
                {field(
                  "details",
                  opsText(language, "requestDetails"),
                  textarea("details", 4),
                  "fopsFieldWide",
                )}
              </>
            ) : null}

            {action === "founder_decision" ? (
              <>
                {field(
                  "title",
                  opsText(language, "decisionTitle"),
                  input("title"),
                  "fopsFieldWide",
                )}
                {field(
                  "category",
                  opsText(language, "decisionCategory"),
                  <select
                    name="category"
                    value={String(values.category)}
                    aria-invalid={invalid.has("category")}
                    onChange={(event) => set("category", event.target.value)}
                  >
                    <option value="">{opsText(language, "selectOne")}</option>
                    <option value="content">{opsText(language, "categoryContent")}</option>
                    <option value="spend">{opsText(language, "categorySpend")}</option>
                    <option value="partner">{opsText(language, "categoryPartner")}</option>
                    <option value="filming">{opsText(language, "categoryFilming")}</option>
                    <option value="pricing">{opsText(language, "categoryPricing")}</option>
                    <option value="other">{opsText(language, "categoryOther")}</option>
                  </select>,
                )}
                {field(
                  "neededBy",
                  opsText(language, "neededBy"),
                  input("neededBy", "date"),
                )}
                {field(
                  "context",
                  opsText(language, "decisionContext"),
                  textarea("context", 5),
                  "fopsFieldWide",
                )}
              </>
            ) : null}
          </div>

          {error ? (
            <div className="fopsFormError" role="alert">
              {error}
            </div>
          ) : null}

          <footer className="fopsDrawerFooter">
            <button
              type="button"
              className="fopsButton fopsButton--ghost"
              onClick={onClose}
              disabled={busy}
            >
              {opsText(language, "cancel")}
            </button>
            <button
              type="submit"
              className="fopsButton fopsButton--primary"
              disabled={busy}
            >
              {busy ? opsText(language, "saving") : opsText(language, "submit")}
            </button>
          </footer>
        </form>
      </aside>
    </div>
  );
}
