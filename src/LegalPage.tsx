import { ArrowLeft, ShieldCheck } from "lucide-react";
import "./LegalPage.css";

type LegalKind = "privacy" | "terms" | "refund" | "business";

const EFFECTIVE_DATE = "12 July 2026";
const EFFECTIVE_DATE_ZH = "2026 年 7 月 12 日";

export default function LegalPage({
  kind,
  lang,
  setLang,
}: {
  kind: LegalKind;
  lang: "en" | "zh";
  setLang: (lang: "en" | "zh") => void;
}) {
  const zh = lang === "zh";
  const title =
    kind === "privacy"
      ? zh
        ? "隐私政策"
        : "Privacy Policy"
      : kind === "terms"
        ? zh
          ? "服务条款"
          : "Terms of Service"
        : kind === "refund"
          ? zh
            ? "退款政策"
            : "Refund Policy"
          : zh
            ? "经营者信息"
            : "Business Information";

  return (
    <div className={`legalPage ${zh ? "zh" : "en"}`}>
      <header className="legalNav">
        <a className="legalBrand" href="/">
          <img src="/nl_wordmark_white.png" alt="No Limit" />
        </a>
        <div className="legalNavActions">
          <a href="/store">{zh ? "训练计划" : "Programs"}</a>
          <button type="button" onClick={() => setLang(zh ? "en" : "zh")}>
            {zh ? "English" : "中文"}
          </button>
        </div>
      </header>

      <main className="legalShell">
        <a className="legalBack" href="/store">
          <ArrowLeft size={16} /> {zh ? "返回" : "Back"}
        </a>
        <div className="legalHero">
          <span className="legalEyebrow">
            <ShieldCheck size={15} /> {zh ? "清晰、透明、尊重隐私" : "Clear, transparent, respectful"}
          </span>
          <h1>{title}</h1>
          <p>{zh ? `生效日期：${EFFECTIVE_DATE_ZH}` : `Effective: ${EFFECTIVE_DATE}`}</p>
        </div>

        <nav className="legalTabs" aria-label={zh ? "法律政策" : "Legal policies"}>
          <a className={kind === "privacy" ? "active" : ""} href="/privacy" aria-current={kind === "privacy" ? "page" : undefined}>
            {zh ? "隐私" : "Privacy"}
          </a>
          <a className={kind === "terms" ? "active" : ""} href="/terms" aria-current={kind === "terms" ? "page" : undefined}>
            {zh ? "条款" : "Terms"}
          </a>
          <a className={kind === "refund" ? "active" : ""} href="/refund" aria-current={kind === "refund" ? "page" : undefined}>
            {zh ? "退款" : "Refunds"}
          </a>
          <a className={kind === "business" ? "active" : ""} href="/business" aria-current={kind === "business" ? "page" : undefined}>
            {zh ? "经营者" : "Business"}
          </a>
        </nav>

        {kind === "privacy" && (zh ? <PrivacyZh /> : <PrivacyEn />)}
        {kind === "terms" && (zh ? <TermsZh /> : <TermsEn />)}
        {kind === "refund" && (zh ? <RefundZh /> : <RefundEn />)}
        {kind === "business" && (zh ? <BusinessZh /> : <BusinessEn />)}

        <div className="legalContact">
          <strong>{zh ? "有问题或需要行使您的权利？" : "Questions or a privacy request?"}</strong>
          <p>
            {zh
              ? "请通过本网站显示的 NoLimit Training 官方微信二维码联系我们，并注明“隐私请求”或“退款请求”。"
              : "Contact NoLimit Training through the official WeChat QR shown on this website and label your message “Privacy request” or “Refund request”."}
          </p>
        </div>
      </main>
    </div>
  );
}

