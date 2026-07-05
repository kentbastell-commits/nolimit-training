// Public landing page (lv3 design system). Extracted from App.tsx as
// phase B of the monolith split. Motion layer added with Framer Motion:
// staggered hero entrance, a word-by-word masked headline reveal, a
// living aurora background, a credibility marquee, count-up stats, a
// scroll-progress bar, and scroll-triggered section reveals. All
// animation is opacity/transform only (GPU, no external calls —
// China-safe) and collapses to fades under prefers-reduced-motion.
import { Fragment, useEffect, useState } from "react";
import { ArrowRight, BookOpen, Check, Shield, Users } from "lucide-react";
import {
  animate,
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type Variants,
} from "framer-motion";
import type { Program, Toast } from "./appCore";

// Confident, weighty easing (ease-out-expo) — reads as strong, not bouncy.
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.08 } },
};
const rise: Variants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } },
};
const fade: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.5, ease: EASE } },
};

// Headline: each word/char rises out of an overflow-hidden mask.
const headlineContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.04 } },
};
const wordRise: Variants = {
  hidden: { y: "115%" },
  show: { y: 0, transition: { duration: 0.9, ease: EASE } },
};

// Reveal a section on scroll, staggering its direct children.
const reveal = {
  variants: staggerParent,
  initial: "hidden" as const,
  whileInView: "show" as const,
  viewport: { once: true, amount: 0.2 },
};

// Split on spaces for space-delimited languages, else per character (CJK).
function AnimatedHeadline({ text }: { text: string }) {
  const hasSpaces = text.includes(" ");
  const tokens = hasSpaces ? text.split(" ") : Array.from(text);
  return (
    <motion.h1 className="lv3HeroTitle" variants={headlineContainer} aria-label={text}>
      {tokens.map((tok, i) => (
        <Fragment key={i}>
          <span className="lv3WordMask" aria-hidden="true">
            <motion.span className="lv3Word" variants={wordRise}>
              {tok}
            </motion.span>
          </span>
          {hasSpaces && i < tokens.length - 1 ? " " : ""}
        </Fragment>
      ))}
    </motion.h1>
  );
}

