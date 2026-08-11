// 使用指南 Guide (v1) — an in-app, bilingual walkthrough of Company
// Operations for the Brand & Growth role. Interactive on purpose: every
// section deep-links into the real feature, and the first-week checklist
// persists locally. Copy lives inline (local text() pattern) because this
// page IS the copy.
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  FileText,
  Home,
  LifeBuoy,
  Newspaper,
  ShieldCheck,
  Target,
  TrendingUp,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { CompanyOpsLanguage, CompanyOpsPage } from "./types";

function text(language: CompanyOpsLanguage, en: string, zh: string) {
  return language === "zh" ? zh : en;
}

type GuideStep = { en: string; zh: string };
type GuideSection = {
  id: string;
  icon: typeof Home;
  title: GuideStep;
  intro: GuideStep;
  steps: GuideStep[];
  tip?: GuideStep;
  page?: CompanyOpsPage;
};

const SECTIONS: GuideSection[] = [
  {
    id: "home",
    icon: Home,
    page: "home",
    title: { en: "Home — your daily starting point", zh: "首页——每天从这里开始" },
    intro: {
      en: "Open Company Operations each morning and the Home page tells you what matters today.",
      zh: "每天早上打开公司运营，首页会告诉你今天最重要的事。",
    },
    steps: [
      {
        en: "“Your next priority” shows the single most urgent item — start there.",
        zh: "「今日优先」显示当前最紧急的一件事——先做它。",
      },
      {
        en: "“Company goals & founder ideas” is direction from Kent and partners. Read it, then use “Send response” so they know it landed.",
        zh: "「公司目标与创始人想法」是 Kent 和合伙人给的方向。看完后用「发送回应」，让他们知道你收到了。",
      },
      {
        en: "“Quick actions” creates records without opening any Base: new content, campaign, experiment, platform metrics, product issue, internal request.",
        zh: "「快捷操作」不用打开多维表格就能新建：内容、活动、实验、平台数据、产品问题、内部申请。",
      },
      {
        en: "“My work” lists only items waiting on you, sorted by due date.",
        zh: "「我的工作」只列等你处理的事项，按截止日期排序。",
      },
      {
        en: "The 中文 / English button (top right) switches the whole app's language at any time.",
        zh: "右上角的 中文 / English 按钮随时切换整个应用的语言。",
      },
    ],
  },
  {
    id: "calendar",
    icon: CalendarDays,
    page: "calendar",
    title: { en: "Content Calendar — plan and publish", zh: "内容日历——排期与发布" },
    intro: {
      en: "This is your main workspace: everything you plan to post, on a calendar you fully control.",
      zh: "这是你的主工作区：所有要发布的内容都在这个完全由你掌控的日历上。",
    },
    steps: [
      {
        en: "Views: Day (magazine-style detail of one day), Week (default), Month (overview), Plan ahead (filming board — see next section).",
        zh: "视图：日（单日杂志式详情）、周（默认）、月（总览）、拍摄计划（素材看板，见下一节）。",
      },
      {
        en: "“+ New content” opens the creation form: title, platform, format, hook, full copy, SEO keywords, hashtags, CTA, idea notes.",
        zh: "「+ 新建内容」打开创建表单：标题、平台、形式、钩子、完整文案、SEO 关键词、话题标签、行动号召、创意备注。",
      },
      {
        en: "Drag any card to another day to reschedule — the publish time is kept. Click a card to open the full editor, where you can also set the exact publish time.",
        zh: "把卡片拖到另一天即可改期——发布时间会保留。点击卡片打开完整编辑器，也可以在那里设置精确的发布时间。",
      },
      {
        en: "Right-click a card for Edit / Cut / Copy / Delete; right-click a day to Paste. Cut moves the card, Copy duplicates it.",
        zh: "右键卡片可 编辑/剪切/复制/删除；右键某一天可粘贴。剪切是移动，复制是再建一份。",
      },
      {
        en: "When something goes live, tap the green check (on the card, in week view, or in the editor). Published items build the Archive & monthly stats at the bottom — that's your月报 data.",
        zh: "内容上线后，点绿色对勾（卡片上、周视图里或编辑器里都有）。已发布内容会进入底部的「归档与月度统计」——那就是你的月报数据。",
      },
    ],
    tip: {
      en: "Platform logos on each card (XHS red, Douyin, WeChat green…) let you see the week's platform mix at a glance.",
      zh: "每张卡片上的平台标志（小红书红、抖音、微信绿……）让你一眼看出这周的平台分布。",
    },
  },
  {
    id: "plan",
    icon: ClipboardList,
    page: "calendar",
    title: { en: "Plan ahead — tell the coaches what to film", zh: "拍摄计划——告诉教练要拍什么" },
    intro: {
      en: "The “Plan ahead” tab inside the Calendar is how you request footage. Kent and the coaches check it before filming days.",
      zh: "日历里的「拍摄计划」标签是你申请素材的地方。Kent 和教练在拍摄日前会查看它。",
    },
    steps: [
      {
        en: "Upcoming content is grouped by week, with a “N need footage” count per week.",
        zh: "未来内容按周分组，每周显示「N 条待解决素材」。",
      },
      {
        en: "Tap the pill on each row to cycle footage status: 需拍摄 To Film → 拍摄中 Filming → 已有素材 Footage Ready → 无需拍摄.",
        zh: "点每行的状态胶囊切换素材状态：需拍摄 → 拍摄中 → 已有素材 → 无需拍摄。",
      },
      {
        en: "Open a card and write “Filming notes” describing exactly what to shoot (angles, location, who's on camera, how many seconds). The clearer the note, the better the footage.",
        zh: "打开卡片，在「拍摄需求」里写清楚要拍什么（机位、场地、谁出镜、多少秒）。写得越具体，拍回来的素材越好用。",
      },
      {
        en: "Raw footage from the coaches lands in the shared Feishu Drive folder “02 Content”.",
        zh: "教练拍好的素材会放进飞书云盘共享文件夹「02 Content」。",
      },
    ],
  },
  {
    id: "articles",
    icon: Newspaper,
    page: "articles",
    title: { en: "Article builder — long-form for 公众号", zh: "文章创作——公众号长文" },
    intro: {
      en: "Build full articles from stacked blocks, then export to Word or copy straight into the WeChat editor.",
      zh: "用积木式区块拼装完整文章，可导出 Word，或一键复制进公众号编辑器。",
    },
    steps: [
      {
        en: "Type a title and press “New article”. Open it, then add blocks: Text, Heading, Photo, Video, Quote, Divider. Reorder with the arrows.",
        zh: "输入标题点「新建文章」。打开后添加区块：正文、小标题、图片、视频、引用、分割线。用箭头调整顺序。",
      },
      {
        en: "Photos and videos: paste a link, or press Upload to send a file from your computer.",
        zh: "图片和视频：可以粘贴链接，也可以点「上传」直接传本地文件。",
      },
      {
        en: "“Preview” shows the finished article. “Save” often — drafts sync to the Base so they're on every device.",
        zh: "「预览」查看成品效果。勤点「保存」——草稿会同步到多维表格，换设备也在。",
      },
      {
        en: "“Copy for WeChat” puts the formatted article on your clipboard — paste it into the 公众号 editor with styling intact. “Export Word” downloads a .doc with all photos embedded.",
        zh: "「复制到公众号」把带格式的文章放进剪贴板——直接粘贴到公众号编辑器。「导出 Word」下载嵌入全部图片的 .doc 文件。",
      },
      {
        en: "End every 公众号 article with the follow QR — add a Photo block with: https://trainnolimit.cn/oa-follow-qr.jpg",
        zh: "每篇公众号文章结尾都放关注二维码——添加图片区块，链接填：https://trainnolimit.cn/oa-follow-qr.jpg",
      },
    ],
  },
  {
    id: "growth",
    icon: TrendingUp,
    page: "growth",
    title: { en: "Growth — pipeline, leads, campaigns, metrics", zh: "增长——管线、线索、活动、数据" },
    intro: {
      en: "The Growth page is your operations cockpit for everything beyond individual posts.",
      zh: "增长页是内容之外所有运营工作的驾驶舱。",
    },
    steps: [
      {
        en: "Content pipeline shows how many items sit in each stage (Idea → Script → Filmed → Scheduled → Published).",
        zh: "内容管线显示各阶段数量（想法 → 脚本 → 已拍摄 → 已排期 → 已发布）。",
      },
      {
        en: "Leads to follow up: people who asked about programs. Record next actions and follow-up dates so no one goes cold.",
        zh: "待跟进线索：咨询过课程的人。记录下一步动作和跟进日期，别让线索变凉。",
      },
      {
        en: "Partners / KOL: track outreach stage, audience fit and deliverables. Campaigns and Experiments each have guided creation forms.",
        zh: "合作伙伴/KOL：跟踪接触阶段、受众匹配和交付物。活动和实验都有引导式创建表单。",
      },
      {
        en: "Record platform metrics weekly (followers, views, leads per platform) — this feeds the founder dashboard and your own performance evidence.",
        zh: "每周记录平台数据（各平台粉丝、播放、线索）——它会进入创始人看板，也是你绩效的证据。",
      },
      {
        en: "Weekly report (due Friday): six sections A–F — Wins, Results, Problems, Learnings, Decisions needed, Next priorities. The home page reminds you when it's due.",
        zh: "周报（周五前提交）：A–F 六段——完成事项、主要成果、问题、学习、需要决策、下周优先级。到期时首页会提醒你。",
      },
    ],
  },
  {
    id: "performance",
    icon: Target,
    page: "performance",
    title: { en: "Performance — monthly goals & report", zh: "绩效——月度目标与报告" },
    intro: {
      en: "Your five weighted monthly goals live here, agreed with the founders at the start of each month.",
      zh: "你每月的五项加权目标在这里，月初与创始人确认。",
    },
    steps: [
      {
        en: "Confirm your priorities at the start of the month, then submit the monthly report at the end — one paragraph summary plus evidence per goal.",
        zh: "月初确认目标优先级，月末提交月度报告——一段总结加每项目标的证据。",
      },
      {
        en: "Link evidence from the app itself: archive stats, platform metrics, campaign results. The more concrete, the smoother the review.",
        zh: "证据直接引用应用里的数据：归档统计、平台数据、活动结果。越具体，复盘越顺利。",
      },
    ],
  },
  {
    id: "policies",
    icon: ShieldCheck,
    page: "resources",
    title: { en: "Policies, brand assets & one hard rule", zh: "制度、品牌资产与一条硬规则" },
    intro: {
      en: "Read and acknowledge each policy once — the app tracks which ones you've confirmed.",
      zh: "每份制度读完点确认——应用会记录你已确认哪些。",
    },
    steps: [
      {
        en: "Brand assets (logos, fonts, QR codes in five sizes, brand guidelines, mockups) are in the shared Feishu Drive folder “01 Brand Assets”.",
        zh: "品牌资产（标志、字体、五种尺寸二维码、品牌手册、样机）在飞书云盘共享文件夹「01 Brand Assets」。",
      },
      {
        en: "THE hard rule: client health information (injuries, diagnoses, medical history) never goes into Company Operations, social posts, or anywhere outside the coaching app. When in doubt, leave it out.",
        zh: "硬规则：客户健康信息（伤病、诊断、病史）绝不进入公司运营、社媒内容或教练应用以外的任何地方。拿不准就不要写。",
      },
    ],
  },
  {
    id: "help",
    icon: LifeBuoy,
    page: "home",
    title: { en: "Stuck? Report issues & requests", zh: "遇到问题？反馈与申请" },
    intro: {
      en: "Two quick actions on Home cover almost everything else.",
      zh: "首页的两个快捷操作能覆盖几乎所有其他情况。",
    },
    steps: [
      {
        en: "“Report a product issue”: something in the coaching app or website is broken — describe what happened and how to reproduce it.",
        zh: "「报告产品问题」：教练应用或网站出了问题——描述发生了什么、怎么复现。",
      },
      {
        en: "“Internal request”: anything you need from the founders — equipment, budget, access, a decision. It lands in their queue with a status you can watch.",
        zh: "「内部申请」：需要创始人提供的任何东西——设备、预算、权限、决策。会进入他们的队列，你能看到处理状态。",
      },
      {
        en: "Expenses: submit claims from Home; you can see each claim's status (Pending → Approved → Reimbursed) under “My submissions”.",
        zh: "报销：在首页提交；在「我的提交」里能看到每笔的状态（待审批 → 已批准 → 已打款）。",
      },
    ],
  },
];

