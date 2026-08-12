import { ArrowUpRight, BadgeDollarSign, BookOpen, Building2, CheckCircle2, Megaphone, ShieldCheck, Sparkles, Target } from "lucide-react";
import type { CompanyOpsLanguage } from "./types";

const PRODUCTS = [
  {
    n: "01", tone: "", en: "Digital programs", zh: "数字训练计划",
    enBody: "Self-guided, progressive programs available immediately in the client portal. Customers can preview a sample week, complete intake and schedule by month, week or day.",
    zhBody: "可在客户端即时使用的自主渐进式训练计划。客户可预览样板周、完成问卷，并按月、按周或逐日安排训练。",
    enPoints: ["Typically 45–75 minutes per session", "Exercise video and alternate-exercise options", "Optional resilience / injury-prevention add-ons", "Bundles may combine products at a reduced total"],
    zhPoints: ["单次训练通常为 45–75 分钟", "包含动作视频与替代动作选项", "可加购韧性与伤病预防模块", "组合包可用优惠总价整合产品"],
    href: "/store", enLink: "Check current catalog and prices", zhLink: "查看当前产品与价格",
  },
  {
    n: "02", tone: "is-blue", en: "Online 1:1 coaching", zh: "线上一对一教练",
    enBody: "A fully personalised plan from an Olympic and professional-level coach, with a 30-minute consultation, weekly check-ins and adjustments around sport, travel, recovery and schedule.",
    zhBody: "由具备奥运及职业级经验的教练提供完全个性化计划，包括 30 分钟咨询、每周复盘，并根据项目、出行、恢复和时间安排持续调整。",
    enPoints: ["Weekly plan adjustments", "Direct WeChat access", "Video technique review", "Best for athletes who need feedback and adaptation"],
    zhPoints: ["每周调整训练计划", "教练微信直接沟通", "动作视频点评", "适合需要反馈与持续调整的运动员"],
    href: "/coaching", enLink: "Open coaching offer", zhLink: "查看线上教练服务",
  },
  {
    n: "03", tone: "is-ox", en: "In-person training & consulting", zh: "线下训练与咨询",
    enBody: "Custom work for individuals, teams, clubs, schools and national or provincial programs: athlete training, team sessions, presentations, performance roadmapping and rehabilitation support.",
    zhBody: "面向个人、球队、俱乐部、学校、国家队或省队项目的定制服务，包括运动员训练、团队课程、讲座、运动表现路线规划与康复支持。",
    enPoints: ["Scope and availability are discussed directly", "Useful for custom blocks and institutional needs", "Never promise dates, location or fees before confirmation"],
    zhPoints: ["服务范围与档期需直接沟通", "适合定制训练周期与机构需求", "未确认前不要承诺日期、地点或费用"],
    href: "/in-person", enLink: "Open enquiry page", zhLink: "打开合作咨询页",
  },
];

