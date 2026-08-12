// Yumei's all-in-one business handbook: product suite, store flow, pricing,
// KOL strategy. Chinese is the primary document; every string carries an
// English rendering so the app's language toggle serves founders too.
// Facts (pricing, athlete results) verified 2026-08-12 — recheck against the
// live store before quoting externally.
import {
  ArrowRight,
  ArrowUpRight,
  BadgeDollarSign,
  BookOpenCheck,
  CheckCircle2,
  ClipboardCheck,
  Dumbbell,
  Globe2,
  Lightbulb,
  MessageCircle,
  MonitorSmartphone,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";

// [zh, en] pairs; render picks by app language.
type Pair = readonly [string, string];

const glossary: ReadonlyArray<readonly [Pair, Pair]> = [
  [["训练计划", "Training program"], ["把几周到几个月的训练按顺序安排好，而不是每天临时找动作。", "Weeks to months of training arranged in a deliberate order, instead of improvising exercises every day."]],
  [["周期化", "Periodization"], ["让训练从基础、力量、爆发到比赛状态逐步推进，并安排恢复。", "Training progresses in phases — base, strength, power, competition form — with recovery planned in."]],
  [["组 / 次", "Sets / reps"], ["“3 组 × 8 次”表示一个动作做 3 轮，每轮 8 次。", "“3 sets × 8 reps” means doing an exercise for 3 rounds of 8 repetitions each."]],
  [["RPE", "RPE"], ["主观用力程度，1 分非常轻松，10 分接近极限。", "Rating of Perceived Exertion — how hard an effort feels, from 1 (very easy) to 10 (near maximum)."]],
  [["训练负荷", "Training load"], ["训练量与强度的综合概念，用来避免练得太少或长期过量。", "The combination of training volume and intensity — used to avoid doing too little or chronically too much."]],
  [["PR", "PR"], ["Personal Record，个人最佳纪录，例如某动作历史最高重量。", "Personal Record — an athlete's all-time best, e.g. the heaviest weight ever lifted in an exercise."]],
];

const webFeatures: ReadonlyArray<readonly [Pair, Pair]> = [
  [["公开官网", "Public website"], ["用品牌故事解释 NX LIMIT 是什么，展示数字计划、线上一对一和线下服务三条路径。", "Tells the NX LIMIT brand story and presents the three paths: digital programs, online 1:1 coaching, and in-person services."]],
  [["训练商城", "Training store"], ["按运动方向浏览计划，查看课程长度、每周次数、适合水平、价格和样板周。", "Browse programs by sport; see program length, sessions per week, level, price, and a sample week."]],
  [["客户门户", "Client portal"], ["客户查看今日任务、训练日历、已购计划、教练消息、测试数据、历史纪录与状态趋势。", "Clients see today's session, their calendar, purchased programs, coach messages, test results, history, and wellness trends."]],
  [["训练播放器", "Workout player"], ["逐动作展示视频、技术要点、组数、次数、节奏和休息；客户边练边记录实际完成数据。", "Shows each exercise with video, technique cues, sets, reps, tempo and rest; clients log what they actually did as they train."]],
  [["计划排期", "Program scheduling"], ["购买后可按月、按周或逐日把课程放进日历；符合条件的客户可调整剩余训练日期。", "After purchase, sessions drop into the calendar by month, week, or day; eligible clients can reschedule remaining sessions."]],
  [["教练工作台", "Coach console"], ["教练建立动作库和计划、分配课程、查看完成情况、反馈视频、管理客户、团队、订单与收入。", "Coaches build exercise libraries and programs, assign sessions, review completions, give video feedback, and manage clients, teams, orders and revenue."]],
  [["测试与数据", "Testing & data"], ["记录力量、跳跃、跑步和其他表现指标，把训练结果从“感觉”变成可回顾的数据。", "Records strength, jump, running and other performance metrics — turning “how training feels” into reviewable data."]],
  [["双语体验", "Bilingual experience"], ["主要客户页面支持中文与英文，降低国内客户和国际教练之间的沟通成本。", "Key client pages work in Chinese and English, lowering the communication cost between Chinese clients and international coaches."]],
];

const miniFeatures: ReadonlyArray<readonly [Pair, Pair]> = [
  [["1. 登录与绑定", "1. Login & binding"], ["客户用姓名与手机号找到自己的账户；后续可绑定微信，减少重复登录。", "Clients find their account with name + phone; WeChat binding removes repeat logins afterwards."]],
  [["2. 首页", "2. Home"], ["先看到今天要做什么、教练最新消息、本周完成进度和连续完成周数。", "First thing shown: today's session, the coach's latest message, this week's progress, and the completion streak."]],
  [["3. 训练日历", "3. Training calendar"], ["查看未来课程、已完成课程和休息日；需要时重新安排单次或后续训练。", "See upcoming sessions, completed ones and rest days; reschedule a single session or the rest of the plan when needed."]],
  [["4. 训练执行", "4. Doing the workout"], ["打开课程后看动作视频和要点，逐组填写重量、次数、时间或距离，并使用休息计时器。", "Open a session to watch exercise videos and cues, log weight, reps, time or distance set by set, and use the rest timer."]],
  [["5. 个性化调整", "5. Personal adjustments"], ["查看替代动作、历史成绩、上次重量和个人最佳；器械不合适时可换动作。", "See alternate exercises, history, last weights and PRs; swap an exercise when the equipment doesn't fit."]],
  [["6. 弱网保护", "6. Weak-signal protection"], ["课程可缓存；没有信号时记录先保存在手机，联网后再自动同步。", "Sessions are cached; with no signal, logs save on the phone first and sync automatically once back online."]],
  [["7. 状态与负荷", "7. Wellness & load"], ["提交每日睡眠、疲劳、压力、酸痛等状态，以及技术训练和有氧训练的 RPE 与分钟数。", "Clients submit daily sleep, fatigue, stress and soreness, plus RPE and minutes for skill and conditioning work."]],
  [["8. 教练沟通", "8. Coach communication"], ["接收教练消息、填写问卷、上传动作视频并直接向教练提问。", "Receive coach messages, fill in questionnaires, upload technique videos and ask the coach questions directly."]],
  [["9. 我的数据", "9. My numbers"], ["查看训练历史、PR、预估力量水平、跑步配速区间与教练记录的测试结果。", "View training history, PRs, estimated strength levels, running pace zones and coach-recorded test results."]],
  [["10. 微信商城", "10. WeChat store"], ["在小程序内浏览数字计划、线上一对一和线下咨询，并完成微信支付或提交咨询。", "Browse digital programs, online 1:1 and in-person inquiries inside the mini program, and pay with WeChat Pay or submit an inquiry."]],
];

const storeSteps: ReadonlyArray<readonly [Pair, Pair]> = [
  [["发现", "Discover"], ["从官网内容、KOL 内容、二维码或朋友分享进入商城；链接可带活动归因码。", "People arrive from website content, KOL content, QR codes or a friend's share; links can carry a campaign attribution code."]],
  [["选择", "Choose"], ["先按运动项目筛选，再比较单阶段计划、完整组合包和关节加购模块。", "Filter by sport first, then compare single-phase programs, full bundles, and joint-specific add-on modules."]],
  [["理解", "Understand"], ["查看计划目标、周期、每周次数、适合水平、教练介绍、常见问题和样板周。", "Review the program's goal, duration, weekly sessions, level, coach introduction, FAQ and a sample week."]],
  [["组合", "Combine"], ["选择主计划后，可加购肩、手指等专项模块；完整组合包直接显示单买总价与节省金额。", "After picking a main program, add shoulder or finger modules; bundles show the buy-separately total and the saving."]],
  [["登记", "Register"], ["填写姓名、手机号/微信号并同意隐私政策与服务条款，系统先创建订单和客户编号。", "Enter name, phone/WeChat and accept the privacy policy and terms; the system creates the order and a client ID first."]],
  [["支付", "Pay"], ["小程序可拉起微信支付；网页流程也支持二维码与付款参考码，便于核对订单。", "The mini program raises WeChat Pay directly; the web flow also supports QR codes and a payment reference code for order matching."]],
  [["开通", "Activate"], ["付款确认后，数字计划进入“我的计划”；客户完成问卷并选择开始日期。", "Once payment confirms, the digital program appears in “My Programs”; the client completes the intake and picks a start date."]],
  [["训练与复购", "Train & rebuy"], ["客户按日历训练、记录数据、收到提醒与反馈；完成后进入下一阶段、组合包或一对一服务。", "Clients train by the calendar, log data, get reminders and feedback; on finishing, they move to the next phase, a bundle, or 1:1 coaching."]],
];

const pricing: ReadonlyArray<readonly [Pair, Pair, string, Pair]> = [
  [["攀岩者肩部 / 攀岩者指力", "Climber's Shoulder / Climber's Fingers"], ["4 周，每周 2 次短课", "4 weeks, 2 short sessions/week"], "CNY 99", ["专项加购；页面对比价 CNY 149", "Specialty add-on; compare-at price CNY 149"]],
  [["攀岩 1 · 基础", "Climbing 1 · Foundation"], ["4 周，每周 4 个训练日", "4 weeks, 4 training days/week"], "CNY 299", ["第一阶段：动作质量与基础力量", "Phase 1: movement quality and base strength"]],
  [["攀岩 2 · 基础力量", "Climbing 2 · Base Strength"], ["4 周，每周 4 个训练日", "4 weeks, 4 training days/week"], "CNY 299", ["第二阶段：指力板、拉力与下肢力量", "Phase 2: hangboard, pulling and lower-body strength"]],
  [["攀岩 3 · 爆发力", "Climbing 3 · Power"], ["4 周，每周 4 个训练日", "4 weeks, 4 training days/week"], "CNY 349", ["第三阶段：爆发拉力与力量耐力", "Phase 3: explosive pulling and strength endurance"]],
  [["攀岩 4 · 巅峰表现", "Climbing 4 · Peak Performance"], ["4 周，每周 4 个训练日", "4 weeks, 4 training days/week"], "CNY 349", ["第四阶段：维持强度并在比赛前减量", "Phase 4: hold intensity and taper before competition"]],
  [["攀岩第一季 · 全系列", "Climbing Season 1 · Full Series"], ["完整 16 周，含 1–4 阶段", "Full 16 weeks, phases 1–4"], "CNY 899", ["分开购买共 CNY 1,296，示例节省 CNY 397", "CNY 1,296 bought separately — an example saving of CNY 397"]],
];

const coachingPricing: ReadonlyArray<readonly [Pair, string, string]> = [
  [["1 个月", "1 month"], "CNY 2,500 / 月 per month", "CNY 2,500"],
  [["3 个月", "3 months"], "CNY 2,100 / 月 per month", "CNY 6,300"],
  [["6 个月", "6 months"], "CNY 1,900 / 月 per month", "CNY 11,400"],
  [["12 个月", "12 months"], "CNY 1,700 / 月 per month", "CNY 20,400"],
];

interface KolCard {
  name: string;
  label: Pair;
  proof: Pair;
  role: Pair;
  series: ReadonlyArray<Pair>;
  offer: Pair;
  measure: Pair;
  youth?: boolean;
}

const kols: ReadonlyArray<KolCard> = [
  {
    name: "骆知鹭 Luo Zhilu",
    label: ["奥运新生代 · 女性攀岩 · 成长突破", "Olympic new generation · women's climbing · breakthrough growth"],
    proof: ["公开资料要点：巴黎 2024 攀石与难度两项全能参赛者；2022 年首次参加 IFSC 世界杯即获得抱石铜牌。", "Public record: competed in the Paris 2024 Boulder & Lead combined; won boulder bronze in her first IFSC World Cup in 2022."],
    role: ["适合作为“年轻运动员如何建立长期训练基础”的代表，连接青少年、年轻女性、家长与竞技攀岩受众。", "Best cast as “how a young athlete builds a long-term training base” — connecting youth, young women, parents and competitive climbers."],
    series: [
      ["《奥运选手也从基础开始》短视频系列", "“Olympians start from the basics too” short-video series"],
      ["训练周真实片段：力量、恢复、攀爬如何配合", "Real training-week footage: how strength, recovery and climbing fit together"],
      ["骆知鹭同款 4 周基础挑战（需授权后命名）", "A “Luo Zhilu” 4-week foundation challenge (name requires licensing)"],
      ["一次直播：比赛期如何安排体能训练", "One livestream: how physical training is arranged around competition season"],
    ],
    offer: ["入口内容 → 免费样板周 → 攀岩 1 · 基础 CNY 299 → 第一季完整组合 CNY 899", "Entry content → free sample week → Climbing 1 · Foundation CNY 299 → Season 1 bundle CNY 899"],
    measure: ["样板周打开率、299 元产品转化率、女性/青少年新客占比、完整系列升级率", "Sample-week open rate, CNY 299 conversion, share of new female/youth clients, upgrade rate to the full series"],
  },
  {
    name: "潘愚非 Pan Yufei",
    label: ["双届奥运选手 · 长期主义 · 高水平男性攀岩", "Two-time Olympian · long-term consistency · elite men's climbing"],
    proof: ["公开资料要点：东京与巴黎两届奥运会参赛者；2025 年伯尔尼世界杯获得个人首个抱石世界杯冠军。", "Public record: competed at both the Tokyo and Paris Olympics; won his first Boulder World Cup title in Bern, 2025."],
    role: ["适合作为“多年坚持、训练调整与成熟运动员进阶”的代表，提升品牌专业可信度并触达进阶攀岩者。", "Best cast as “years of consistency, training adjustments and mature-athlete progression” — building professional credibility and reaching advanced climbers."],
    series: [
      ["《冠军不是一天练成的》训练纪录片", "“Champions aren't built in a day” training documentary"],
      ["法式对比、拉力与爆发力的通俗拆解", "Plain-language breakdowns of technique contrasts, pulling strength and power"],
      ["赛前一周：为什么减少训练量反而表现更好", "Competition week: why doing less makes you perform better"],
      ["潘愚非训练问答与动作示范", "Pan Yufei training Q&A and exercise demonstrations"],
    ],
    offer: ["专业教育内容 → 攀岩 3/4 单阶段 CNY 349 → 完整 16 周 CNY 899 → 一对一咨询", "Expert educational content → Climbing 3/4 single phase CNY 349 → full 16 weeks CNY 899 → 1:1 inquiry"],
    measure: ["长视频完播率、收藏率、进阶阶段销售、组合包销售、一对一有效咨询数", "Long-video completion, save rate, advanced-phase sales, bundle sales, qualified 1:1 inquiries"],
  },
  {
    name: "李美妮 Li Meini",
    label: ["世界青年冠军 · 青少年路径 · 家长教育", "Youth world champion · youth pathway · parent education"],
    proof: ["公开资料要点：2024 年 U16 女子抱石世界青年冠军；2025 年 U17 女子抱石世界青年冠军。", "Public record: U16 women's boulder Youth World Champion 2024; U17 women's boulder Youth World Champion 2025."],
    role: ["适合作为“青少年长期发展”的案例，但必须把健康、学习、恢复和家长参与放在成绩之前。", "Best cast as a “long-term youth development” case — with health, school, recovery and parent involvement always placed before results."],
    series: [
      ["《冠军少年如何安全打基础》家长向内容", "“How a young champion builds a safe base” — content aimed at parents"],
      ["教练、运动员与家长三方访谈", "Three-way interview: coach, athlete and parents"],
      ["青少年训练中“更多”不等于“更好”", "In youth training, “more” does not mean “better”"],
      ["动作质量、恢复习惯与训练记录的一周", "A week of movement quality, recovery habits and training logs"],
    ],
    offer: ["家长教育内容 → 免费青少年训练清单 → 先咨询/筛选 → 合适时进入计划或定制服务", "Parent education → free youth training checklist → consult/screen first → program or custom service only when appropriate"],
    measure: ["家长咨询质量、资料下载、咨询到评估率；不以未成年人高频带货或短期 GMV 为主要目标", "Parent-inquiry quality, downloads, inquiry-to-assessment rate; never high-frequency selling through a minor or short-term GMV as the primary goal"],
    youth: true,
  },
];

const flowSteps: ReadonlyArray<readonly [Pair, Pair]> = [
  [["内容与 KOL", "Content & KOLs"], ["让目标人群认识品牌", "Make the target audience aware of the brand"]],
  [["官网 / 小程序", "Website / mini program"], ["解释产品并建立信任", "Explain the products and build trust"]],
  [["商城", "Store"], ["完成选择、支付和归因", "Handle choice, payment and attribution"]],
  [["训练系统", "Training system"], ["交付计划、视频与记录工具", "Deliver programs, videos and logging tools"]],
  [["教练服务", "Coaching service"], ["反馈、调整与长期关系", "Feedback, adjustments and long-term relationships"]],
  [["复购 / 转介绍", "Rebuy / referral"], ["下一阶段、组合包、一对一", "Next phase, bundles, 1:1 coaching"]],
];

const metrics: ReadonlyArray<readonly [Pair, Pair]> = [
  [["注意力", "Attention"], ["播放、完播、收藏、分享", "Views, completion, saves, shares"]],
  [["兴趣", "Interest"], ["商城点击、样板周打开、咨询", "Store clicks, sample-week opens, inquiries"]],
  [["转化", "Conversion"], ["订单数、支付转化率、客单价", "Orders, payment conversion, average order value"]],
  [["交付", "Delivery"], ["计划开通、首周训练完成率", "Program activation, first-week completion rate"]],
  [["留存", "Retention"], ["4 周完成率、下一阶段购买", "4-week completion, next-phase purchases"]],
  [["口碑", "Word of mouth"], ["评价、转介绍、KOL 内容二次传播", "Reviews, referrals, re-shares of KOL content"]],
];

export default function CompanyBriefPage({ language = "zh" }: { language?: string }) {
  const en = language === "en";
  const p = (pair: Pair) => (en ? pair[1] : pair[0]);
  return (
    <article className="fopsBizPlan" lang={en ? "en" : "zh-CN"} data-app-language={language}>
      <header className="fopsBizHero" id="top">
        <div>
          <span><Sparkles size={16}/> {en ? "Yumei's first all-in-one business handbook" : "Yumei 第一份全业务手册"}</span>
          <h1>{en ? "NX LIMIT: the full business and growth plan" : "NX LIMIT 业务全景与市场增长计划"}</h1>
          <p>{en
            ? "What the products are, how customers buy, how training is delivered, and how KOLs drive growth — the whole business explained so someone outside the fitness industry can follow it."
            : "从产品是什么、客户如何购买、训练如何交付，到 KOL 如何帮助增长——用非健身行业人士也能理解的方式，一次讲清完整业务。"}</p>
          <div className="fopsBizMeta"><b>{en ? "Internal working document" : "内部工作文件"}</b><b>{en ? "Chinese is the primary document" : "中文主文档"}</b><b>{en ? "Updated: 2026-08-12" : "更新：2026 年 8 月 12 日"}</b></div>
        </div>
        <nav aria-label={en ? "Contents" : "文档目录"}>
          <a href="#overview">{en ? "Overview" : "业务总览"}</a><a href="#products">{en ? "Products & features" : "产品与功能"}</a><a href="#journey">{en ? "Buying journey" : "购买流程"}</a><a href="#kol">{en ? "KOL plan" : "KOL 方案"}</a><a href="#action">{en ? "90-day plan" : "90 天行动"}</a>
        </nav>
      </header>

      <section className="fopsBizLead" id="overview">
        <Target/><div><strong>{en ? "If you remember one sentence" : "先记住这一句话"}</strong><p>{en
          ? "NX LIMIT is not an account that posts a few exercises. It is a system that turns elite training knowledge into something everyday athletes can buy, understand, execute, record, and keep upgrading."
          : "NX LIMIT 不是一个“发几个健身动作”的账号，而是一套把高水平训练知识变成普通运动员可以购买、看懂、执行、记录并持续升级的数字化训练服务。"}</p></div>
      </section>

      <section className="fopsBizSection">
        <div className="fopsBizHeading"><TrendingUp/><div><span>{en ? "01 · Business logic" : "01 · 商业逻辑"}</span><h2>{en ? "We don't sell exercises — we sell the full path from goal to progress" : "我们卖的不是动作，而是“从目标到进步”的完整路径"}</h2></div></div>
        <div className="fopsBizFlow">
          {flowSteps.map(([title, body], i) => (
            <div key={title[0]}><i>{i + 1}</i><strong>{p(title)}</strong><p>{p(body)}</p>{i < flowSteps.length - 1 ? <ArrowRight/> : null}</div>
          ))}
        </div>
        <div className="fopsBizGrid3">
          <article><b>{en ? "For individuals" : "面向个人"}</b><h3>{en ? "Digital programs & 1:1" : "数字计划与一对一"}</h3><p>{en ? "Start with low-barrier self-serve products; upgrade to online coaching when more feedback is needed." : "从低门槛自助产品开始，需要更多反馈时升级为在线教练。"}</p></article>
          <article><b>{en ? "For institutions" : "面向机构"}</b><h3>{en ? "In-person training & consulting" : "线下训练与咨询"}</h3><p>{en ? "Custom training or professional consulting for athletes, clubs, schools and professional teams." : "为运动员、俱乐部、学校、专业队伍提供定制训练或专业咨询。"}</p></article>
          <article><b>{en ? "Long-term assets" : "长期资产"}</b><h3>{en ? "Data, content & brand trust" : "数据、内容与品牌信任"}</h3><p>{en ? "Every training log, coach-made piece of content and real case study raises later conversion and retention." : "每次训练记录、教练内容和真实案例都会提高后续转化与留存。"}</p></article>
        </div>
      </section>

      <section className="fopsBizSection">
        <div className="fopsBizHeading"><Lightbulb/><div><span>{en ? "Before reading" : "阅读准备"}</span><h2>{en ? "Six training terms, explained in plain language" : "六个常见训练词，先用白话讲清楚"}</h2></div></div>
        <div className="fopsBizGlossary">{glossary.map(([term, body]) => <article key={term[0]}><strong>{p(term)}</strong><p>{p(body)}</p></article>)}</div>
      </section>

      <section className="fopsBizSection" id="products">
        <div className="fopsBizHeading"><Globe2/><div><span>02 · Web App</span><h2>{en ? "The web app: one system from acquisition to training delivery" : "网页应用：从获客到训练交付的完整系统"}</h2></div></div>
        <p className="fopsBizIntro">{en
          ? "The web serves both clients and coaches. Clients get a simple, clear buying and training experience; the coach console hides the complexity of program building, client management and data review behind it."
          : "网页端既服务客户，也服务教练。客户看到的是简单清楚的购买和训练体验；教练端负责把复杂的计划编排、客户管理和数据复盘藏在后面。"}</p>
        <div className="fopsBizFeatureGrid">{webFeatures.map(([title, body], i) => <article key={title[0]}><i>{String(i + 1).padStart(2, "0")}</i><div><strong>{p(title)}</strong><p>{p(body)}</p></div></article>)}</div>
        <div className="fopsBizNote"><MonitorSmartphone/><p><strong>{en ? "Why the web matters: " : "网页端的价值："}</strong>{en
          ? "best for deep reading, comparing products, big calendars, coach work and full data review — and clients never need to install a separate app."
          : "适合深度阅读、比较产品、查看大日历、教练办公和完整数据复盘；客户不需要下载安装独立 App。"}</p></div>
      </section>

      <section className="fopsBizSection">
        <div className="fopsBizHeading"><Smartphone/><div><span>{en ? "03 · WeChat mini program" : "03 · 微信小程序"}</span><h2>{en ? "The mini program: today's actual training, inside WeChat" : "小程序：把每天真正要做的训练放进微信"}</h2></div></div>
        <p className="fopsBizIntro">{en
          ? "The mini program shares the same clients, programs and training data as the web — it is not a separate product. It is built for the training floor: fast to open, easy to pay, with messages and sharing inside the WeChat ecosystem."
          : "小程序与网页使用同一套客户、课程和训练数据，不是另一个独立产品。它更适合训练现场：打开快、支付方便、消息和分享都在微信生态内。"}</p>
        <div className="fopsBizSteps">{miniFeatures.map(([title, body]) => <article key={title[0]}><strong>{p(title)}</strong><p>{p(body)}</p></article>)}</div>
        <div className="fopsBizNote is-green"><CheckCircle2/><p><strong>{en ? "The experience that matters most: " : "最重要的体验："}</strong>{en
          ? "a client opens today's session at the gym, watches the videos, logs set by set with the rest timer — and loses nothing even on a bad connection."
          : "客户在场馆里打开今天的课程，看视频、逐组记录、计时休息；即使网络差也不会丢失训练数据。"}</p></div>
      </section>

      <section className="fopsBizSection">
        <div className="fopsBizHeading"><Dumbbell/><div><span>{en ? "04 · Product suite" : "04 · 产品套件"}</span><h2>{en ? "Three ways to train, matching three kinds of customer needs" : "三种训练方式，对应三种客户需求"}</h2></div></div>
        <div className="fopsBizOffers">
          <article><em>{en ? "Low barrier / scalable" : "低门槛 / 可规模化"}</em><h3>{en ? "Digital training programs" : "数字训练计划"}</h3><p>{en ? "Pre-built phased programs. Clients train on their own; the system handles the calendar, videos, logging and progress." : "提前编排好的阶段性课程。客户自主执行，系统负责日历、视频、记录和进度。"}</p><ul><li>{en ? "For: people with a clear goal who train independently" : "适合：目标明确、愿意自主训练的人"}</li><li>{en ? "Delivery: portal + mini program after purchase" : "交付：购买后进入门户和小程序"}</li><li>{en ? "Advantage: sells repeatedly — not limited by coach hours" : "优势：可重复销售，不受教练时间一对一限制"}</li></ul></article>
          <article className="is-blue"><em>{en ? "High value / deep service" : "高价值 / 深度服务"}</em><h3>{en ? "Online 1:1 coaching" : "线上一对一教练"}</h3><p>{en ? "Customized to the person's sport, season, equipment, recovery and schedule, adjusted through weekly reviews." : "根据个人项目、赛季、器械、恢复和时间安排定制，并通过每周复盘持续调整。"}</p><ul><li>{en ? "Includes a 30-minute consult, weekly feedback, WeChat contact" : "包含 30 分钟咨询、每周反馈、微信沟通"}</li><li>{en ? "For: people who need supervision, technique feedback or complex adjustments" : "适合：需要监督、技术反馈或复杂调整的人"}</li><li>{en ? "Longer terms have a lower average monthly price" : "长期周期的月均价格更低"}</li></ul></article>
          <article className="is-red"><em>{en ? "Custom / institutional" : "定制 / 机构合作"}</em><h3>{en ? "In-person training & consulting" : "线下训练与咨询"}</h3><p>{en ? "For individuals, clubs, schools, professional teams and institutions — scoped to the actual need." : "面向个人、俱乐部、学校、专业队和机构，按需求设计服务范围。"}</p><ul><li>{en ? "Athlete training, team sessions, lectures, program design" : "可做运动员训练、团队课、讲座、路线规划"}</li><li>{en ? "First collect group size, goals, duration, location and equipment" : "先收集人数、目标、周期、地点和器械"}</li><li>{en ? "Quoted individually once scope and dates are confirmed" : "确认档期与范围后单独报价"}</li></ul></article>
        </div>
      </section>

      <section className="fopsBizSection" id="journey">
        <div className="fopsBizHeading"><ShoppingBag/><div><span>05 · Store Flow</span><h2>{en ? "From first seeing our content to actually training" : "客户从第一次看到内容，到真正开始训练"}</h2></div></div>
        <div className="fopsBizJourney">{storeSteps.map(([title, body], i) => <article key={title[0]}><i>{i + 1}</i><div><strong>{p(title)}</strong><p>{p(body)}</p></div></article>)}</div>
        <div className="fopsBizCtaRow"><a href="/store" target="_blank" rel="noreferrer">{en ? "Open the live store" : "打开实时商城"} <ArrowUpRight/></a><a href="/coaching" target="_blank" rel="noreferrer">{en ? "See the 1:1 flow" : "查看一对一流程"} <ArrowUpRight/></a><a href="/in-person" target="_blank" rel="noreferrer">{en ? "See in-person inquiries" : "查看线下咨询"} <ArrowUpRight/></a></div>
      </section>

      <section className="fopsBizSection">
        <div className="fopsBizHeading"><BadgeDollarSign/><div><span>{en ? "06 · Pricing examples" : "06 · 价格示例"}</span><h2>{en ? "The current price structure, as it can be explained externally" : "当前可对外理解的产品价格结构"}</h2></div></div>
        <h3 className="fopsBizSubhead">{en ? "Digital climbing products" : "数字攀岩产品"}</h3>
        <div className="fopsBizTable"><div className="is-head"><span>{en ? "Product" : "产品"}</span><span>{en ? "Delivery" : "交付"}</span><span>{en ? "Price" : "价格"}</span><span>{en ? "How to read it" : "如何理解"}</span></div>{pricing.map((row) => <div key={row[0][0]}><span>{p(row[0])}</span><span>{p(row[1])}</span><span>{row[2]}</span><span>{p(row[3])}</span></div>)}</div>
        <h3 className="fopsBizSubhead">{en ? "Online 1:1 coaching" : "线上一对一教练"}</h3>
        <div className="fopsBizTable is-compact"><div className="is-head"><span>{en ? "Term" : "服务周期"}</span><span>{en ? "Average per month" : "月均价格"}</span><span>{en ? "Paid once, total" : "一次支付总价"}</span></div>{coachingPricing.map((row) => <div key={row[0][0]}><span>{p(row[0])}</span><span>{en ? row[1].replace(" / 月 per month", " / month") : row[1].replace(" per month", "")}</span><span>{row[2]}</span></div>)}</div>
        <div className="fopsBizWarning"><ShieldCheck/><p><strong>{en ? "Pricing publication rule: " : "价格发布规则："}</strong>{en
          ? "the above are examples verified on 2026-08-12. Digital prices follow the live store; in-person services never publish a flat price — group size, location, duration, travel and scope must be confirmed first."
          : "以上是 2026 年 8 月 12 日核对的示例。数字计划以实时商城为准；线下服务不公开承诺统一价格，必须先确认人数、地点、周期、差旅和交付范围。"}</p></div>
      </section>

      <section className="fopsBizSection" id="kol">
        <div className="fopsBizHeading"><Users/><div><span>{en ? "07 · KOL growth plan" : "07 · KOL 增长方案"}</span><h2>{en ? "Using athletes' real training stories to explain an expert product to everyday people" : "用运动员真实训练故事，把专业产品讲给普通人听"}</h2></div></div>
        <div className="fopsBizWarning is-strong"><ClipboardCheck/><p><strong>{en ? "Important: " : "重要："}</strong>{en
          ? "everything below is a proposal example — no athlete has signed, licensed, or endorsed NX LIMIT. Before publishing any name, likeness, training data or “signature” product, written authorization from the athlete/their management is mandatory; minors additionally require guardian and governing-body consent."
          : "以下都是合作提案示例，不代表运动员已签约、已授权或已为 NX LIMIT 代言。发布姓名、肖像、训练数据或“同款”产品前，必须完成本人/经纪团队书面授权；未成年人还需要监护人与相关管理方许可。"}</p></div>
        <div className="fopsBizKol">{kols.map((k) => <article key={k.name} className={k.youth ? "is-youth" : ""}><header><div><span>{p(k.label)}</span><h3>{k.name}</h3></div>{k.youth ? <b>{en ? "Minor protection" : "未成年人保护"}</b> : null}</header><p className="fopsBizProof">{p(k.proof)}</p><dl><div><dt>{en ? "Strategic role" : "战略角色"}</dt><dd>{p(k.role)}</dd></div><div><dt>{en ? "Content series" : "内容系列"}</dt><dd><ul>{k.series.map((x) => <li key={x[0]}>{p(x)}</li>)}</ul></dd></div><div><dt>{en ? "Conversion path" : "转化路径"}</dt><dd>{p(k.offer)}</dd></div><div><dt>{en ? "What to watch" : "观察指标"}</dt><dd>{p(k.measure)}</dd></div></dl></article>)}</div>
        <div className="fopsBizNote"><MessageCircle/><p><strong>{en ? "How to combine them: " : "组合使用建议："}</strong>{en
          ? "Luo Zhilu carries the young, female, “foundation to Olympics” growth story; Pan Yufei carries maturity, consistency and elite credibility; Li Meini carries youth long-term development and parent education. The three should never share one script."
          : "骆知鹭负责年轻、女性与“从基础到奥运”的成长叙事；潘愚非负责成熟、坚持与顶级竞技可信度；李美妮负责青少年长期发展和家长教育。三人的内容不应复制同一套脚本。"}</p></div>
      </section>

      <section className="fopsBizSection">
        <div className="fopsBizHeading"><BookOpenCheck/><div><span>{en ? "08 · Content method" : "08 · 内容操作方法"}</span><h2>{en ? "Six questions Yumei can run through for every piece of content" : "Yumei 每做一条内容，都可以按这六步思考"}</h2></div></div>
        <ol className="fopsBizChecklist">
          <li><b>{en ? "Pick one audience: " : "选一个人群："}</b>{en ? "beginners, advancing climbers, parents of teens, competitive athletes, or institution leads." : "新手、进阶攀岩者、青少年家长、竞技运动员或机构负责人。"}</li>
          <li><b>{en ? "Grab one real problem: " : "抓一个真实问题："}</b>{en ? "not knowing what to train, inconsistent training, cramming volume before competitions, no feedback, easy to quit." : "不知道练什么、训练不连贯、比赛前乱加量、没有反馈、容易中断。"}</li>
          <li><b>{en ? "Give one immediately usable idea: " : "给一个能立即使用的知识："}</b>{en ? "a rule of thumb, a demonstration, a short checklist — not just brand talk." : "一个判断标准、一段示范、一个小清单，而不是只讲品牌。"}</li>
          <li><b>{en ? "Show evidence of method: " : "展示方法证据："}</b>{en ? "training calendars, sample weeks, exercise videos, coach explanations, licensed training footage or data." : "训练日历、样板周、动作视频、教练解释、合规授权的训练过程或数据。"}</li>
          <li><b>{en ? "Recommend exactly one product: " : "只推荐一个最匹配产品："}</b>{en ? "a digital program, 1:1, or an in-person inquiry — never three CTAs in one piece." : "数字计划、一对一或线下咨询，不要一条内容塞三个 CTA。"}</li>
          <li><b>{en ? "Record the result: " : "记录结果："}</b>{en ? "links carry a campaign code; the weekly report tracks views, saves, clicks, leads, orders and revenue." : "内容链接带活动码，周报记录播放、收藏、点击、线索、订单与收入。"}</li>
        </ol>
      </section>

      <section className="fopsBizSection" id="action">
        <div className="fopsBizHeading"><Target/><div><span>{en ? "09 · 90-day plan" : "09 · 90 天计划"}</span><h2>{en ? "From understanding the product to a repeatable growth system" : "从“理解产品”到“建立可重复增长系统”"}</h2></div></div>
        <div className="fopsBizQuarter">
          <article><b>{en ? "Days 1–30" : "第 1–30 天"}</b><h3>{en ? "Understand & lay foundations" : "理解与打基础"}</h3><ul><li>{en ? "Walk the website, store, pre-payment flow, portal and mini program yourself" : "亲自走完官网、商城、支付前流程、门户和小程序"}</li><li>{en ? "Write a one-pager per product: who it's for / who it isn't for" : "为三种产品各写一页“谁适合 / 谁不适合”"}</li><li>{en ? "Build a bank of 20 common customer questions" : "建立 20 个常见客户问题库"}</li><li>{en ? "Standardize brand wording, CTAs and filming request formats" : "统一品牌用词、CTA 和拍摄需求格式"}</li></ul></article>
          <article><b>{en ? "Days 31–60" : "第 31–60 天"}</b><h3>{en ? "Small-scale testing" : "小规模测试"}</h3><ul><li>{en ? "Produce one content set each around foundations, power, and pre-competition tapering" : "围绕基础、爆发、赛前减量各做一组内容"}</li><li>{en ? "Test the sample week, the CNY 299 single phase and the CNY 899 bundle paths" : "测试样板周、CNY 299 单阶段和 CNY 899 组合包路径"}</li><li>{en ? "Prepare an individual partnership brief for each of the three KOLs" : "为三位 KOL 各准备一份独立合作简报"}</li><li>{en ? "Compare clicks, inquiry quality and order attribution weekly" : "每周比较点击、咨询质量与订单归因"}</li></ul></article>
          <article><b>{en ? "Days 61–90" : "第 61–90 天"}</b><h3>{en ? "Scale what works" : "放大有效模式"}</h3><ul><li>{en ? "Scale only proven audiences, topics and CTAs" : "只放大已证明有效的人群、选题和 CTA"}</li><li>{en ? "Expand high-performing shorts into long-form, livestreams and series" : "把高表现短内容扩展为长文、直播和系列课"}</li><li>{en ? "Build post-purchase content for days 1, 7 and 28" : "建立购买后第 1、7、28 天的客户内容"}</li><li>{en ? "Run a monthly review: content → leads → orders → rebuys" : "形成月度复盘：内容 → 线索 → 订单 → 复购"}</li></ul></article>
        </div>
      </section>

      <section className="fopsBizSection">
        <div className="fopsBizHeading"><TrendingUp/><div><span>{en ? "10 · Measuring success" : "10 · 衡量成功"}</span><h2>{en ? "Don't just watch view counts — watch the whole business chain" : "不要只看播放量，要看整条业务链"}</h2></div></div>
        <div className="fopsBizMetrics">{metrics.map(([title, body]) => <article key={title[0]}><strong>{p(title)}</strong><p>{p(body)}</p></article>)}</div>
      </section>

      <section className="fopsBizSection">
        <div className="fopsBizHeading"><ShieldCheck/><div><span>{en ? "11 · Content red lines" : "11 · 内容红线"}</span><h2>{en ? "Professional credibility beats short-term traffic" : "专业可信比短期流量更重要"}</h2></div></div>
        <ul className="fopsBizGuardrails">
          <li>{en ? "Never use an athlete's or client's name, likeness, chat logs, training data or results without written permission." : "未经书面许可，不使用运动员或客户的姓名、肖像、聊天记录、训练数据和成绩。"}</li>
          <li>{en ? "Never guarantee “injury prevention”, “rehabilitation”, “guaranteed results” or any outcome we cannot promise; coaching is not a medical service." : "不保证“防伤”“康复”“一定提高成绩”或其他无法保证的结果；教练服务不是医疗服务。"}</li>
          <li>{en ? "Never publish injuries, diagnoses, medical history or other sensitive health information; even with consent, use only what the content strictly requires." : "不公开伤病、诊断、病史等敏感健康信息；即使本人同意，也只使用完成内容所必需的信息。"}</li>
          <li>{en ? "With minors, protect health, dignity, schooling and long-term development first; never manufacture anxiety about weight, appearance or results." : "涉及未成年人时，先保护健康、尊严、学习与长期发展；不得制造体重、外形或成绩焦虑。"}</li>
          <li>{en ? "Product names, prices, stock, campaign windows and links must be re-verified against the live store on the day of publishing." : "产品名称、价格、库存、活动期限和链接必须在发布当天从实时商城重新核对。"}</li>
          <li>{en ? "Athlete KOL contracts must specify deliverables, channels, license duration, material approval, fees and an exit mechanism." : "运动员 KOL 合作必须写清交付物、使用渠道、授权期限、素材审批、费用与退出机制。"}</li>
        </ul>
      </section>

      <footer className="fopsBizFooter">
        <div><strong>{en ? "Yumei's one-line working formula" : "Yumei 的一句工作公式"}</strong><p>{en
          ? "One audience + one real problem + one useful idea + evidence of method + the best-matching product + a single CTA + a measurable result."
          : "明确人群 + 真实问题 + 有用知识 + 方法证据 + 最匹配产品 + 单一 CTA + 可衡量结果。"}</p></div>
        <div><strong>{en ? "Fact-check sources" : "事实核对来源"}</strong><p><a href="https://images.ifsc-climbing.org/ifsc/image/private/t_q_good/prd/pbqxufgpor5ifjvfkvo5.pdf" target="_blank" rel="noreferrer">IFSC 2024 Media Guide</a> · <a href="https://www.jma-climbing.org/athlete/profile/yufei-pan/" target="_blank" rel="noreferrer">{en ? "Pan Yufei competition profile" : "潘愚非赛事资料"}</a> · <a href="https://www.zs.gov.cn/ywb/news/domesticnews/content/post_2537961.html" target="_blank" rel="noreferrer">{en ? "Li Meini official coverage" : "李美妮官方报道"}</a></p></div>
        <a href="#top">{en ? "Back to top ↑" : "返回顶部 ↑"}</a>
      </footer>
    </article>
  );
}
