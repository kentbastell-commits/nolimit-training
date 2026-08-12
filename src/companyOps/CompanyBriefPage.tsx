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

const glossary = [
  ["训练计划", "把几周到几个月的训练按顺序安排好，而不是每天临时找动作。"],
  ["周期化", "让训练从基础、力量、爆发到比赛状态逐步推进，并安排恢复。"],
  ["组 / 次", "“3 组 × 8 次”表示一个动作做 3 轮，每轮 8 次。"],
  ["RPE", "主观用力程度，1 分非常轻松，10 分接近极限。"],
  ["训练负荷", "训练量与强度的综合概念，用来避免练得太少或长期过量。"],
  ["PR", "Personal Record，个人最佳纪录，例如某动作历史最高重量。"],
];

const webFeatures = [
  ["公开官网", "用品牌故事解释 NX LIMIT 是什么，展示数字计划、线上一对一和线下服务三条路径。"],
  ["训练商城", "按运动方向浏览计划，查看课程长度、每周次数、适合水平、价格和样板周。"],
  ["客户门户", "客户查看今日任务、训练日历、已购计划、教练消息、测试数据、历史纪录与状态趋势。"],
  ["训练播放器", "逐动作展示视频、技术要点、组数、次数、节奏和休息；客户边练边记录实际完成数据。"],
  ["计划排期", "购买后可按月、按周或逐日把课程放进日历；符合条件的客户可调整剩余训练日期。"],
  ["教练工作台", "教练建立动作库和计划、分配课程、查看完成情况、反馈视频、管理客户、团队、订单与收入。"],
  ["测试与数据", "记录力量、跳跃、跑步和其他表现指标，把训练结果从“感觉”变成可回顾的数据。"],
  ["双语体验", "主要客户页面支持中文与英文，降低国内客户和国际教练之间的沟通成本。"],
];

const miniFeatures = [
  ["1. 登录与绑定", "客户用姓名与手机号找到自己的账户；后续可绑定微信，减少重复登录。"],
  ["2. 首页", "先看到今天要做什么、教练最新消息、本周完成进度和连续完成周数。"],
  ["3. 训练日历", "查看未来课程、已完成课程和休息日；需要时重新安排单次或后续训练。"],
  ["4. 训练执行", "打开课程后看动作视频和要点，逐组填写重量、次数、时间或距离，并使用休息计时器。"],
  ["5. 个性化调整", "查看替代动作、历史成绩、上次重量和个人最佳；器械不合适时可换动作。"],
  ["6. 弱网保护", "课程可缓存；没有信号时记录先保存在手机，联网后再自动同步。"],
  ["7. 状态与负荷", "提交每日睡眠、疲劳、压力、酸痛等状态，以及技术训练和有氧训练的 RPE 与分钟数。"],
  ["8. 教练沟通", "接收教练消息、填写问卷、上传动作视频并直接向教练提问。"],
  ["9. 我的数据", "查看训练历史、PR、预估力量水平、跑步配速区间与教练记录的测试结果。"],
  ["10. 微信商城", "在小程序内浏览数字计划、线上一对一和线下咨询，并完成微信支付或提交咨询。"],
];

const storeSteps = [
  ["发现", "从官网内容、KOL 内容、二维码或朋友分享进入商城；链接可带活动归因码。"],
  ["选择", "先按运动项目筛选，再比较单阶段计划、完整组合包和关节加购模块。"],
  ["理解", "查看计划目标、周期、每周次数、适合水平、教练介绍、常见问题和样板周。"],
  ["组合", "选择主计划后，可加购肩、手指等专项模块；完整组合包直接显示单买总价与节省金额。"],
  ["登记", "填写姓名、手机号/微信号并同意隐私政策与服务条款，系统先创建订单和客户编号。"],
  ["支付", "小程序可拉起微信支付；网页流程也支持二维码与付款参考码，便于核对订单。"],
  ["开通", "付款确认后，数字计划进入“我的计划”；客户完成问卷并选择开始日期。"],
  ["训练与复购", "客户按日历训练、记录数据、收到提醒与反馈；完成后进入下一阶段、组合包或一对一服务。"],
];