export default function CompanyBriefPage({ language }: { language: CompanyOpsLanguage }) {
  const zh = language === "zh";
  const t = (en: string, cn: string) => zh ? cn : en;
  const angles = [
    ["Professional structure, made accessible", "人人可用的职业级训练结构", "Show how a real progression differs from random workouts. Use sample-week screens, coaching rationale and calendar views.", "展示真正的渐进计划与随机训练的区别，可使用样板周、教练逻辑与日历画面。"],
    ["Train around real life", "训练适应真实生活", "Stories about sport schedules, travel, equipment and recovery naturally lead to flexible programs or 1:1 coaching.", "围绕比赛日程、出行、器械和恢复讲故事，自然引向灵活数字计划或一对一教练。"],
    ["From information to execution", "从知识到执行", "Turn coach expertise into useful education, then show the next step: preview, choose, book or enquire.", "把教练专业知识转化为实用教育，再给出明确下一步：预览、选择、购买或咨询。"],
    ["Progress over hype", "用进步取代夸张承诺", "Use process proof: consistency, technique, progressive overload, check-ins and adaptations. Avoid guaranteed outcomes.", "用过程证明价值：坚持、技术、渐进负荷、每周复盘与调整。避免保证结果。"],
    ["One need, three offer levels", "一个需求，三种产品层级", "Self-guided → digital. Feedback needed → online 1:1. Team or complex brief → in-person/custom.", "自主训练 → 数字计划；需要反馈 → 线上一对一；球队或复杂需求 → 线下定制。"],
    ["Coach-led credibility", "以教练专业建立信任", "Film demonstrations, common mistakes, program decisions and athlete Q&A. Let expertise be specific and useful.", "拍摄动作示范、常见错误、计划决策和运动员问答，让专业通过具体、有用的内容体现。"],
  ];
  return <div className="fopsCompanyBrief">
    <header className="fopsCompanyBriefHero"><div><span className="fopsCompanyBriefEyebrow"><Sparkles size={15}/>{t("Brand & campaign reference", "品牌与营销参考资料")}</span><h1>{t("NX LIMIT: the company, offer and story", "NX LIMIT：公司、产品与品牌故事")}</h1><p>{t("Use this as your source of truth when planning campaigns, writing content or briefing creators. Check the live store before publishing a product name, price or availability.", "策划活动、撰写内容或给创作者下简报时，请以本页为基础资料。发布具体产品名称、价格或库存信息前，务必核对实时商店。")}</p></div><div className="fopsCompanyBriefLinks"><a href="/" target="_blank" rel="noreferrer">{t("Public website", "官网")}<ArrowUpRight size={15}/></a><a href="/store" target="_blank" rel="noreferrer">{t("Live store", "实时商店")}<ArrowUpRight size={15}/></a></div></header>
    <section className="fopsCompanyBriefLead"><Building2/><div><strong>{t("The company in one sentence", "一句话介绍公司")}</strong><p>{t("NX LIMIT Training gives athletes Olympic and professional-level, evidence-based programming through digital programs, personalised online coaching and in-person training — built around their sport, season and schedule.", "NX LIMIT Training 通过数字训练计划、个性化线上教练和线下训练，为运动员提供奥运及职业级、循证且可执行的训练方案，并围绕其项目、赛季与时间安排进行设计。")}</p></div></section>
    <section className="fopsCompanyBriefSection"><div className="fopsCompanyBriefHeading"><Target/><div><span>{t("Positioning", "品牌定位")}</span><h2>{t("What we stand for", "我们的核心主张")}</h2></div></div><div className="fopsCompanyBriefGrid fopsCompanyBriefGrid--3"><article><strong>{t("Brand promise", "品牌承诺")}</strong><p>{t("Train like a professional, from your phone.", "像职业选手一样训练，就用手机。")}</p></article><article><strong>{t("Tagline", "品牌标语")}</strong><p>{t("Raise the Floor. Break the Ceiling.", "提升下限，突破上限。")}</p></article><article><strong>{t("The difference", "差异化")}</strong><p>{t("Elite structure made practical: progressive training, clear video, flexible scheduling and human coaching when needed.", "把精英级训练变得真正可执行：渐进计划、清晰视频、灵活排期与真人教练支持。")}</p></article></div><div className="fopsCompanyBriefAudience"><strong>{t("Core audiences", "核心受众")}</strong><p>{t("Ambitious athletes; youth athletes and parents; competitive adults; teams, clubs and schools; national or provincial programs; and people seeking more structure than generic fitness content.", "有进取心的运动员；青少年及家长；竞技型成年人；球队、俱乐部与学校；国家队或省队项目；以及希望获得比普通健身内容更系统训练的人群。")}</p></div></section>
    <section className="fopsCompanyBriefSection"><div className="fopsCompanyBriefHeading"><BookOpen/><div><span>{t("Offer architecture", "产品架构")}</span><h2>{t("Three ways to train", "三种训练方式")}</h2></div></div><div className="fopsProductSuite">{PRODUCTS.map(p=><article className={p.tone} key={p.n}><div className="fopsProductSuiteTop"><span>{p.n}</span><h3>{zh?p.zh:p.en}</h3></div><p>{zh?p.zhBody:p.enBody}</p><ul>{(zh?p.zhPoints:p.enPoints).map(x=><li key={x}>{x}</li>)}</ul><a href={p.href} target="_blank" rel="noreferrer">{zh?p.zhLink:p.enLink}<ArrowUpRight size={14}/></a></article>)}</div></section>
    <section className="fopsCompanyBriefSection"><div className="fopsCompanyBriefHeading"><BadgeDollarSign/><div><span>{t("Commercial reference", "商业信息参考")}</span><h2>{t("Pricing examples", "价格示例")}</h2></div></div><div className="fopsPricingReference"><div className="fopsPricingTable"><div className="is-head"><span>{t("Term", "周期")}</span><span>{t("Monthly", "月均")}</span><span>{t("Total", "总价")}</span><span>{t("Saving*", "节省*")}</span></div>{[[t("1 month","1 个月"),"CNY 2,500","CNY 2,500","—"],[t("3 months","3 个月"),"CNY 2,100","CNY 6,300","CNY 1,200"],[t("6 months · popular","6 个月 · 热门"),"CNY 1,900","CNY 11,400","CNY 3,600"],[t("12 months · best value","12 个月 · 超值"),"CNY 1,700","CNY 20,400","CNY 9,600"]].map(r=><div key={r[0]}>{r.map(c=><span key={c}>{c}</span>)}</div>)}</div><aside><strong>{t("How to talk about price", "如何表达价格")}</strong><p>{t("Longer coaching terms lower the effective monthly rate. *Savings compare with paying the 1-month rate for the same period.", "更长周期可降低月均价格。*节省金额按同等周期每月支付 1 个月档价格计算。")}</p><p>{t("Digital prices are managed in the live catalog and vary by program, bundle or add-on. In-person work is quoted after scope and availability are understood.", "数字产品价格由实时商店管理，会因计划、组合包或加购模块而变化。线下服务需了解范围与档期后报价。")}</p></aside></div></section>
    <section className="fopsCompanyBriefSection"><div className="fopsCompanyBriefHeading"><Megaphone/><div><span>{t("Campaign toolbox", "营销活动工具箱")}</span><h2>{t("Angles Yumei can build from", "Yumei 可采用的内容角度")}</h2></div></div><div className="fopsCampaignAngles">{angles.map((a,i)=><article key={a[0]}><span>{String(i+1).padStart(2,"0")}</span><div><strong>{zh?a[1]:a[0]}</strong><p>{zh?a[3]:a[2]}</p></div></article>)}</div></section>
    <section className="fopsCompanyBriefSection fopsCompanyBriefSection--split"><div><div className="fopsCompanyBriefHeading"><CheckCircle2/><div><span>{t("Voice", "品牌语气")}</span><h2>{t("Sound like NX LIMIT", "写出 NX LIMIT 的感觉")}</h2></div></div><ul className="fopsBriefChecklist">{[t("Confident, clear and practical — never academic for its own sake.","自信、清晰、实用，不为显得专业而学术化。"),t("Translate evidence into what the athlete should do.","把科学证据转化为运动员该怎么做。"),t("Ambitious without shouting; specific without overpromising.","有雄心但不喧闹；具体但不过度承诺。"),t("Speak to the sport, season, constraints and next action.","围绕项目、赛季、限制与下一步行动表达。")].map(x=><li key={x}><CheckCircle2/>{x}</li>)}</ul></div><div><div className="fopsCompanyBriefHeading"><ShieldCheck/><div><span>{t("Guardrails", "内容红线")}</span><h2>{t("Check before publishing", "发布前检查")}</h2></div></div><ul className="fopsBriefChecklist is-warning">{[t("Never publish client injuries, diagnoses, medical history or identifying health details.","绝不发布客户伤病、诊断、病史或可识别的健康信息。"),t("Get permission before using a client's name, image, message or results.","使用客户姓名、形象、聊天内容或成果前必须获得许可。"),t("Do not describe coaching as medical care or guarantee outcomes.","不要把教练服务描述为医疗行为，也不要保证结果。"),t("Verify price, availability, links and campaign terms immediately before posting.","发布前核对价格、产品状态、链接与活动条款。")].map(x=><li key={x}><ShieldCheck/>{x}</li>)}</ul></div></section>
    <footer className="fopsCompanyBriefFooter"><strong>{t("A simple campaign brief formula", "简单的活动简报公式")}</strong><p>{t("Audience + real problem + one useful insight + proof of method + best-fit offer + one clear CTA + a measurable success target.", "受众 + 真实问题 + 一个有用洞察 + 方法证明 + 最匹配产品 + 一个清晰行动号召 + 可衡量目标。")}</p></footer>
  </div>;
}