const CHECKLIST: GuideStep[] = [
  { en: "Log in with Feishu and switch to your preferred language", zh: "用飞书登录，切换到你习惯的语言" },
  { en: "Read the founder goals on Home and send a response", zh: "阅读首页的创始人目标并发送回应" },
  { en: "Read and acknowledge every policy", zh: "阅读并确认所有制度" },
  { en: "Open the shared Drive folder and browse 01 Brand Assets", zh: "打开共享云盘，浏览 01 Brand Assets" },
  { en: "Create your first content card on the calendar", zh: "在日历上创建你的第一张内容卡片" },
  { en: "Set footage status + filming notes on next week's content", zh: "为下周内容设置素材状态和拍摄需求" },
  { en: "Draft one article and try Copy for WeChat", zh: "起草一篇文章，试试「复制到公众号」" },
  { en: "Record this week's platform metrics", zh: "记录本周平台数据" },
  { en: "Submit your first weekly report on Friday", zh: "周五提交第一份周报" },
];

const CHECKLIST_KEY = "nl_ops_guide_checklist_v1";

export default function GuidePage({
  language,
  onNavigate,
}: {
  language: CompanyOpsLanguage;
  onNavigate: (page: CompanyOpsPage) => void;
}) {
  const [open, setOpen] = useState<string>(SECTIONS[0].id);
  const [done, setDone] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(CHECKLIST_KEY);
      if (saved) setDone(JSON.parse(saved));
    } catch {
      // Storage may be blocked; the checklist just won't persist.
    }
  }, []);

  const toggleDone = (index: number) => {
    setDone((current) => {
      const next = { ...current, [index]: !current[index] };
      try {
        window.localStorage.setItem(CHECKLIST_KEY, JSON.stringify(next));
      } catch {
        // Non-fatal.
      }
      return next;
    });
  };

  const doneCount = useMemo(
    () => CHECKLIST.filter((_, index) => done[index]).length,
    [done],
  );

  return (
    <div className="fopsPage fopsGuidePage">
      <header className="fopsPageHeader">
        <div>
          <span className="fopsEyebrow">
            {text(language, "Guide · v1", "使用指南 · v1")}
          </span>
          <h1>{text(language, "How to run Brand & Growth here", "品牌与增长：这个应用怎么用")}</h1>
          <p>
            {text(
              language,
              "Everything the Brand & Growth role does, in one tour. Each section has a button that takes you straight to the real feature.",
              "品牌与增长角色的全部工作，一次讲清。每一节都有按钮，点击直达真实功能。",
            )}
          </p>
        </div>
      </header>

      <section className="fopsGuideChecklist">
        <header>
          <BookOpen size={17} aria-hidden="true" />
          <strong>{text(language, "First-week checklist", "第一周清单")}</strong>
          <span>
            {doneCount}/{CHECKLIST.length}
          </span>
        </header>
        <div className="fopsGuideChecklistBar" aria-hidden="true">
          <i style={{ width: `${Math.round((doneCount / CHECKLIST.length) * 100)}%` }} />
        </div>
        <ul>
          {CHECKLIST.map((item, index) => (
            <li key={index}>
              <label>
                <input
                  type="checkbox"
                  checked={Boolean(done[index])}
                  onChange={() => toggleDone(index)}
                />
                <span className={done[index] ? "is-done" : ""}>
                  {text(language, item.en, item.zh)}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      <div className="fopsGuideSections">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          const isOpen = open === section.id;
          return (
            <section
              className={`fopsGuideSection${isOpen ? " is-open" : ""}`}
              key={section.id}
            >
              <button
                type="button"
                className="fopsGuideSectionHead"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? "" : section.id)}
              >
                <span className="fopsGuideSectionIcon">
                  <Icon size={18} aria-hidden="true" />
                </span>
                <strong>{text(language, section.title.en, section.title.zh)}</strong>
                <ChevronDown size={17} className="fopsGuideChevron" aria-hidden="true" />
              </button>
              {isOpen ? (
                <div className="fopsGuideSectionBody">
                  <p className="fopsGuideIntro">
                    {text(language, section.intro.en, section.intro.zh)}
                  </p>
                  <ol>
                    {section.steps.map((step, index) => (
                      <li key={index}>{text(language, step.en, step.zh)}</li>
                    ))}
                  </ol>
                  {section.tip ? (
                    <p className="fopsGuideTip">
                      <FileText size={14} aria-hidden="true" />
                      {text(language, section.tip.en, section.tip.zh)}
                    </p>
                  ) : null}
                  {section.page ? (
                    <button
                      type="button"
                      className="fopsButton fopsButton--primary fopsGuideGo"
                      onClick={() => onNavigate(section.page as CompanyOpsPage)}
                    >
                      {text(language, "Take me there", "带我去试试")}
                      <ArrowRight size={15} />
                    </button>
                  ) : null}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>

      <p className="fopsGuideFoot">
        {text(
          language,
          "Something missing from this guide, or confusing in the app? Use “Internal request” on Home — the guide gets updated from real questions.",
          "指南没讲到、或应用里有让你困惑的地方？用首页的「内部申请」告诉我们——指南会根据真实问题持续更新。",
        )}
      </p>
    </div>
  );
}