const pricing = [
  ["攀岩者肩部 / 攀岩者指力", "4 周，每周 2 次短课", "CNY 99", "专项加购；页面对比价 CNY 149"],
  ["攀岩 1 · 基础", "4 周，每周 4 个训练日", "CNY 299", "第一阶段：动作质量与基础力量"],
  ["攀岩 2 · 基础力量", "4 周，每周 4 个训练日", "CNY 299", "第二阶段：指力板、拉力与下肢力量"],
  ["攀岩 3 · 爆发力", "4 周，每周 4 个训练日", "CNY 349", "第三阶段：爆发拉力与力量耐力"],
  ["攀岩 4 · 巅峰表现", "4 周，每周 4 个训练日", "CNY 349", "第四阶段：维持强度并在比赛前减量"],
  ["攀岩第一季 · 全系列", "完整 16 周，含 1–4 阶段", "CNY 899", "分开购买共 CNY 1,296，示例节省 CNY 397"],
];

const coachingPricing = [
  ["1 个月", "CNY 2,500 / 月", "CNY 2,500"],
  ["3 个月", "CNY 2,100 / 月", "CNY 6,300"],
  ["6 个月", "CNY 1,900 / 月", "CNY 11,400"],
  ["12 个月", "CNY 1,700 / 月", "CNY 20,400"],
];

const kols = [
  {
    name: "骆知鹭 Luo Zhilu",
    label: "奥运新生代 · 女性攀岩 · 成长突破",
    proof: "公开资料要点：巴黎 2024 攀石与难度两项全能参赛者；2022 年首次参加 IFSC 世界杯即获得抱石铜牌。",
    role: "适合作为“年轻运动员如何建立长期训练基础”的代表，连接青少年、年轻女性、家长与竞技攀岩受众。",
    series: ["《奥运选手也从基础开始》短视频系列", "训练周真实片段：力量、恢复、攀爬如何配合", "骆知鹭同款 4 周基础挑战（需授权后命名）", "一次直播：比赛期如何安排体能训练"],
    offer: "入口内容 → 免费样板周 → 攀岩 1 · 基础 CNY 299 → 第一季完整组合 CNY 899",
    measure: "样板周打开率、299 元产品转化率、女性/青少年新客占比、完整系列升级率",
  },
  {
    name: "潘愚非 Pan Yufei",
    label: "双届奥运选手 · 长期主义 · 高水平男性攀岩",
    proof: "公开资料要点：东京与巴黎两届奥运会参赛者；2025 年伯尔尼世界杯获得个人首个抱石世界杯冠军。",
    role: "适合作为“多年坚持、训练调整与成熟运动员进阶”的代表，提升品牌专业可信度并触达进阶攀岩者。",
    series: ["《冠军不是一天练成的》训练纪录片", "法式对比、拉力与爆发力的通俗拆解", "赛前一周：为什么减少训练量反而表现更好", "潘愚非训练问答与动作示范"],
    offer: "专业教育内容 → 攀岩 3/4 单阶段 CNY 349 → 完整 16 周 CNY 899 → 一对一咨询",
    measure: "长视频完播率、收藏率、进阶阶段销售、组合包销售、一对一有效咨询数",
  },
  {
    name: "李美妮 Li Meini",
    label: "世界青年冠军 · 青少年路径 · 家长教育",
    proof: "公开资料要点：2024 年 U16 女子抱石世界青年冠军；2025 年 U17 女子抱石世界青年冠军。",
    role: "适合作为“青少年长期发展”的案例，但必须把健康、学习、恢复和家长参与放在成绩之前。",
    series: ["《冠军少年如何安全打基础》家长向内容", "教练、运动员与家长三方访谈", "青少年训练中“更多”不等于“更好”", "动作质量、恢复习惯与训练记录的一周"],
    offer: "家长教育内容 → 免费青少年训练清单 → 先咨询/筛选 → 合适时进入计划或定制服务",
    measure: "家长咨询质量、资料下载、咨询到评估率；不以未成年人高频带货或短期 GMV 为主要目标",
    youth: true,
  },
];

