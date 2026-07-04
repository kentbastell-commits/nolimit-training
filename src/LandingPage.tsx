// Public landing page (lv3 design system). Extracted from App.tsx as
// phase B of the monolith split — JSX and copy moved verbatim; the only
// state it needs arrives via props.
import { ArrowRight, BookOpen, Check, Shield, Users } from "lucide-react";
import type { Program, Toast } from "./appCore";

export default function LandingPage({
  storeLang,
  setStoreLang,
  programs,
  toasts,
}: {
  storeLang: "en" | "zh";
  setStoreLang: (lang: "en" | "zh") => void;
  programs: Program[];
  toasts: Toast[];
}) {
  const lZh = storeLang === "zh";
  const landingPrograms = programs.filter((p) => p.publicStoreVisible);
  const featuredPrograms = landingPrograms.slice(0, 3);

  const landingCopy = {
    navPrograms: lZh ? "训练计划" : "Programs",
    navCoaching: lZh ? "线上教练" : "Coaching",
    navInPerson: lZh ? "线下训练" : "In-Person",
    viewPrograms: lZh ? "查看训练计划" : "View Programs",
    coachLogin: lZh ? "教练登录" : "Coach Login",
    heroEyebrow: lZh ? "为训练而生" : "Built for Training",
    heroTitle: lZh ? "像职业选手一样训练，就用手机。" : "Train like a professional, from your phone.",
    heroLead: lZh
      ? "奥运与职业级的训练计划与一对一教练——围绕你的项目、赛季和时间安排，提供循证、可执行的训练。一切尽在手机。"
      : "Olympic and professional-level programming and 1:1 coaching — evidence-based training built around your sport, your season, and your schedule. All from your phone.",
    storeCta: lZh ? "进入商店" : "Explore Store",
    onlineCta: lZh ? "了解线上教练" : "Online Coaching",
    stepsTitle: lZh ? "购买后的流程" : "How It Works",
    programsTitle: lZh ? "数字训练计划" : "Digital Programs",
    programsBody: lZh
      ? "可立即开始的专业训练计划——顶级编排，价格远低于一对一私教。进阶式、支持多水平，并可加购关节与伤病预防模块。"
      : "Expertly programmed plans you can start today — elite structure at a fraction of one-on-one pricing. Progressive, multi-level, with optional injury-prevention add-ons.",
    coachingTitle: lZh ? "线上一对一教练" : "Online Coaching",
    coachingBody: lZh
      ? "获得奥运及职业级训练经验支持的个性化计划，包括 30 分钟咨询、每周反馈、根据运动项目、旅行和恢复情况调整的训练进阶。"
      : "Get a personalized plan from an Olympic and professional-level coach, including a 30-minute consultation, weekly check-ins, and adjustments around sport, travel, recovery, and what you actually need.",
    inPersonTitle: lZh ? "线下训练" : "In-Person Training",
    inPersonBody: lZh
      ? "面向团队、俱乐部和个人提供线下训练服务。扫码添加微信，了解团队课程、私教和专项训练安排。"
      : "Available for teams, clubs, and individuals. Scan WeChat to ask about in-person coaching, team sessions, and custom training blocks.",
    footer: lZh ? "为训练而生。" : "Built for Training.",
  };

  const landingSteps = lZh
    ? [
        ["支付", "通过外部付款方式购买训练计划。"],
        ["填写问卷", "完成 intake，让我们了解你的背景和训练目标。"],
        ["我的计划", "训练计划进入你的客户端 My Programs。"],
        ["自定日期", "选择按月、按周或逐日安排到日历。"],
      ]
    : [
        ["Pay", "Purchase a digital program through the external checkout."],
        ["Intake", "Complete your intake so the plan fits your background."],
        ["My Programs", "Your program appears inside your client portal."],
        ["Customize Dates", "Schedule by month, by week, or day by day."],
      ];

  return (
    <div className={`lv3 ${lZh ? "zh" : "en"}`}>
      <div className="toastStack">
        {toasts.map((toast) => (
          <div className={`toast toast-${toast.type}`} key={toast.id}>
            {toast.message}
          </div>
        ))}
      </div>

      <header className="lv3Nav">
        <a className="lv3Brand" href="/">
          <img src="/nl_wordmark_black.png" alt="No Limit" />
        </a>
        <nav className="lv3NavLinks">
          <a href="/store">{landingCopy.navPrograms}</a>
          <a href="#paths">{landingCopy.navCoaching}</a>
          <a href="#inperson">{landingCopy.navInPerson}</a>
        </nav>
        <div className="lv3NavActions">
          <button
            className="lv3Lang"
            onClick={() => setStoreLang(lZh ? "en" : "zh")}
            aria-label="Change language"
          >
            <span className={!lZh ? "active" : ""}>EN</span>
            <span className={lZh ? "active" : ""}>中文</span>
          </button>
          <a className="lv3NavCta" href="/store">
            {landingCopy.viewPrograms}
          </a>
        </div>
      </header>

      <main className="lv3Main">
        {/* Hero */}
        <section className="lv3Hero">
          <div className="lv3HeroGlow" aria-hidden="true" />
          <div className="lv3HeroInner">
            <span className="lv3Eyebrow">{landingCopy.heroEyebrow}</span>
            <h1 className="lv3HeroTitle">{landingCopy.heroTitle}</h1>
            <p className="lv3HeroLead">{landingCopy.heroLead}</p>
            <div className="lv3HeroActions">
              <a className="lv3BtnPrimary" href="/store">
                {lZh ? "浏览训练计划" : "Browse Programs"}
                <ArrowRight size={18} />
              </a>
              <a className="lv3BtnBlue" href="/?invite=client">
                {lZh ? "一对一训练" : "Train with us 1:1"}
              </a>
            </div>
            <div className="lv3HeroStats">
              <div>
                <strong>{landingPrograms.length || "—"}</strong>
                <span>
                  {lZh
                    ? "训练计划"
                    : landingPrograms.length === 1
                      ? "Program"
                      : "Programs"}
                </span>
              </div>
              <div>
                <strong>{lZh ? "循证" : "Evidence"}</strong>
                <span>{lZh ? "科学编排" : "Based"}</span>
              </div>
              <div>
                <strong>EN / 中文</strong>
                <span>{lZh ? "双语" : "Bilingual"}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Three ways to train */}
        <section className="lv3Paths" id="paths">
          <div className="lv3SectionHead">
            <span className="lv3Eyebrow">{lZh ? "选择你的路径" : "Choose your path"}</span>
            <h2>{lZh ? "三种方式，开始训练。" : "Three ways to train."}</h2>
          </div>
          <div className="lv3PathGrid lv3PathGrid3">
            <article className="lv3PathCard">
              <div className="lv3PathIcon">
                <BookOpen size={26} strokeWidth={2.4} />
              </div>
              <h3>{lZh ? "数字训练计划" : "Digital Programs"}</h3>
              <p>{landingCopy.programsBody}</p>
              <ul>
                {(lZh
                  ? ["即时获取", "进阶训练周期", "可选伤病预防加购"]
                  : ["Instant access", "Progressive seasons", "Injury-prevention add-ons"]
                ).map((h) => (
                  <li key={h}>
                    <Check size={15} /> {h}
                  </li>
                ))}
              </ul>
              <a className="lv3BtnPrimary lv3PathBtn" href="/store">
                {lZh ? "浏览训练计划" : "Browse Programs"}
                <ArrowRight size={17} />
              </a>
            </article>

            <article className="lv3PathCard lv3PathCardBlue">
              <div className="lv3PathIcon">
                <Users size={26} strokeWidth={2.4} />
              </div>
              <h3>{lZh ? "线上一对一训练" : "Online 1:1 Training"}</h3>
              <p>{landingCopy.coachingBody}</p>
              <ul>
                {(lZh
                  ? ["30 分钟咨询", "每周反馈", "完全线上，灵活安排"]
                  : ["30-min consult", "Weekly check-ins", "Fully online, on your schedule"]
                ).map((h) => (
                  <li key={h}>
                    <Check size={15} /> {h}
                  </li>
                ))}
              </ul>
              <a className="lv3BtnBlue lv3PathBtn" href="/?invite=client">
                {lZh ? "一对一训练" : "Train with us 1:1"}
                <ArrowRight size={17} />
              </a>
            </article>

            <article className="lv3PathCard lv3PathCardOx">
              <div className="lv3PathIcon">
                <Shield size={26} strokeWidth={2.4} />
              </div>
              <h3>
                {lZh ? "线下训练与咨询" : "In-Person Training & Consulting"}
              </h3>
              <p>
                {lZh
                  ? "我们的教练可受聘于国家队、省队、俱乐部、学校或个人，提供线下训练，或提供咨询服务，如讲座、表现规划路线图与康复指导。"
                  : "Our coaches can be contracted by national and provincial programs, clubs, schools, or individuals — to train athletes in person, or for consulting such as presentations, performance roadmapping, and rehabilitation."}
              </p>
              <ul>
                {(lZh
                  ? ["国家队 / 省队 / 俱乐部 / 学校", "线下训练运动员", "讲座 · 规划 · 康复"]
                  : [
                      "National · provincial · club · school",
                      "In-person athlete training",
                      "Presentations · roadmapping · rehab",
                    ]
                ).map((h) => (
                  <li key={h}>
                    <Check size={15} /> {h}
                  </li>
                ))}
              </ul>
              <a className="lv3BtnOx lv3PathBtn" href="/?enquiry=inperson">
                {lZh ? "线下合作咨询" : "Train with us In-Person"}
                <ArrowRight size={17} />
              </a>
              <small className="lv3PathFootnote">
                {lZh ? "视档期而定。" : "Subject to availability."}
              </small>
            </article>
          </div>
        </section>

        {/* Featured programs */}
        {featuredPrograms.length > 0 && (
          <section className="lv3Featured">
            <div className="lv3SectionHead">
              <span className="lv3Eyebrow">{landingCopy.programsTitle}</span>
              <h2>{lZh ? "按项目、赛季和身体需求选择。" : "Built by sport, season, and body."}</h2>
            </div>
            <div className="lv3FeaturedGrid">
              {featuredPrograms.map((program) => (
                <a
                  className="lv3ProgramCard"
                  href="/store"
                  key={program.recordId || program.programName}
                >
                  {program.productImage ? (
                    <div className="lv3ProgramImg">
                      <img src={program.productImage} alt="" loading="lazy" />
                    </div>
                  ) : (
                    <div className="lv3ProgramImg lv3ProgramImgEmpty">
                      <span>{(program.sport || "NL").slice(0, 2).toUpperCase()}</span>
                    </div>
                  )}
                  <div className="lv3ProgramBody">
                    <span className="lv3ProgramTag">
                      {program.sport || (lZh ? "专项训练" : "Performance")}
                    </span>
                    <h3>
                      {lZh && program.programNameCn
                        ? program.programNameCn
                        : program.programName}
                    </h3>
                    <p>
                      {program.durationWeeks || "4"} {lZh ? "周" : "wks"} ·{" "}
                      {program.sessionsPerWeek || "3"}
                      {lZh ? " 次/周" : "/wk"} ·{" "}
                      {program.level || (lZh ? "多水平" : "All levels")}
                    </p>
                  </div>
                </a>
              ))}
            </div>
            <a className="lv3SeeAll" href="/store">
              {landingCopy.viewPrograms} <ArrowRight size={16} />
            </a>
          </section>
        )}

        {/* How it works */}
        <section className="lv3Steps">
          <div className="lv3SectionHead">
            <span className="lv3Eyebrow">{landingCopy.stepsTitle}</span>
            <h2>{lZh ? "从购买到开练，只需四步。" : "From purchase to training in four steps."}</h2>
          </div>
          <div className="lv3StepGrid">
            {landingSteps.map(([title, body], index) => (
              <div className="lv3StepCard" key={title}>
                <span className="lv3StepNum">{String(index + 1).padStart(2, "0")}</span>
                <strong>{title}</strong>
                <p>{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* In-person */}
        <section className="lv3InPerson" id="inperson">
          <div className="lv3InPersonCopy">
            <span className="lv3Eyebrow">{landingCopy.navInPerson}</span>
            <h2>{landingCopy.inPersonTitle}</h2>
            <p>{landingCopy.inPersonBody}</p>
          </div>
          <div className="lv3Wechat">
            <img
              src="https://i.ibb.co/Y4nXVG4g/Weixin-Image-20260611202846-56-2.jpg"
              alt="WeChat QR"
            />
            <strong>{lZh ? "扫码加微信咨询" : "Scan for WeChat"}</strong>
          </div>
        </section>

        {/* Final CTA */}
        <section className="lv3FinalCta">
          <div className="lv3HeroGlow" aria-hidden="true" />
          <h2>{lZh ? "为训练而生。" : "Built for Training."}</h2>
          <p>
            {lZh
              ? "从数字训练计划开始，或申请一对一线上 / 线下教练服务。"
              : "Start with a digital program, or train with us 1:1 — online or in person."}
          </p>
          <div className="lv3HeroActions lv3FinalActions">
            <a className="lv3BtnPrimary" href="/store">
              {lZh ? "浏览训练计划" : "Browse Programs"}
              <ArrowRight size={18} />
            </a>
            <a className="lv3BtnBlue" href="/?invite=client">
              {lZh ? "一对一训练" : "Train with us 1:1"}
            </a>
          </div>
        </section>
      </main>

      <footer className="lv3Footer">
        <span>{landingCopy.footer}</span>
        <div className="lv3FooterLinks">
          <a href="/store">{landingCopy.navPrograms}</a>
          <a href="/?invite=client">{landingCopy.navCoaching}</a>
          <a href="/?portal=client">{lZh ? "客户端" : "Client Portal"}</a>
          <a href="/?view=coach">{landingCopy.coachLogin}</a>
        </div>
      </footer>
    </div>
  );
}