function PrivacyEn() {
  return (
    <article className="legalArticle">
      <section>
        <h2>1. Who operates this service</h2>
        <p>
          Guangzhou Yueran Sports Information Consulting Co., Ltd. (广州跃燃体育信息咨询有限公司), trading as NoLimit Training, operates this website, coaching service, digital-program store, and athlete portal. Its unified social credit code is 91440104MAKEAJP20G. For privacy requests, contact us through the official WeChat QR shown on the website.
        </p>
      </section>
      <section>
        <h2>2. Information we collect</h2>
        <ul>
          <li><strong>Identity and contact:</strong> name, email, phone or WeChat ID, language preference, and portal code.</li>
          <li><strong>Orders and service:</strong> selected program or coaching term, price, payment reference and status, start date, and support messages.</li>
          <li><strong>Training information:</strong> sport, goals, availability, exercise history, workout logs, check-ins, performance results, and coach feedback.</li>
          <li><strong>Sensitive health information:</strong> injuries, limitations, readiness, pain, body measurements, and other health details you choose to provide.</li>
          <li><strong>Technical information:</strong> basic browser/device information, error records, and local device storage used to keep the portal working and protect unsynced workouts.</li>
        </ul>
      </section>
      <section>
        <h2>3. Why we use it</h2>
        <p>We use information only as reasonably necessary to provide and personalise training, fulfil orders, communicate with you, monitor progress and safety, support the portal, prevent duplicate or fraudulent orders, and meet legal obligations.</p>
        <p>Health and injury information is optional unless a coach needs it to safely provide the service. We request separate consent before processing it. It is not a diagnosis and is not used for advertising.</p>
      </section>
      <section>
        <h2>4. Storage, service providers, and cross-border processing</h2>
        <p>
          Our system of record is a Postgres database hosted on our own Tencent Cloud server in Hong Kong. A restricted, read-only legacy copy of earlier coaching records remains in Feishu/Lark for a limited transition period. Our target remains Postgres hosted on Tencent Cloud in mainland China; until that migration completes, information may be processed across the mainland China–Hong Kong border. We ask for separate consent while that path remains and require providers to handle information only for the service. We will update this notice and remove the temporary consent step after mainland-only processing is verified.
        </p>
        <p>We do not sell personal information. We share it only with assigned coaches, service providers acting for us, or authorities when legally required.</p>
      </section>
      <section>
        <h2>5. Retention</h2>
        <ul>
          <li>Unconverted enquiries are normally kept for up to 12 months.</li>
          <li>Active coaching and training records are kept while the service is active and normally for up to 3 years after the last activity, unless you request earlier deletion or law requires longer retention.</li>
          <li>Order, payment-reference, refund, and dispute records may be kept for at least 3 years where required for transaction, accounting, or legal purposes.</li>
          <li>Local workout data remains on your device until it syncs, is cleared, or the app data is removed.</li>
        </ul>
      </section>
      <section>
        <h2>6. Your choices and rights</h2>
        <p>You may ask to access, copy, correct, supplement, restrict, or delete your personal information, or withdraw consent. Withdrawing consent does not affect earlier lawful processing and may prevent us from safely providing features that require that information.</p>
      </section>
      <section>
        <h2>7. Security and children</h2>
        <p>We limit access to people who need the information and use reasonable technical and organisational safeguards. No online system can guarantee absolute security. The public purchase and coaching flows are intended for adults. Anyone under 18 should use the service only with a parent or guardian; information about a child under 14 requires guardian consent.</p>
      </section>
      <section>
        <h2>8. Changes</h2>
        <p>Material changes will be posted here with a new effective date. When law requires fresh consent, we will request it before the changed processing begins.</p>
      </section>
    </article>
  );
}