export default function CompanyBriefPage({ language = "zh" }: { language?: string }) {
  return (
    <article className="fopsBizPlan" lang="zh-CN" data-app-language={language}>
      <header className="fopsBizHero" id="top">
        <div>
          <span><Sparkles size={16}/> Yumei 第一份全业务手册</span>
          <h1>NX LIMIT 业务全景与市场增长计划</h1>
          <p>从产品是什么、客户如何购买、训练如何交付，到 KOL 如何帮助增长——用非健身行业人士也能理解的方式，一次讲清完整业务。</p>
          <div className="fopsBizMeta"><b>内部工作文件</b><b>中文主文档</b><b>更新：2026 年 8 月 12 日</b></div>
        </div>
        <nav aria-label="文档目录">
          <a href="#overview">业务总览</a><a href="#products">产品与功能</a><a href="#journey">购买流程</a><a href="#kol">KOL 方案</a><a href="#action">90 天行动</a>
        </nav>
      </header>

      <section className="fopsBizLead" id="overview">
        <Target/><div><strong>先记住这一句话</strong><p>NX LIMIT 不是一个“发几个健身动作”的账号，而是一套把高水平训练知识变成普通运动员可以购买、看懂、执行、记录并持续升级的数字化训练服务。</p></div>
      </section>

      <section className="fopsBizSection">
        <div className="fopsBizHeading"><TrendingUp/><div><span>01 · 商业逻辑</span><h2>我们卖的不是动作，而是“从目标到进步”的完整路径</h2></div></div>
        <div className="fopsBizFlow">
          {[["内容与 KOL","让目标人群认识品牌"],["官网 / 小程序","解释产品并建立信任"],["商城","完成选择、支付和归因"],["训练系统","交付计划、视频与记录工具"],["教练服务","反馈、调整与长期关系"],["复购 / 转介绍","下一阶段、组合包、一对一"]].map((x,i)=><div key={x[0]}><i>{i+1}</i><strong>{x[0]}</strong><p>{x[1]}</p>{i<5?<ArrowRight/>:null}</div>)}
        </div>
        <div className="fopsBizGrid3">
          <article><b>面向个人</b><h3>数字计划与一对一</h3><p>从低门槛自助产品开始，需要更多反馈时升级为在线教练。</p></article>
          <article><b>面向机构</b><h3>线下训练与咨询</h3><p>为运动员、俱乐部、学校、专业队伍提供定制训练或专业咨询。</p></article>
          <article><b>长期资产</b><h3>数据、内容与品牌信任</h3><p>每次训练记录、教练内容和真实案例都会提高后续转化与留存。</p></article>
        </div>
      </section>

      <section className="fopsBizSection">
        <div className="fopsBizHeading"><Lightbulb/><div><span>阅读准备</span><h2>六个常见训练词，先用白话讲清楚</h2></div></div>
        <div className="fopsBizGlossary">{glossary.map(([a,b])=><article key={a}><strong>{a}</strong><p>{b}</p></article>)}</div>
      </section>

      <section className="fopsBizSection" id="products">
        <div className="fopsBizHeading"><Globe2/><div><span>02 · Web App</span><h2>网页应用：从获客到训练交付的完整系统</h2></div></div>
        <p className="fopsBizIntro">网页端既服务客户，也服务教练。客户看到的是简单清楚的购买和训练体验；教练端负责把复杂的计划编排、客户管理和数据复盘藏在后面。</p>
        <div className="fopsBizFeatureGrid">{webFeatures.map(([a,b],i)=><article key={a}><i>{String(i+1).padStart(2,"0")}</i><div><strong>{a}</strong><p>{b}</p></div></article>)}</div>
        <div className="fopsBizNote"><MonitorSmartphone/><p><strong>网页端的价值：</strong>适合深度阅读、比较产品、查看大日历、教练办公和完整数据复盘；客户不需要下载安装独立 App。</p></div>
      </section>

      <section className="fopsBizSection">
        <div className="fopsBizHeading"><Smartphone/><div><span>03 · 微信小程序</span><h2>小程序：把每天真正要做的训练放进微信</h2></div></div>
        <p className="fopsBizIntro">小程序与网页使用同一套客户、课程和训练数据，不是另一个独立产品。它更适合训练现场：打开快、支付方便、消息和分享都在微信生态内。</p>
        <div className="fopsBizSteps">{miniFeatures.map(([a,b])=><article key={a}><strong>{a}</strong><p>{b}</p></article>)}</div>
        <div className="fopsBizNote is-green"><CheckCircle2/><p><strong>最重要的体验：</strong>客户在场馆里打开今天的课程，看视频、逐组记录、计时休息；即使网络差也不会丢失训练数据。</p></div>
      </section>

      <section className="fopsBizSection">
        <div className="fopsBizHeading"><Dumbbell/><div><span>04 · 产品套件</span><h2>三种训练方式，对应三种客户需求</h2></div></div>
        <div className="fopsBizOffers">
          <article><em>低门槛 / 可规模化</em><h3>数字训练计划</h3><p>提前编排好的阶段性课程。客户自主执行，系统负责日历、视频、记录和进度。</p><ul><li>适合：目标明确、愿意自主训练的人</li><li>交付：购买后进入门户和小程序</li><li>优势：可重复销售，不受教练时间一对一限制</li></ul></article>
          <article className="is-blue"><em>高价值 / 深度服务</em><h3>线上一对一教练</h3><p>根据个人项目、赛季、器械、恢复和时间安排定制，并通过每周复盘持续调整。</p><ul><li>包含 30 分钟咨询、每周反馈、微信沟通</li><li>适合：需要监督、技术反馈或复杂调整的人</li><li>长期周期的月均价格更低</li></ul></article>
          <article className="is-red"><em>定制 / 机构合作</em><h3>线下训练与咨询</h3><p>面向个人、俱乐部、学校、专业队和机构，按需求设计服务范围。</p><ul><li>可做运动员训练、团队课、讲座、路线规划</li><li>先收集人数、目标、周期、地点和器械</li><li>确认档期与范围后单独报价</li></ul></article>
        </div>
      </section>

      <section className="fopsBizSection" id="journey">
        <div className="fopsBizHeading"><ShoppingBag/><div><span>05 · Store Flow</span><h2>客户从第一次看到内容，到真正开始训练</h2></div></div>
        <div className="fopsBizJourney">{storeSteps.map(([a,b],i)=><article key={a}><i>{i+1}</i><div><strong>{a}</strong><p>{b}</p></div></article>)}</div>
        <div className="fopsBizCtaRow"><a href="/store" target="_blank" rel="noreferrer">打开实时商城 <ArrowUpRight/></a><a href="/coaching" target="_blank" rel="noreferrer">查看一对一流程 <ArrowUpRight/></a><a href="/in-person" target="_blank" rel="noreferrer">查看线下咨询 <ArrowUpRight/></a></div>
      </section>

      <section className="fopsBizSection">
        <div className="fopsBizHeading"><BadgeDollarSign/><div><span>06 · 价格示例</span><h2>当前可对外理解的产品价格结构</h2></div></div>
        <h3 className="fopsBizSubhead">数字攀岩产品</h3>
        <div className="fopsBizTable"><div className="is-head"><span>产品</span><span>交付</span><span>价格</span><span>如何理解</span></div>{pricing.map(r=><div key={r[0]}>{r.map(c=><span key={c}>{c}</span>)}</div>)}</div>
        <h3 className="fopsBizSubhead">线上一对一教练</h3>
        <div className="fopsBizTable is-compact"><div className="is-head"><span>服务周期</span><span>月均价格</span><span>一次支付总价</span></div>{coachingPricing.map(r=><div key={r[0]}>{r.map(c=><span key={c}>{c}</span>)}</div>)}</div>
        <div className="fopsBizWarning"><ShieldCheck/><p><strong>价格发布规则：</strong>以上是 2026 年 8 月 12 日核对的示例。数字计划以实时商城为准；线下服务不公开承诺统一价格，必须先确认人数、地点、周期、差旅和交付范围。</p></div>
      </section>

      <section className="fopsBizSection" id="kol">
        <div className="fopsBizHeading"><Users/><div><span>07 · KOL 增长方案</span><h2>用运动员真实训练故事，把专业产品讲给普通人听</h2></div></div>
        <div className="fopsBizWarning is-strong"><ClipboardCheck/><p><strong>重要：</strong>以下都是合作提案示例，不代表运动员已签约、已授权或已为 NX LIMIT 代言。发布姓名、肖像、训练数据或“同款”产品前，必须完成本人/经纪团队书面授权；未成年人还需要监护人与相关管理方许可。</p></div>
        <div className="fopsBizKol">{kols.map(k=><article key={k.name} className={k.youth?"is-youth":""}><header><div><span>{k.label}</span><h3>{k.name}</h3></div>{k.youth?<b>未成年人保护</b>:null}</header><p className="fopsBizProof">{k.proof}</p><dl><div><dt>战略角色</dt><dd>{k.role}</dd></div><div><dt>内容系列</dt><dd><ul>{k.series.map(x=><li key={x}>{x}</li>)}</ul></dd></div><div><dt>转化路径</dt><dd>{k.offer}</dd></div><div><dt>观察指标</dt><dd>{k.measure}</dd></div></dl></article>)}</div>
        <div className="fopsBizNote"><MessageCircle/><p><strong>组合使用建议：</strong>骆知鹭负责年轻、女性与“从基础到奥运”的成长叙事；潘愚非负责成熟、坚持与顶级竞技可信度；李美妮负责青少年长期发展和家长教育。三人的内容不应复制同一套脚本。</p></div>
      </section>

      <section className="fopsBizSection">
        <div className="fopsBizHeading"><BookOpenCheck/><div><span>08 · 内容操作方法</span><h2>Yumei 每做一条内容，都可以按这六步思考</h2></div></div>
        <ol className="fopsBizChecklist"><li><b>选一个人群：</b>新手、进阶攀岩者、青少年家长、竞技运动员或机构负责人。</li><li><b>抓一个真实问题：</b>不知道练什么、训练不连贯、比赛前乱加量、没有反馈、容易中断。</li><li><b>给一个能立即使用的知识：</b>一个判断标准、一段示范、一个小清单，而不是只讲品牌。</li><li><b>展示方法证据：</b>训练日历、样板周、动作视频、教练解释、合规授权的训练过程或数据。</li><li><b>只推荐一个最匹配产品：</b>数字计划、一对一或线下咨询，不要一条内容塞三个 CTA。</li><li><b>记录结果：</b>内容链接带活动码，周报记录播放、收藏、点击、线索、订单与收入。</li></ol>
      </section>

      <section className="fopsBizSection" id="action">
        <div className="fopsBizHeading"><Target/><div><span>09 · 90 天计划</span><h2>从“理解产品”到“建立可重复增长系统”</h2></div></div>
        <div className="fopsBizQuarter">
          <article><b>第 1–30 天</b><h3>理解与打基础</h3><ul><li>亲自走完官网、商城、支付前流程、门户和小程序</li><li>为三种产品各写一页“谁适合 / 谁不适合”</li><li>建立 20 个常见客户问题库</li><li>统一品牌用词、CTA 和拍摄需求格式</li></ul></article>
          <article><b>第 31–60 天</b><h3>小规模测试</h3><ul><li>围绕基础、爆发、赛前减量各做一组内容</li><li>测试样板周、CNY 299 单阶段和 CNY 899 组合包路径</li><li>为三位 KOL 各准备一份独立合作简报</li><li>每周比较点击、咨询质量与订单归因</li></ul></article>
          <article><b>第 61–90 天</b><h3>放大有效模式</h3><ul><li>只放大已证明有效的人群、选题和 CTA</li><li>把高表现短内容扩展为长文、直播和系列课</li><li>建立购买后第 1、7、28 天的客户内容</li><li>形成月度复盘：内容 → 线索 → 订单 → 复购</li></ul></article>
        </div>
      </section>

      <section className="fopsBizSection">
        <div className="fopsBizHeading"><TrendingUp/><div><span>10 · 衡量成功</span><h2>不要只看播放量，要看整条业务链</h2></div></div>
        <div className="fopsBizMetrics">{[["注意力","播放、完播、收藏、分享"],["兴趣","商城点击、样板周打开、咨询"],["转化","订单数、支付转化率、客单价"],["交付","计划开通、首周训练完成率"],["留存","4 周完成率、下一阶段购买"],["口碑","评价、转介绍、KOL 内容二次传播"]].map(x=><article key={x[0]}><strong>{x[0]}</strong><p>{x[1]}</p></article>)}</div>
      </section>

      <section className="fopsBizSection">
        <div className="fopsBizHeading"><ShieldCheck/><div><span>11 · 内容红线</span><h2>专业可信比短期流量更重要</h2></div></div>
        <ul className="fopsBizGuardrails"><li>未经书面许可，不使用运动员或客户的姓名、肖像、聊天记录、训练数据和成绩。</li><li>不保证“防伤”“康复”“一定提高成绩”或其他无法保证的结果；教练服务不是医疗服务。</li><li>不公开伤病、诊断、病史等敏感健康信息；即使本人同意，也只使用完成内容所必需的信息。</li><li>涉及未成年人时，先保护健康、尊严、学习与长期发展；不得制造体重、外形或成绩焦虑。</li><li>产品名称、价格、库存、活动期限和链接必须在发布当天从实时商城重新核对。</li><li>运动员 KOL 合作必须写清交付物、使用渠道、授权期限、素材审批、费用与退出机制。</li></ul>
      </section>

      <footer className="fopsBizFooter">
        <div><strong>Yumei 的一句工作公式</strong><p>明确人群 + 真实问题 + 有用知识 + 方法证据 + 最匹配产品 + 单一 CTA + 可衡量结果。</p></div>
        <div><strong>事实核对来源</strong><p><a href="https://images.ifsc-climbing.org/ifsc/image/private/t_q_good/prd/pbqxufgpor5ifjvfkvo5.pdf" target="_blank" rel="noreferrer">IFSC 2024 Media Guide</a> · <a href="https://www.jma-climbing.org/athlete/profile/yufei-pan/" target="_blank" rel="noreferrer">潘愚非赛事资料</a> · <a href="https://www.zs.gov.cn/ywb/news/domesticnews/content/post_2537961.html" target="_blank" rel="noreferrer">李美妮官方报道</a></p></div>
        <a href="#top">返回顶部 ↑</a>
      </footer>
    </article>
  );
}