// Count up from 0 to `to` once, on mount.
function Counter({ to, reduce }: { to: number; reduce: boolean | null }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (reduce || to <= 0) {
      setDisplay(to);
      return;
    }
    const controls = animate(0, to, {
      duration: 1.2,
      delay: 0.6,
      ease: EASE,
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [to, reduce]);
  if (to <= 0) return <>—</>;
  return <>{display}</>;
}

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

  const reduce = useReducedMotion();
  const item: Variants = reduce ? fade : rise;
  const line: Variants = reduce
    ? fade
    : {
        hidden: { opacity: 0, scaleX: 0 },
        show: {
          opacity: 1,
          scaleX: 1,
          transition: { duration: 0.9, ease: EASE },
        },
      };

  // Parallax drift on the hero aurora + a scroll-progress bar.
  const { scrollY, scrollYProgress } = useScroll();
  const glowY = useTransform(scrollY, [0, 600], [0, 140]);
  const progressX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.001,
  });

  const marqueeItems = lZh
    ? ["奥运级", "职业体能", "循证训练", "周期化", "康复", "表现提升", "双语 EN / 中文"]
    : [
        "Olympic-Level",
        "Professional S&C",
        "Evidence-Based",
        "Periodization",
        "Rehabilitation",
        "Performance",
        "Bilingual EN / 中文",
      ];

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
      <motion.div
        className="lv3ScrollBar"
        style={{ scaleX: progressX }}
        aria-hidden="true"
      />

      <div className="toastStack">
        {toasts.map((toast) => (
          <div className={`toast toast-${toast.type}`} key={toast.id}>
            {toast.message}
          </div>
        ))}
      </div>

      <motion.header
        className="lv3Nav"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: EASE }}
      >
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
      </motion.header>

      <main className="lv3Main">
        {/* Hero */}
        <section className="lv3Hero">
          {reduce ? (
            <div className="lv3HeroGlow" aria-hidden="true" />
          ) : (
            <motion.div className="lv3Aurora" aria-hidden="true" style={{ y: glowY }}>
              <motion.span
                className="lv3Blob lv3BlobGold"
                animate={{ x: [0, 40, -25, 0], y: [0, -30, 20, 0] }}
                transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.span
                className="lv3Blob lv3BlobOx"
                animate={{ x: [0, -30, 25, 0], y: [0, 25, -18, 0] }}
                transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.span
                className="lv3Blob lv3BlobBlue"
                animate={{ x: [0, 25, -35, 0], y: [0, -22, 30, 0] }}
                transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
              />
            </motion.div>
          )}
          <motion.div
            className="lv3HeroInner"
            variants={staggerParent}
            initial="hidden"
            animate="show"
          >
            <motion.span className="lv3Eyebrow" variants={item}>
              {landingCopy.heroEyebrow}
            </motion.span>
            <motion.div className="lv3AccentLine" variants={line} />
            {reduce ? (
              <motion.h1 className="lv3HeroTitle" variants={item}>
                {landingCopy.heroTitle}
              </motion.h1>
            ) : (
              <AnimatedHeadline text={landingCopy.heroTitle} />
            )}
            <motion.p className="lv3HeroLead" variants={item}>
              {landingCopy.heroLead}
            </motion.p>
            <motion.div className="lv3HeroActions" variants={item}>
              <a className="lv3BtnPrimary" href="/store">
                {lZh ? "浏览训练计划" : "Browse Programs"}
                <ArrowRight size={18} />
              </a>
              <a className="lv3BtnBlue" href="/?invite=client">
                {lZh ? "一对一训练" : "Train with us 1:1"}
              </a>
            </motion.div>
            <motion.div className="lv3HeroStats" variants={item}>
              <div>
                <strong>
                  <Counter to={landingPrograms.length} reduce={reduce} />
                </strong>
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
            </motion.div>
          </motion.div>
        </section>

        {/* Credibility marquee */}
        <div className="lv3Marquee" aria-hidden="true">
          <div className="lv3MarqueeTrack">
            {[...marqueeItems, ...marqueeItems].map((w, i) => (
              <span key={i}>
                {w}
                <i>◆</i>
              </span>
            ))}
          </div>
        </div>

        {/* Three ways to train */}
        <motion.section className="lv3Paths" id="paths" {...reveal}>
          <motion.div className="lv3SectionHead" variants={item}>
            <span className="lv3Eyebrow">{lZh ? "选择你的路径" : "Choose your path"}</span>
            <h2>{lZh ? "三种方式，开始训练。" : "Three ways to train."}</h2>
          </motion.div>
          <motion.div className="lv3PathGrid lv3PathGrid3" variants={staggerParent}>
            <motion.article className="lv3PathCard" variants={item}>
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
            </motion.article>

            <motion.article className="lv3PathCard lv3PathCardBlue" variants={item}>
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
            </motion.article>

            <motion.article className="lv3PathCard lv3PathCardOx" variants={item}>
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
            </motion.article>
          </motion.div>
        </motion.section>

        {/* Featured programs */}
        {featuredPrograms.length > 0 && (
          <motion.section className="lv3Featured" {...reveal}>
            <motion.div className="lv3SectionHead" variants={item}>
              <span className="lv3Eyebrow">{landingCopy.programsTitle}</span>
              <h2>{lZh ? "按项目、赛季和身体需求选择。" : "Built by sport, season, and body."}</h2>
            </motion.div>
            <motion.div className="lv3FeaturedGrid" variants={staggerParent}>
              {featuredPrograms.map((program) => (
                <motion.div
                  variants={item}
                  key={program.recordId || program.programName}
                >
                  <a className="lv3ProgramCard" href="/store">
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
                </motion.div>
              ))}
            </motion.div>
            <a className="lv3SeeAll" href="/store">
              {landingCopy.viewPrograms} <ArrowRight size={16} />
            </a>
          </motion.section>
        )}

        {/* How it works */}
        <motion.section className="lv3Steps" {...reveal}>
          <motion.div className="lv3SectionHead" variants={item}>
            <span className="lv3Eyebrow">{landingCopy.stepsTitle}</span>
            <h2>{lZh ? "从购买到开练，只需四步。" : "From purchase to training in four steps."}</h2>
          </motion.div>
          <motion.div className="lv3StepGrid" variants={staggerParent}>
            {landingSteps.map(([title, body], index) => (
              <motion.div className="lv3StepCard" variants={item} key={title}>
                <span className="lv3StepNum">{String(index + 1).padStart(2, "0")}</span>
                <strong>{title}</strong>
                <p>{body}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.section>

        {/* In-person */}
        <motion.section className="lv3InPerson" id="inperson" {...reveal}>
          <motion.div className="lv3InPersonCopy" variants={item}>
            <span className="lv3Eyebrow">{landingCopy.navInPerson}</span>
            <h2>{landingCopy.inPersonTitle}</h2>
            <p>{landingCopy.inPersonBody}</p>
          </motion.div>
          <motion.div className="lv3Wechat" variants={item}>
            <img
              src="https://i.ibb.co/Y4nXVG4g/Weixin-Image-20260611202846-56-2.jpg"
              alt="WeChat QR"
            />
            <strong>{lZh ? "扫码加微信咨询" : "Scan for WeChat"}</strong>
          </motion.div>
        </motion.section>

        {/* Final CTA */}
        <motion.section className="lv3FinalCta" {...reveal}>
          <div className="lv3HeroGlow" aria-hidden="true" />
          <motion.h2 variants={item}>{lZh ? "为训练而生。" : "Built for Training."}</motion.h2>
          <motion.p variants={item}>
            {lZh
              ? "从数字训练计划开始，或申请一对一线上 / 线下教练服务。"
              : "Start with a digital program, or train with us 1:1 — online or in person."}
          </motion.p>
          <motion.div className="lv3HeroActions lv3FinalActions" variants={item}>
            <a className="lv3BtnPrimary" href="/store">
              {lZh ? "浏览训练计划" : "Browse Programs"}
              <ArrowRight size={18} />
            </a>
            <a className="lv3BtnBlue" href="/?invite=client">
              {lZh ? "一对一训练" : "Train with us 1:1"}
            </a>
          </motion.div>
        </motion.section>
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