function PrivacyZh() {
  return (
    <article className="legalArticle">
      <section><h2>1. 谁在运营本服务</h2><p>广州跃燃体育信息咨询有限公司（统一社会信用代码：91440104MAKEAJP20G）以 NoLimit Training 品牌运营本网站、教练服务、数字训练计划商店及学员客户端。如需提出隐私相关请求，请通过网站展示的官方微信二维码联系我们。</p></section>
      <section><h2>2. 我们收集的信息</h2><ul>
        <li><strong>身份与联系方式：</strong>姓名、邮箱、电话或微信号、语言偏好及客户端代码。</li>
        <li><strong>订单与服务信息：</strong>所选计划或指导周期、价格、付款备注与状态、开始日期及客服沟通。</li>
        <li><strong>训练信息：</strong>运动项目、目标、可训练时间、动作历史、训练记录、每日打卡、测试结果及教练反馈。</li>
        <li><strong>敏感健康信息：</strong>您主动提供的伤病、身体限制、恢复状态、疼痛、身体数据及其他健康信息。</li>
        <li><strong>技术信息：</strong>基础浏览器/设备信息、错误记录，以及用于保持客户端运行和保护未同步训练记录的本地存储。</li>
      </ul></section>
      <section><h2>3. 使用目的</h2><p>我们仅在合理必要的范围内使用信息，用于提供和个性化训练、履行订单、与您沟通、跟踪进展与安全、支持客户端运行、防止重复或欺诈订单以及履行法定义务。</p><p>伤病和健康信息原则上为选填；如教练为安全提供服务确有需要，我们会另行取得单独同意。该信息不构成医疗诊断，也不会用于广告。</p></section>
      <section><h2>4. 存储、服务商与跨境处理</h2><p>我们的主数据系统为部署在我们自有腾讯云香港服务器上的 Postgres 数据库。历史教练记录的受限只读备份在有限的过渡期内仍保存于飞书/Lark。我们的目标仍是迁移至腾讯云中国内地服务器；在迁移完成前，信息可能暂时在中国内地与香港之间处理。在该路径仍存在期间，我们会单独征求同意，并要求服务商仅为提供本服务处理信息。完成并验证中国内地单一区域处理后，我们会更新本政策并移除临时跨境同意步骤。</p><p>我们不会出售个人信息。仅会向负责您的教练、代表我们提供技术服务的供应商，或在法律要求时向主管机关提供必要信息。</p></section>
      <section><h2>5. 保存期限</h2><ul>
        <li>未转化为客户的咨询通常保存不超过 12 个月。</li>
        <li>服务期间保存训练与指导记录；最后一次活动后通常保存不超过 3 年，除非您要求提前删除或法律要求更长时间。</li>
        <li>订单、付款备注、退款及争议记录，在交易、财务或法律要求适用时可能至少保存 3 年。</li>
        <li>本地训练数据会保留在您的设备上，直至同步、清除或删除 App 数据。</li>
      </ul></section>
      <section><h2>6. 您的选择与权利</h2><p>您可以请求查阅、复制、更正、补充、限制或删除个人信息，也可以撤回同意。撤回同意不影响此前合法进行的处理；如某项功能必须使用相关信息，我们可能无法继续安全提供该功能。</p></section>
      <section><h2>7. 安全与未成年人</h2><p>我们仅允许确有需要的人员访问，并采取合理的技术和管理措施。任何线上系统都无法保证绝对安全。公开购买和指导流程面向成年人；未满 18 周岁应在父母或监护人同意下使用，处理不满 14 周岁未成年人的信息须取得监护人同意。</p></section>
      <section><h2>8. 政策更新</h2><p>重大更新会在本页公布并标注新的生效日期。如法律要求重新取得同意，我们会在开展变更后的处理前另行征求。</p></section>
    </article>
  );
}

function TermsEn() {
  return (
    <article className="legalArticle">
      <section><h2>1. Agreement</h2><p>By purchasing or using NoLimit Training, you agree to these Terms, the Privacy Policy, and the Refund Policy. If you do not agree, do not submit an order or use a paid service.</p></section>
      <section><h2>2. Training service—not medical care</h2><p>NoLimit Training provides fitness coaching and educational training programs, not medical diagnosis, treatment, physiotherapy, or emergency care. Tell your coach about relevant injuries and seek a qualified medical professional when appropriate. Stop an activity that causes sharp pain, dizziness, breathing difficulty, or other concerning symptoms.</p></section>
      <section><h2>3. Eligibility and accurate information</h2><p>You must be at least 18, or have a parent or guardian agree and supervise your use. Provide accurate information and keep your private portal link or code secure. Do not use another athlete’s portal.</p></section>
      <section><h2>4. Programs and coaching</h2><p>Digital programs provide a personal, non-transferable right to use the purchased content for the stated access period. You may not resell, publish, copy, scrape, or distribute program content. One-to-one coaching includes the term and services shown at checkout; scheduling and adjustments depend on honest check-ins, availability, and reasonable coach response times.</p></section>
      <section><h2>5. Payments</h2><p>Prices and the full amount due are shown before payment. Current purchases use WeChat payment and do not auto-renew. A payment reference helps us match the transfer. An order may remain pending until payment is verified.</p></section>
      <section><h2>6. Results and safe participation</h2><p>Training outcomes vary and are not guaranteed. You remain responsible for choosing a safe space and equipment, following instructions, using appropriate loads, and seeking help when unsure. Nothing in these Terms excludes rights or responsibilities that cannot legally be excluded.</p></section>
      <section><h2>7. Availability and changes</h2><p>We may make reasonable improvements, correct errors, replace an unavailable exercise, or briefly interrupt the service for maintenance. If a material paid service cannot be delivered, the Refund Policy applies.</p></section>
      <section><h2>8. Ending access</h2><p>We may suspend access for material misuse, sharing paid content, harmful conduct, fraud, or non-payment. We will act proportionately and will not limit rights protected by applicable law.</p></section>
      <section><h2>9. Disputes</h2><p>Contact us first through official WeChat so we can try to resolve the issue promptly. These Terms are governed by applicable law, and nothing prevents a consumer from using complaint, mediation, arbitration, or court rights available under that law.</p></section>
    </article>
  );
}

function TermsZh() {
  return (
    <article className="legalArticle">
      <section><h2>1. 同意条款</h2><p>购买或使用 NoLimit Training 即表示您同意本服务条款、隐私政策及退款政策。如您不同意，请勿提交订单或使用付费服务。</p></section>
      <section><h2>2. 训练服务并非医疗服务</h2><p>NoLimit Training 提供健身指导及训练教育内容，不提供医疗诊断、治疗、物理治疗或急救服务。请主动告知教练相关伤病，并在需要时咨询合格的医疗专业人员。如出现锐痛、眩晕、呼吸困难或其他异常症状，请立即停止训练。</p></section>
      <section><h2>3. 使用资格与准确信息</h2><p>您应年满 18 周岁；未满 18 周岁须由父母或监护人同意并监督使用。请提供准确信息，并妥善保管私人客户端链接或代码。请勿使用其他学员的客户端。</p></section>
      <section><h2>4. 训练计划与一对一指导</h2><p>数字训练计划仅授予购买者在标明期限内个人、不可转让的使用权。不得转售、公开、复制、抓取或传播计划内容。一对一指导所含周期与服务以结算页为准；安排和调整需基于真实打卡、双方时间及合理的教练响应时间。</p></section>
      <section><h2>5. 付款</h2><p>付款前会显示价格与应付总额。目前使用微信支付，不会自动续费。付款备注用于匹配转账；在付款核实完成前，订单可能显示为待确认。</p></section>
      <section><h2>6. 训练效果与安全责任</h2><p>训练效果因人而异，不作保证。您应负责选择安全的场地和器械、遵循说明、使用适当负荷，并在不确定时寻求帮助。本条款不排除法律规定不得排除的消费者权利或经营者责任。</p></section>
      <section><h2>7. 服务可用性与调整</h2><p>我们可能进行合理改进、修正错误、替换无法执行的动作，或因维护短暂中断服务。如无法提供重要的付费服务，适用退款政策。</p></section>
      <section><h2>8. 终止访问</h2><p>如存在严重滥用、共享付费内容、伤害性行为、欺诈或未付款，我们可能暂停访问。处理措施应与问题相称，且不会限制适用法律保护的权利。</p></section>
      <section><h2>9. 争议处理</h2><p>请先通过官方微信联系我们，以便及时解决问题。本条款适用相关法律，且不影响消费者依法投诉、调解、仲裁或诉讼的权利。</p></section>
    </article>
  );
}

function RefundEn() {
  return (
    <article className="legalArticle">
      <section><h2>Our approach</h2><p>We want the outcome to be fair and clear. This policy does not reduce any refund, repair, replacement, cancellation, or compensation right provided by applicable law.</p></section>
      <section><h2>Before access or coaching work begins</h2><p>If payment has been made but digital access has not been delivered and personalised coaching work has not begun, request cancellation through official WeChat. We will normally provide a full refund after matching the payment reference.</p></section>
      <section><h2>Digital programs after delivery</h2><p>Once a digital program has been delivered or accessed, a change of mind may not qualify for a full refund where permitted by law. Contact us if the program is materially misdescribed, duplicated, inaccessible, technically defective, or not delivered. We will first correct or replace the service and, when that is not reasonable, provide an appropriate refund.</p></section>
      <section><h2>One-to-one coaching</h2><p>Before personalised programming or coaching begins, you may request a full refund. After work begins, we will assess the undelivered portion of the term, work already completed, and applicable legal rights. We will not impose an unfair term or retain payment for a material service we do not provide.</p></section>
      <section><h2>How to request</h2><p>Contact us through the official WeChat QR with your name, order or portal code, payment reference, reason, and preferred resolution. Do not post financial or health information publicly. Approved refunds are returned through an appropriate available payment method; bank or payment-network processing time may vary.</p></section>
    </article>
  );
}

function RefundZh() {
  return (
    <article className="legalArticle">
      <section><h2>我们的处理原则</h2><p>我们希望退款处理公平、清晰。本政策不会减少适用法律赋予您的退款、修理、更换、取消或赔偿权利。</p></section>
      <section><h2>尚未开通或开始指导</h2><p>如已付款，但数字计划尚未交付，且个性化编排或教练工作尚未开始，请通过官方微信申请取消。核对付款备注后，我们通常会提供全额退款。</p></section>
      <section><h2>数字计划交付后</h2><p>数字计划已经交付或访问后，在法律允许的范围内，仅因改变主意可能无法获得全额退款。如计划与描述严重不符、重复购买、无法访问、存在重大技术问题或未交付，请联系我们。我们会优先修复或更换；如无法合理解决，将提供适当退款。</p></section>
      <section><h2>一对一指导</h2><p>个性化编排或指导开始前，可申请全额退款。开始后，我们会结合尚未交付的服务、已经完成的工作及适用法律权利进行处理。我们不会设置不公平条款，也不会对未提供的重要服务保留费用。</p></section>
      <section><h2>申请方式</h2><p>请通过官方微信提供姓名、订单号或客户端代码、付款备注、申请原因及希望的解决方式。请勿在公开渠道发布财务或健康信息。获批退款将通过适当且可用的付款方式退回，银行或支付网络处理时间可能有所不同。</p></section>
    </article>
  );
}

function BusinessEn() {
  return (
    <article className="legalArticle businessArticle">
      <section>
        <h2>Registered operator</h2>
        <p className="businessTranslationNote">The Chinese registration text is authoritative; the English company name below is a convenience translation.</p>
        <dl className="businessDetails">
          <div><dt>Registered name</dt><dd>广州跃燃体育信息咨询有限公司</dd></div>
          <div><dt>English rendering</dt><dd>Guangzhou Yueran Sports Information Consulting Co., Ltd.</dd></div>
          <div><dt>Trading brand</dt><dd>NoLimit Training</dd></div>
          <div><dt>Unified social credit code</dt><dd>91440104MAKEAJP20G</dd></div>
          <div><dt>Company type</dt><dd>Limited liability company (foreign invested, non-wholly-owned)</dd></div>
          <div><dt>Legal representative</dt><dd>BASTELL KENT</dd></div>
          <div><dt>Registered capital</dt><dd>RMB 300,000</dd></div>
          <div><dt>Established</dt><dd>5 June 2026</dd></div>
          <div><dt>Registered address</dt><dd>Room 825D, 8th Floor, No. 48 Jianshe 6th Road, Yuexiu District, Guangzhou, China</dd></div>
          <div><dt>Registration authority</dt><dd>Guangzhou Yuexiu District Administration for Market Regulation</dd></div>
          <div><dt>Customer contact</dt><dd>Official NoLimit Training WeChat QR displayed on this website</dd></div>
        </dl>
      </section>
      <section>
        <h2>Registered business scope</h2>
        <p>Business services. Specific registered activities are subject to the record in China’s National Enterprise Credit Information Publicity System and any approvals required by law.</p>
        <a className="businessRegistryLink" href="https://www.gsxt.gov.cn/" target="_blank" rel="noreferrer">Check the official national registry</a>
      </section>
    </article>
  );
}

function BusinessZh() {
  return (
    <article className="legalArticle businessArticle">
      <section>
        <h2>经营者登记信息</h2>
        <dl className="businessDetails">
          <div><dt>企业名称</dt><dd>广州跃燃体育信息咨询有限公司</dd></div>
          <div><dt>运营品牌</dt><dd>NoLimit Training</dd></div>
          <div><dt>统一社会信用代码</dt><dd>91440104MAKEAJP20G</dd></div>
          <div><dt>类型</dt><dd>有限责任公司（外商投资、非独资）</dd></div>
          <div><dt>法定代表人</dt><dd>BASTELL KENT</dd></div>
          <div><dt>注册资本</dt><dd>叁拾万元（人民币）</dd></div>
          <div><dt>成立日期</dt><dd>2026 年 6 月 5 日</dd></div>
          <div><dt>住所</dt><dd>广州市越秀区建设六马路48号第8层825D</dd></div>
          <div><dt>登记机关</dt><dd>广州市越秀区市场监督管理局</dd></div>
          <div><dt>客户联系方式</dt><dd>本网站展示的 NoLimit Training 官方微信二维码</dd></div>
        </dl>
      </section>
      <section>
        <h2>登记经营范围</h2>
        <p>商务服务业。具体经营项目及依法须经批准的项目，以国家企业信用信息公示系统登记和有关部门批准为准。</p>
        <a className="businessRegistryLink" href="https://www.gsxt.gov.cn/" target="_blank" rel="noreferrer">前往国家企业信用信息公示系统查询</a>
      </section>
    </article>
  );
}
