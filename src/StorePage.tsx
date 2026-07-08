// Public store + checkout. Extracted from App.tsx as phase C of the split —
// JSX verbatim; state/handlers arrive via props (typed loosely for the
// mechanical move; tighten when the store gets its own state).
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Activity,
  ArrowRight,
  Check,
  Dumbbell,
  Eye,
  Home,
  Lock,
  Mountain,
  Plus,
  Shield,
  Snowflake,
  Timer,
  Zap,
} from "lucide-react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "./StorePage.css";
import "./StorePageV3.css";
import type { Client, Coach, Program, ProgramReview, Toast } from "./appCore";

// Motion system shared with the cinematic landing page (LandingPage.tsx):
// opacity/transform only (GPU, China-safe), collapses to static under
// prefers-reduced-motion.
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};
const rise: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.75, ease: EASE } },
};
const revealProps = {
  variants: staggerParent,
  initial: "hidden" as const,
  whileInView: "show" as const,
  viewport: { once: true, amount: 0.2 },
};

// Category tile glyph, keyed by the category id from storeCategories.
function CategoryIcon({ id }: { id: string }) {
  const p = { size: 24, strokeWidth: 2 } as const;
  if (id === "all") return <Home {...p} />;
  if (id === "rock-climbing") return <Mountain {...p} />;
  if (id === "hyrox") return <Timer {...p} />;
  if (id === "snow-ski") return <Snowflake {...p} />;
  if (id === "running") return <Activity {...p} />;
  if (id === "general-foundation") return <Dumbbell {...p} />;
  if (id === "joint-addons") return <Shield {...p} />;
  return <Zap {...p} />;
}

export default function StorePage({
  clients,
  coaches,
  programs,
  programsLoading,
  toasts,
  storeReviews,
  storeLang,
  setStoreLang,
  storeStep,
  setStoreStep,
  requestStoreStep,
  storeCategoryFilter,
  setStoreCategoryFilter,
  storeSeasonFilter,
  setStoreSeasonFilter,
  storeProgramSearch,
  setStoreProgramSearch,
  storeFaqOpen,
  setStoreFaqOpen,
  storeSelectedProgram,
  setStoreSelectedProgram,
  storeSelectedAddonIds,
  setStoreSelectedAddonIds,
  storeLauncherOpen,
  setStoreLauncherOpen,
  storeLauncherClient,
  setStoreLauncherClient,
  storeRegName,
  setStoreRegName,
  storeRegPhone,
  setStoreRegPhone,
  storeRegistering,
  storeRegStage,
  storeRegisteredCode,
  setStoreRegisteredCode,
  storeRegisteredOrderId,
  setStoreRegisteredOrderId,
  storePaymentCode,
  findPortalOpen,
  setFindPortalOpen,
  findPortalName,
  setFindPortalName,
  findPortalPhone,
  setFindPortalPhone,
  findPortalBusy,
  findPortalError,
  setFindPortalError,
  findMyPortal,
  previewProgram,
  setPreviewProgram,
  previewLoading,
  openProgramPreview,
  registerForProgram,
  buildGlanceChain,
  rememberedPortalCode,
}: {
  clients: Client[];
  coaches: Coach[];
  programs: Program[];
  toasts: Toast[];
  storeReviews: ProgramReview[];
  previewProgram: { program: Program; sessions: any[] } | null;
  storeSelectedProgram: Program | null;
  storeSelectedAddonIds: string[];
  storeLang: "en" | "zh";
  storeStep: number;
  rememberedPortalCode: string;
  [key: string]: any;
}) {
  const sZh = storeLang === "zh";
  const storePrograms = programs.filter((p) => p.publicStoreVisible);
  const searchText = storeProgramSearch.trim().toLowerCase();

  // The coach to feature in "Meet your coach": prefer a Head/Admin coach,
  // else the first active one. Bio is editable in the coach record; until
  // it's filled we show a strong default consistent with the store copy.
  const activeCoaches = coaches.filter(
    (c) => !/inactive/i.test(c.status || "")
  );
  const featuredCoach =
    activeCoaches.find((c) => /head|admin|founder|lead/i.test(c.role || "")) ||
    activeCoaches[0] ||
    null;
  const coachInitials = (featuredCoach?.name || "NoLimit")
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const coachBio =
    (featuredCoach?.bio || "").trim() ||
    (sZh
      ? "我们的训练计划由奥运及职业级别教练编排——把为顶尖运动员设计的同款周期化训练，原汁原味地带到你的手机上。每一个动作、每一组、每一次的安排，都来自真实的高水平训练实践，而非套用模板。"
      : "Our programs are built by an Olympic and professional-level coach — the same periodised training designed for elite athletes, brought straight to your phone. Every exercise, set and rep is drawn from real high-performance coaching, not a template.");
  const coachPillars = sZh
    ? [
        ["奥运 / 职业级编排", "为国家队与职业运动员设计的训练逻辑。"],
        ["循证周期化", "围绕力量、能量系统与伤病预防科学排布。"],
        ["双语指导", "App、训练播放器与动作讲解全程中英文。"],
      ]
    : [
        ["Olympic / pro-level programming", "The training logic used with national-team and professional athletes."],
        ["Evidence-based periodisation", "Built around strength, energy systems and injury prevention."],
        ["Bilingual coaching", "App, workout player and exercise cues in English and 中文."],
      ];

  const programSearchBlob = (program: Program) =>
    [
      program.programName,
      program.programNameCn,
      program.goal,
      program.goalCn,
      program.sport,
      program.level,
      program.phase,
      program.phaseCn,
      program.productType,
      program.salesDescription,
      program.salesDescriptionCn,
      program.storeDescription,
      program.storeDescriptionCn,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

  const slugify = (value: string) =>
    (value || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9一-鿿]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const getProgramCategory = (program: Program) => {
    // Explicit, coach-assigned category wins; fall back to keyword guessing
    // for legacy programs with no Store Category set.
    if (program.storeCategory && program.storeCategory.trim()) {
      return slugify(program.storeCategory);
    }
    const blob = programSearchBlob(program);
    if (/ankle|achilles|feet|foot|knee|shoulder|breath|breathing|joint|prehab|rehab|injury|踝|足|膝|肩|呼吸|损伤|康复/.test(blob)) {
      return "joint-addons";
    }
    if (/climb|boulder|rock|攀岩|抱石/.test(blob)) return "rock-climbing";
    if (/hyrox|海柔克斯/.test(blob)) return "hyrox";
    if (/snow|ski|snowboard|滑雪|单板|双板/.test(blob)) return "snow-ski";
    if (/run|running|marathon|5k|10k|跑步|马拉松/.test(blob)) return "running";
    return "general-foundation";
  };

  const isAddonProgram = (program: Program) =>
    (program.storeListingType || "").toLowerCase() === "add-on" ||
    program.productType === "Digital Add-on";

  const isBundleProgram = (program: Program) =>
    (program.storeListingType || "").toLowerCase() === "bundle" ||
    program.productType === "Digital Bundle";

  const bundleIncludes = (program: Program) => {
    const ids = (program.bundleProgramIds || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return programs.filter((p) => ids.includes(p.programId));
  };

  const bundleIndividualTotal = (program: Program) =>
    bundleIncludes(program).reduce(
      (sum, p) => sum + (parseFloat(p.price || "0") || 0),
      0
    );

  const getProgramSeason = (program: Program) => {
    const blob = programSearchBlob(program);
    const match = blob.match(/season\s*(\d+)|s(\d+)|第\s*(\d+)\s*季/i);
    const season = match?.[1] || match?.[2] || match?.[3];
    return season ? `season-${season}` : "season-1";
  };

  const formatPrice = (program: Program) => {
    const price = program.price;
    const currency = program.currency || "CNY";
    if (!price || price === "0") return sZh ? "联系获取价格" : "Contact for price";
    return `${currency} ${price}`;
  };

  const formatDuration = (program: Program) => {
    const weeks = program.durationWeeks;
    const sessions = program.sessionsPerWeek;
    if (weeks && sessions) {
      return sZh ? `${weeks} 周 - 每周 ${sessions} 次` : `${weeks} weeks - ${sessions}x/week`;
    }
    if (weeks) return sZh ? `${weeks} 周` : `${weeks} weeks`;
    return sZh ? "灵活安排" : "Flexible schedule";
  };

  // Known categories keep their curated bilingual labels; any new category a
  // coach assigns in the builder is added automatically.
  const baseCatLabels: Record<string, { en: string; zh: string; body: string }> = {
    "rock-climbing": { en: "Rock Climbing", zh: "攀岩", body: sZh ? "力量、核心、耐力和伤病预防" : "Strength, core, endurance, and durability" },
    hyrox: { en: "Hyrox", zh: "Hyrox", body: sZh ? "混合体能和跑步能力" : "Hybrid conditioning and running capacity" },
    "snow-ski": { en: "Snowboard / Ski", zh: "滑雪 / 单板", body: sZh ? "下肢力量、稳定性和赛季准备" : "Lower-body strength, control, and season prep" },
    running: { en: "Running", zh: "跑步", body: sZh ? "速度、阈值和有氧能力" : "Speed, threshold, and aerobic development" },
    "general-foundation": { en: "General Foundation", zh: "通用基础", body: sZh ? "适合任何项目的基础体能" : "Base strength for any sport" },
    "joint-addons": { en: "Joint Add-Ons", zh: "关节加购", body: sZh ? "按身体部位补强和预防" : "Targeted prevention and support" },
  };
  const titleize = (slug: string) =>
    slug.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

  // Build the catalog from the categories actually used by main (non-add-on)
  // store programs, so adding a "Soccer" program creates a Soccer tile.
  const catMap = new Map<string, { id: string; title: string; body: string }>();
  for (const program of storePrograms) {
    if (isAddonProgram(program)) continue;
    const id = getProgramCategory(program);
    if (catMap.has(id)) continue;
    const base = baseCatLabels[id];
    const title = sZh
      ? program.storeCategoryCn || base?.zh || program.storeCategory || titleize(id)
      : program.storeCategory || base?.en || titleize(id);
    catMap.set(id, { id, title, body: base?.body || "" });
  }
  const storeCategories = [
    { id: "all", title: sZh ? "全部" : "All", body: sZh ? "查看所有训练计划" : "Browse every program" },
    ...Array.from(catMap.values()),
  ];

  const filteredStorePrograms = storePrograms.filter((program) => {
    if (isAddonProgram(program)) return false;
    const matchesCategory =
      storeCategoryFilter === "all" || getProgramCategory(program) === storeCategoryFilter;
    const matchesSeason =
      storeSeasonFilter === "all" || getProgramSeason(program) === storeSeasonFilter;
    const matchesSearch =
      !searchText || programSearchBlob(program).includes(searchText);
    return matchesCategory && matchesSeason && matchesSearch;
  });

  const selectedCategoryLabel =
    storeCategories.find((category) => category.id === storeCategoryFilter)?.title ||
    (sZh ? "全部" : "All");

  const reduce = useReducedMotion();
  // Scroll-reveal props for a section; a no-op when reduced motion is on so the
  // section (and its children) render static and fully visible.
  const sectionReveal = reduce ? {} : revealProps;

  return (
    <div className={`storePageV2 storePageV3 ${sZh ? "zh" : "en"}`}>
      <div className="toastStack">
        {toasts.map((toast) => (
          <div className={`toast toast-${toast.type}`} key={toast.id}>
            {toast.message}
          </div>
        ))}
      </div>

      <nav className="storeNavV3">
        <a className="storeBrandV3" href="/">
          <img src="/nl_wordmark_black.png" alt="No Limit" />
        </a>
        <div className="storeNavLinksV3">
          <a href="#catalog" className="storeNavLinkV3">{sZh ? "计划" : "Programs"}</a>
          <a href="#how" className="storeNavLinkV3">{sZh ? "如何使用" : "How it works"}</a>
          <a href="#coach" className="storeNavLinkV3">{sZh ? "教练" : "Coach"}</a>
          <a href="#faq" className="storeNavLinkV3">FAQ</a>
        </div>
        <div className="storeNavActionsV3">
          {rememberedPortalCode ? (
            <a
              href={`/?portal=client&client=${encodeURIComponent(rememberedPortalCode)}`}
              className="storeNavPortalLinkV3"
            >
              {sZh ? "打开我的客户端" : "Open my portal"}
            </a>
          ) : (
            <button
              type="button"
              className="storeNavPortalLinkV3"
              onClick={() => {
                setFindPortalError("");
                setFindPortalOpen(true);
              }}
            >
              {sZh ? "找回我的客户端" : "Find my portal"}
            </button>
          )}
          <button
            className="storeLangToggleV3"
            onClick={() => setStoreLang(sZh ? "en" : "zh")}
            aria-label="Change language"
          >
            <span className={!sZh ? "active" : ""}>EN</span>
            <span className={sZh ? "active" : ""}>中文</span>
          </button>
          <button
            type="button"
            className="storeNavEnterV3"
            onClick={() => setStoreLauncherOpen(true)}
          >
            {sZh ? "进入 App" : "Enter app"} <ArrowRight size={15} />
          </button>
        </div>
      </nav>

      {findPortalOpen && (
        <div
          className="findPortalOverlay"
          onClick={() => setFindPortalOpen(false)}
        >
          <div
            className="findPortalModal"
            onClick={(event) => event.stopPropagation()}
          >
            <h3>{sZh ? "找回我的客户端" : "Find my portal"}</h3>
            <p>
              {sZh
                ? "输入购买时使用的姓名和微信号/手机号。"
                : "Enter the name and WeChat/phone you used when you bought your program."}
            </p>
            <label>
              {sZh ? "姓名" : "Name"}
              <input
                value={findPortalName}
                onChange={(e) => setFindPortalName(e.target.value)}
                placeholder={sZh ? "你的姓名" : "Your name"}
              />
            </label>
            <label>
              {sZh ? "微信 / 电话" : "WeChat / Phone"}
              <input
                value={findPortalPhone}
                onChange={(e) => setFindPortalPhone(e.target.value)}
                placeholder={sZh ? "微信号或手机号" : "WeChat ID or phone"}
              />
            </label>
            {findPortalError && (
              <p className="findPortalError">{findPortalError}</p>
            )}
            <div className="findPortalActions">
              <button
                type="button"
                className="ghostButton"
                onClick={() => setFindPortalOpen(false)}
              >
                {sZh ? "取消" : "Cancel"}
              </button>
              <button
                type="button"
                className="primaryButton"
                disabled={findPortalBusy}
                onClick={() => void findMyPortal()}
              >
                {findPortalBusy
                  ? sZh
                    ? "查询中..."
                    : "Searching..."
                  : sZh
                    ? "打开我的客户端"
                    : "Open my portal"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="storeLauncherV2">
        {!storeLauncherOpen ? (
          <button
            className="storeLauncherToggleV2"
            onClick={() => setStoreLauncherOpen(true)}
          >
            {sZh ? "进入应用" : "Enter app"}
          </button>
        ) : (
          <div className="storeLauncherPanelV2">
            <div className="storeLauncherHeadV2">
              <span>{sZh ? "进入应用" : "Enter app"}</span>
              <button
                className="storeLauncherCloseV2"
                aria-label="Close"
                onClick={() => setStoreLauncherOpen(false)}
              >
                x
              </button>
            </div>
            <button
              className="storeLauncherBtnV2"
              onClick={() => {
                window.location.href = "/?view=coach";
              }}
            >
              {sZh ? "教练端" : "Coach View"}
            </button>
            <div className="storeLauncherClientRowV2">
              <select
                value={storeLauncherClient}
                onChange={(e) => setStoreLauncherClient(e.target.value)}
              >
                <option value="">{sZh ? "选择客户..." : "Select client..."}</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.clientCode || c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                className="storeLauncherBtnV2"
                disabled={!storeLauncherClient}
                onClick={() => {
                  window.location.href = `/?portal=client&client=${encodeURIComponent(
                    storeLauncherClient
                  )}`;
                }}
              >
                {sZh ? "客户端" : "Client View"}
              </button>
            </div>
          </div>
        )}
      </div>

      <main className="storeMainV2">
        <header className="storeHeroV3" id="top">
          <div className="storeHeroGlowV3" aria-hidden="true">
            <span className="storeHeroBlobA" />
            <span className="storeHeroBlobB" />
          </div>
          <div className="storeHeroInnerV3">
            <motion.div
              className="storeHeroCopyV3"
              variants={reduce ? undefined : staggerParent}
              initial={reduce ? undefined : "hidden"}
              animate={reduce ? undefined : "show"}
            >
              <motion.div className="storeHeroEyebrowRowV3" variants={rise}>
                <span className="storeEyebrowV2">{sZh ? "为训练而生" : "Built for Training"}</span>
                <span className="storeHeroAccentLineV3" />
              </motion.div>
              <motion.h1 className="storeHeroTitleV3" variants={rise}>
                {sZh ? (
                  <>顶级训练计划，<br />直接送到<br /><span className="storeGold">你的手机。</span></>
                ) : (
                  <>Olympic-level<br />programming,<br /><span className="storeGold">in your pocket.</span></>
                )}
              </motion.h1>
              <motion.p className="storeHeroLeadV3" variants={rise}>
                {sZh
                  ? "由奥运与职业级教练编排的训练计划，即时获取，价格远低于一对一私教。购买后完成简短问卷，计划即进入你的 App，可按月、按周或逐日安排。"
                  : "Elite periodised training built by an Olympic and professional-level coach — yours instantly, at a fraction of one-on-one pricing. Finish a short intake and the full plan loads into your app."}
              </motion.p>
              <motion.div className="storeHeroCtasV3" variants={rise}>
                <a href="#catalog" className="storeBtnPrimaryV3">
                  {sZh ? "浏览计划" : "Browse programs"} <ArrowRight size={16} />
                </a>
                <a href="#showcase" className="storeBtnSecondaryV3">
                  {sZh ? "预览样板周" : "Preview a sample week"}
                </a>
              </motion.div>
            </motion.div>
            <motion.div
              className="storeHeroStageV3"
              initial={reduce ? undefined : { opacity: 0, y: 34 }}
              animate={reduce ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: EASE, delay: 0.2 }}
            >
              <div className="storeHeroPhoneV3">
                <div className="storeHeroPhoneScreenV3">
                  <img src="/showcase-player.png" alt={sZh ? "训练播放器" : "Workout player"} />
                </div>
              </div>
              <div className="storeHeroChipV3">
                <span className="storeHeroChipBigV3">EN/中文</span>
                <span className="storeHeroChipSmallV3">{sZh ? "完全双语" : "fully bilingual"}</span>
              </div>
            </motion.div>
          </div>
        </header>

        <motion.section id="catalog" {...sectionReveal}>
          <motion.div className="storeSectionIntroV2" variants={reduce ? undefined : rise}>
            <span className="storeEyebrowV2">{sZh ? "项目目录" : "Sports Catalog"}</span>
            <h2>{sZh ? "先选择你的训练方向。" : "Start with your training direction."}</h2>
          </motion.div>
          <motion.div className="storeCatalogueGridV2" variants={reduce ? undefined : staggerParent}>
            {storeCategories.map((category) => (
              <motion.button
                className={`storeCategoryCardV2 ${storeCategoryFilter === category.id ? "active" : ""}`}
                key={category.id}
                onClick={() => setStoreCategoryFilter(category.id)}
                variants={reduce ? undefined : rise}
              >
                <span className="storeCategoryIconV3" aria-hidden="true">
                  <CategoryIcon id={category.id} />
                </span>
                <strong>{category.title}</strong>
              </motion.button>
            ))}
          </motion.div>
        </motion.section>

        <section className="storeProgramShelfV2">
          <div className="storeSectionIntroV2">
            <span className="storeEyebrowV2">{selectedCategoryLabel}</span>
            <h2>{sZh ? "可购买计划" : "Available Programs"}</h2>
          </div>

          <div className="storeToolbarV2">
            <input
              className="storeSearchV2"
              value={storeProgramSearch}
              onChange={(e) => setStoreProgramSearch(e.target.value)}
              placeholder={sZh ? "搜索项目、级别或计划..." : "Search sport, level, or program..."}
            />
            <select
              className="storeSelectV2"
              value={storeSeasonFilter}
              onChange={(e) => setStoreSeasonFilter(e.target.value)}
            >
              <option value="all">{sZh ? "全部赛季" : "All Seasons"}</option>
              <option value="season-1">Season 1</option>
              <option value="season-2">Season 2</option>
              <option value="season-3">Season 3</option>
            </select>
          </div>

          {programsLoading ? (
            <div className="storeLoadingV2">
              {sZh ? "正在加载训练计划..." : "Loading programs..."}
            </div>
          ) : filteredStorePrograms.length === 0 ? (
            <div className="storeEmptyV2">
              <strong>{sZh ? "暂无匹配计划" : "No matching programs yet"}</strong>
              <span>
                {sZh
                  ? "该分类会随着 Season 1 产品上线继续扩展。"
                  : "This category will expand as Season 1 products go live."}
              </span>
            </div>
          ) : (
            <motion.div className="storeGridV2" {...sectionReveal}>
              {filteredStorePrograms.map((program) => {
                const name = sZh && program.programNameCn ? program.programNameCn : program.programName;
                const description =
                  (sZh && (program.storeDescriptionCn || program.salesDescriptionCn)) ||
                  program.storeDescription ||
                  program.salesDescription ||
                  (sZh
                    ? "专业、循证、可执行的训练周期。"
                    : "Professional, evidence-based training you can schedule around real life.");
                const category = storeCategories.find((item) => item.id === getProgramCategory(program));
                return (
                  <motion.article
                    className="storeProductCardV2"
                    key={program.recordId}
                    variants={reduce ? undefined : rise}
                  >
                    <button
                      className="storeProductClickTarget"
                      onClick={() => setStoreSelectedProgram(program)}
                      aria-label={name}
                    />
                    <div className="storeProductVisualV2">
                      {/* Always the clean branded visual (dark gradient + faint
                          monogram), not the uploaded productImage — matches the
                          store design reference and keeps every card uniform. */}
                      <div className="storeProductFallbackV2">
                        <img src="/nl_monogram_clean.png" alt="" />
                      </div>
                      <span>{category?.title || (sZh ? "训练计划" : "Program")}</span>
                    </div>
                    <div className="storeProductBodyV2">
                      <div className="storeProductTagsV2">
                        {isBundleProgram(program) && (
                          <span className="storeBundleBadge">
                            {sZh ? "套餐" : "Package"}
                          </span>
                        )}
                        <span>{getProgramSeason(program).replace("-", " ")}</span>
                        <span>{program.level || (sZh ? "多水平" : "All levels")}</span>
                      </div>
                      <h3>{name}</h3>
                      <p>{description}</p>
                    </div>
                    <div className="storeProductFooterV2">
                      <strong>{formatPrice(program)}</strong>
                      {(() => {
                        if (!isBundleProgram(program)) {
                          return <span>{formatDuration(program)}</span>;
                        }
                        const total = bundleIndividualTotal(program);
                        const bp = parseFloat(program.price || "0") || 0;
                        if (total > bp && bp > 0) {
                          return (
                            <span className="storeBundleSave">
                              <s>
                                {(program.currency || "CNY")} {total}
                              </s>{" "}
                              {sZh ? `省 ${total - bp}` : `Save ${total - bp}`}
                            </span>
                          );
                        }
                        return (
                          <span>
                            {bundleIncludes(program).length}{" "}
                            {sZh ? "个计划" : "programs"}
                          </span>
                        );
                      })()}
                    </div>
                    {!isBundleProgram(program) && (
                      <button
                        type="button"
                        className="storeProductPreviewBtn"
                        onClick={(e) => {
                          e.stopPropagation();
                          openProgramPreview(program);
                        }}
                      >
                        <Eye size={14} />{" "}
                        {sZh ? "预览样板周" : "Preview sample week"}
                      </button>
                    )}
                  </motion.article>
                );
              })}
            </motion.div>
          )}
        </section>

        <section className="storeHowV2" id="how">
          <div className="storeSectionIntroV2">
            <span className="storeEyebrowV2">{sZh ? "如何使用" : "How it works"}</span>
            <h2>{sZh ? "三步开始训练" : "Three steps to start training"}</h2>
          </div>
          <div className="storeHowGridV2">
            {(sZh
              ? [
                  ["1", "选择你的项目", "从上方目录中选择你的训练方向。"],
                  ["2", "选择单个计划或套餐", "购买单个计划，或以优惠价购买整套。"],
                  ["3", "加购关节 / 灵活性模块", "为关节健康和伤病预防加上专项模块。"],
                ]
              : [
                  ["1", "Choose your sport", "Pick your training direction from the catalog above."],
                  ["2", "Pick a program or bundle", "Buy an individual program, or a discounted bundle."],
                  ["3", "Add joint & mobility work", "Add joint/mobility programs for joint health and injury prevention."],
                ]
            ).map(([n, t, d]) => (
              <div className="storeHowStepV2" key={n}>
                <span className="storeHowNumV2">{n}</span>
                <strong>{t}</strong>
                <span>{d}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="storeShowcaseV2" id="showcase">
          <div className="storeSectionIntroV2">
            <span className="storeEyebrowV2">{sZh ? "应用内体验" : "Inside the app"}</span>
            <h2>{sZh ? "购买后你会得到的" : "What you get after you buy"}</h2>
          </div>
          <div className="storeShowcaseGridV2">
            <figure className="storeShowcaseItemV2">
              <div className="storeShowcaseShot">
                <img src="/showcase-glance.png" alt="" />
              </div>
              <figcaption>
                <strong>{sZh ? "整节训练，一目了然" : "Your whole session at a glance"}</strong>
                <span>
                  {sZh
                    ? "开始前就能看到每个动作的组数、次数、节奏和休息。"
                    : "See every exercise — sets, reps, tempo and rest — before you start."}
                </span>
              </figcaption>
            </figure>
            <figure className="storeShowcaseItemV2">
              <div className="storeShowcaseShot">
                <img src="/showcase-player.png" alt="" />
              </div>
              <figcaption>
                <strong>{sZh ? "逐个动作的训练播放器" : "A guided workout player"}</strong>
                <span>
                  {sZh
                    ? "每个动作都有组数、次数、节奏和休息，训练时直接记录你的成绩。"
                    : "Every exercise shows sets, reps, tempo and rest — log your numbers set by set as you train."}
                </span>
              </figcaption>
            </figure>
          </div>
        </section>

        <motion.section className="storeCoachV3" id="coach" {...sectionReveal}>
          <div className="storeCoachGlowV3" aria-hidden="true" />
          <motion.div className="storeCoachIntroV3" variants={reduce ? undefined : rise}>
            <span className="storeEyebrowV2">{sZh ? "认识你的教练" : "Meet your coaches"}</span>
            <h2>{sZh ? "为你编排训练的人" : "The coaches behind your training"}</h2>
            <p>
              {sZh
                ? "每一套计划都由曾在职业与奥运层面工作的教练编排 —— 顶尖运动员使用的周期化训练，直接送到你的手机。是真正的高水平教练，而不是模板。"
                : "Every program is built by coaches who've worked at the professional and Olympic level — periodised training used by elite athletes, brought straight to your phone. Real high-performance coaching, not a template."}
            </p>
          </motion.div>
          {(() => {
            const ordered = [
              featuredCoach,
              ...activeCoaches.filter((c: Coach) => c !== featuredCoach),
            ].filter(Boolean) as Coach[];
            const cards = ordered.slice(0, 2);
            const initialsOf = (name?: string) =>
              (name || "NL")
                .split(/\s+/)
                .map((w) => w[0])
                .filter(Boolean)
                .slice(0, 2)
                .join("")
                .toUpperCase() || "NL";
            const list = cards.length
              ? cards
              : ([{ name: "NoLimit Coaching", role: "", bio: "" }] as any[]);
            return (
              <div
                className={`storeCoachGridV3${list.length === 1 ? " storeCoachGridSoloV3" : ""}`}
              >
                {list.map((coach: any, i: number) => (
                  <motion.div
                    className="storeCoachCardV3"
                    key={coach?.recordId || i}
                    variants={reduce ? undefined : rise}
                  >
                    <div className="storeCoachAvatarV3" aria-hidden="true">
                      {i === 0 ? coachInitials : initialsOf(coach?.name)}
                    </div>
                    <strong className="storeCoachNameV3">
                      {coach?.name || "NoLimit Coaching"}
                    </strong>
                    <span className="storeCoachRoleV3">
                      {coach?.role || (sZh ? "主教练" : "Head Coach")}
                    </span>
                    <p className="storeCoachBioV3">
                      {(coach?.bio || "").trim() || coachBio}
                    </p>
                  </motion.div>
                ))}
              </div>
            );
          })()}
          <motion.div className="storeCoachPillarsV3" variants={reduce ? undefined : rise}>
            {coachPillars.map(([title, body]) => (
              <div className="storeCoachPillarV3" key={title}>
                <Shield size={16} className="storeCoachPillarIconV3" />
                <div>
                  <strong>{title}</strong>
                  <span>{body}</span>
                </div>
              </div>
            ))}
          </motion.div>
          <motion.div className="storeCoachCtaWrapV3" variants={reduce ? undefined : rise}>
            <a className="storeBtnSecondaryV3" href="#storeContactAnchor">
              {sZh ? "与教练取得联系" : "Get in touch with the coaches"}
              <ArrowRight size={16} />
            </a>
          </motion.div>
        </motion.section>

        {storeReviews.length > 0 && (
          <section className="storeTestimonials">
            <div className="storeSectionIntroV2">
              <span className="storeEyebrowV2">
                {sZh ? "学员反馈" : "What athletes say"}
              </span>
              <h2>{sZh ? "真实评价" : "Real results, real words"}</h2>
            </div>
            <div className="storeTestimonialsGrid">
              {storeReviews.slice(0, 6).map((r) => (
                <div className="storeTestimonial" key={r.recordId}>
                  <div className="storeTestimonialStars">
                    {"★".repeat(r.rating)}
                    {"☆".repeat(Math.max(0, 5 - r.rating))}
                  </div>
                  {r.quote && (
                    <p className="storeTestimonialQuote">“{r.quote}”</p>
                  )}
                  <div className="storeTestimonialMeta">
                    {(r.clientName || "").split(" ")[0] || (sZh ? "学员" : "Athlete")}
                    {r.programName ? ` · ${r.programName}` : ""}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="storeFaqV2" id="faq">
          <div className="storeSectionIntroV2">
            <span className="storeEyebrowV2">{sZh ? "常见问题" : "Common questions"}</span>
            <h2>{sZh ? "购买前你想知道的" : "What to know before you buy"}</h2>
          </div>
          <div className="storeFaqListV2">
            {(sZh
              ? [
                  [
                    "付款后如何拿到训练计划？",
                    "用微信扫码付款后，在结算页填写姓名和微信号，我们会立即为你创建专属客户端。完成一份简短的问卷后，整套计划就会加载进你的 App，可按月、按周或逐日安排。",
                  ],
                  [
                    "我需要健身房或很多器械吗？",
                    "大多数计划以常见的健身房器械为基础，但每个动作都配有视频和替代动作选项，可根据你现有的器械灵活调整。点击任意计划的“预览样板周”即可提前看到第一周的安排。",
                  ],
                  [
                    "每周需要训练多少时间？",
                    "每个计划都会标注时长（周数）和每周训练次数，你可以在卡片和详情页看到。计划按天编排，单次训练通常 45–75 分钟。",
                  ],
                  [
                    "适合我的水平吗？",
                    "计划标有适用水平，动作的组数次数与负荷可按个人能力调整。不确定的话，扫描下方微信，我们帮你匹配合适的计划或加购模块。",
                  ],
                  [
                    "有中文版吗？",
                    "有。整个 App、训练播放器和动作讲解都支持中英文，可在客户端内随时切换。",
                  ],
                  [
                    "购买后能联系教练吗？",
                    "数字计划为自助式训练。如需一对一指导、答疑或计划调整，可了解我们的线上一对一教练服务。",
                  ],
                ]
              : [
                  [
                    "How do I get my program after paying?",
                    "Scan the WeChat QR to pay, then enter your name and WeChat ID on the checkout step. We create your private client portal right away. After a short intake form, the full plan loads into your app to schedule by month, week, or day.",
                  ],
                  [
                    "Do I need a gym or lots of equipment?",
                    "Most programs assume common gym equipment, but every exercise has video and alternate-exercise options so you can adapt to what you have. Tap “Preview sample week” on any program to see Week 1 before you buy.",
                  ],
                  [
                    "How much time per week does it take?",
                    "Every program lists its length (weeks) and sessions per week on the card and detail page. Plans are scheduled day by day, and a typical session runs 45–75 minutes.",
                  ],
                  [
                    "Is it right for my level?",
                    "Programs are labelled by level, and sets, reps and loads scale to you. Not sure? Scan our WeChat below and we'll match you to the right program or add-on.",
                  ],
                  [
                    "Is it available in Chinese?",
                    "Yes. The whole app, workout player and exercise coaching are bilingual (English / 中文) and you can switch any time inside the portal.",
                  ],
                  [
                    "Can I message a coach after buying?",
                    "Digital programs are self-guided training. If you want 1:1 guidance, feedback or plan adjustments, ask us about our online 1:1 coaching.",
                  ],
                ]
            ).map(([q, a], i) => {
              const open = storeFaqOpen === i;
              return (
                <div
                  className={`storeFaqItemV2${open ? " storeFaqItemOpenV2" : ""}`}
                  key={i}
                >
                  <button
                    type="button"
                    className="storeFaqQV2"
                    aria-expanded={open}
                    onClick={() => setStoreFaqOpen(open ? null : i)}
                  >
                    <span>{q}</span>
                    <Plus size={18} className="storeFaqIconV2" />
                  </button>
                  {open && <p className="storeFaqAV2">{a}</p>}
                </div>
              );
            })}
          </div>
        </section>

        <section className="storeContactV2" id="storeContactAnchor">
          <div>
            <span className="storeEyebrowV2">{sZh ? "需要帮助选择？" : "Need help choosing?"}</span>
            <h2>{sZh ? "扫码咨询训练计划。" : "Scan WeChat and ask us."}</h2>
            <p>
              {sZh
                ? "我们可以根据你的项目、伤病史和训练时间推荐合适计划或加购模块。"
                : "We can help match a program or add-on to your sport, injury history, and available training time."}
            </p>
          </div>
          <img
            src="https://i.ibb.co/Y4nXVG4g/Weixin-Image-20260611202846-56-2.jpg"
            alt="WeChat QR"
            className="storeContactQrV2"
          />
        </section>
      </main>

      {storeSelectedProgram && (() => {
        const sp = storeSelectedProgram;
        const spName = sZh && sp.programNameCn ? sp.programNameCn : sp.programName;
        const spDesc =
          (sZh && (sp.storeDescriptionCn || sp.salesDescriptionCn)) ||
          sp.storeDescription ||
          sp.salesDescription ||
          "";
        const priceNum = (p: Program) => parseFloat(p.price || "0") || 0;
        const addonPrograms = isBundleProgram(sp)
          ? []
          : storePrograms.filter(isAddonProgram);
        const hasAddons = addonPrograms.length > 0;
        const selectedAddons = addonPrograms.filter((a) =>
          storeSelectedAddonIds.includes(a.recordId)
        );
        const currency = sp.currency || "CNY";
        const subtotal =
          priceNum(sp) + selectedAddons.reduce((s, a) => s + priceNum(a), 0);
        const closeModal = () => {
          setStoreSelectedProgram(null);
          setStoreRegisteredCode("");
          setStoreRegisteredOrderId("");
          setStoreRegName("");
          setStoreRegPhone("");
        };
        return (
          <div
            className="storeModalBackdropV2"
            onClick={closeModal}
          >
            <div className="storeModalV2" onClick={(e) => e.stopPropagation()}>
              <button
                className="storeModalCloseV2"
                aria-label="Close"
                onClick={() => {
                  setStoreSelectedProgram(null);
                  setStoreRegisteredCode("");
                  setStoreRegisteredOrderId("");
                  setStoreRegName("");
                  setStoreRegPhone("");
                }}
              >
                x
              </button>
              <div className="storeModalInnerV2">
                <div className="storeModalImageV2">
                  {sp.productImage ? (
                    <img src={sp.productImage} alt={spName} />
                  ) : (
                    <div className="storeModalFallbackV2">
                      <img src="/nl_monogram_clean.png" alt="" />
                    </div>
                  )}
                </div>
                <div className="storeModalInfoV2">
                  {(() => {
                    const totalSteps = hasAddons ? 3 : 2;
                    // Step 3 (cart) is shown as step 2 when the add-on step is skipped.
                    const displayStep =
                      !hasAddons && storeStep === 3 ? 2 : storeStep;
                    return (
                      <span className="storeEyebrowV2">
                        {sZh
                          ? `第 ${displayStep} 步 / 共 ${totalSteps} 步`
                          : `Step ${displayStep} of ${totalSteps}`}
                      </span>
                    );
                  })()}
                  <h2>{spName}</h2>

                  {/* Step 1 — program / bundle details */}
                  {storeStep === 1 && (
                    <>
                      <p>{spDesc}</p>
                      <div className="storeProductTagsV2">
                        {isBundleProgram(sp) && (
                          <span className="storeBundleBadge">
                            {sZh ? "套餐" : "Package"}
                          </span>
                        )}
                        <span>{formatDuration(sp)}</span>
                        <span>{sp.level || (sZh ? "多水平" : "All levels")}</span>
                        <span>{formatPrice(sp)}</span>
                      </div>

                      {isBundleProgram(sp) &&
                        bundleIncludes(sp).length > 0 &&
                        (() => {
                          const total = bundleIndividualTotal(sp);
                          const bp = priceNum(sp);
                          return (
                            <div className="storeBundleIncludesV2">
                              <strong className="storeAddonsTitle">
                                {sZh ? "套餐包含" : "What's included"}
                              </strong>
                              {bundleIncludes(sp).map((p) => (
                                <div className="storeAddonRow" key={p.recordId}>
                                  <span className="storeAddonName">
                                    {sZh && p.programNameCn
                                      ? p.programNameCn
                                      : p.programName}
                                  </span>
                                  <span className="storeAddonPrice">
                                    {p.price ? `${p.currency || "CNY"} ${p.price}` : ""}
                                  </span>
                                </div>
                              ))}
                              {total > bp && bp > 0 && (
                                <div className="storeSubtotalV2">
                                  <span>
                                    <s>
                                      {currency} {total}
                                    </s>{" "}
                                    {sZh ? `省 ${total - bp}` : `Save ${total - bp}`}
                                  </span>
                                  <strong>
                                    {currency} {bp.toLocaleString()}
                                  </strong>
                                </div>
                              )}
                            </div>
                          );
                        })()}

                      <div className="storeStepActions">
                        {!isBundleProgram(sp) && (
                          <button
                            className="ghostButton storePreviewBtnV2"
                            onClick={() => openProgramPreview(sp)}
                          >
                            <Eye size={15} />{" "}
                            {sZh ? "预览样板周" : "Preview sample week"}
                          </button>
                        )}
                        <button
                          className="primaryButton"
                          onClick={() => setStoreStep(hasAddons ? 2 : 3)}
                        >
                          {hasAddons
                            ? sZh
                              ? "继续"
                              : "Continue"
                            : sZh
                            ? "加入购物车"
                            : "Add to cart"}
                        </button>
                      </div>
                    </>
                  )}

                  {/* Step 2 — optional add-ons */}
                  {storeStep === 2 && (
                    <>
                      <p className="storeStepPrompt">
                        {sZh
                          ? "需要搭配关节专项训练吗？（可跳过）"
                          : "Add joint-specific training? (optional)"}
                      </p>
                      <div className="storeAddonsV2">
                        {addonPrograms.map((a) => {
                          const checked = storeSelectedAddonIds.includes(
                            a.recordId
                          );
                          const aName =
                            sZh && a.programNameCn
                              ? a.programNameCn
                              : a.programName;
                          return (
                            <label className="storeAddonRow" key={a.recordId}>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                  setStoreSelectedAddonIds((prev: string[]) =>
                                    checked
                                      ? prev.filter((x: string) => x !== a.recordId)
                                      : [...prev, a.recordId]
                                  )
                                }
                              />
                              <span className="storeAddonName">{aName}</span>
                              <span className="storeAddonPrice">
                                {priceNum(a)
                                  ? `+ ${a.currency || "CNY"} ${a.price}`
                                  : sZh
                                  ? "免费"
                                  : "Free"}
                              </span>
                            </label>
                          );
                        })}
                        <div className="storeSubtotalV2">
                          <span>{sZh ? "小计" : "Subtotal"}</span>
                          <strong>
                            {currency} {subtotal.toLocaleString()}
                          </strong>
                        </div>
                      </div>
                      <div className="storeStepActions">
                        <button
                          className="ghostButton"
                          onClick={() => setStoreStep(1)}
                        >
                          {sZh ? "返回" : "Back"}
                        </button>
                        <button
                          className="ghostButton"
                          onClick={() => {
                            setStoreSelectedAddonIds([]);
                            setStoreStep(3);
                          }}
                        >
                          {sZh ? "跳过" : "Skip"}
                        </button>
                        <button
                          className="primaryButton"
                          onClick={() => setStoreStep(3)}
                        >
                          {sZh ? "去结算" : "Continue"}
                        </button>
                      </div>
                    </>
                  )}

                  {/* Step 3 — cart + payment */}
                  {storeStep === 3 && (
                    <>
                      <div className="storeAddonsV2">
                        <strong className="storeAddonsTitle">
                          {sZh ? "购物车" : "Your cart"}
                        </strong>
                        <div className="storeAddonRow">
                          <span className="storeAddonName">{spName}</span>
                          <span className="storeAddonPrice">
                            {currency} {priceNum(sp)}
                          </span>
                        </div>
                        {selectedAddons.map((a) => (
                          <div className="storeAddonRow" key={a.recordId}>
                            <span className="storeAddonName">
                              {sZh && a.programNameCn
                                ? a.programNameCn
                                : a.programName}
                            </span>
                            <span className="storeAddonPrice">
                              {currency} {priceNum(a)}
                            </span>
                          </div>
                        ))}
                        <div className="storeSubtotalV2">
                          <span>{sZh ? "合计" : "Total"}</span>
                          <strong>
                            {currency} {subtotal.toLocaleString()}
                          </strong>
                        </div>
                      </div>

                      {storeRegisteredCode ? (
                        <div className="storeConfirmV2">
                          <div
                            className="storeConfirmCheckV2"
                            aria-hidden="true"
                          >
                            <Check size={28} />
                          </div>
                          <strong className="storeConfirmTitleV2">
                            {sZh ? "你已成功加入！" : "You're in!"}
                          </strong>
                          <p className="storeConfirmSubV2">
                            {sZh
                              ? `${spName} 已准备就绪。完成一份简短问卷后，整套计划会加载进你的 App。`
                              : `${spName} is ready. Complete a short intake and the full plan loads into your app.`}
                          </p>
                          <div className="storeConfirmMetaV2">
                            {storeRegisteredOrderId && (
                              <div>
                                <span>{sZh ? "订单号" : "Order"}</span>
                                <strong>{storeRegisteredOrderId}</strong>
                              </div>
                            )}
                            <div>
                              <span>{sZh ? "登录代码" : "Login code"}</span>
                              <strong>{storeRegisteredCode}</strong>
                            </div>
                          </div>
                          <p className="storeConfirmNoteV2">
                            {sZh
                              ? `请保存好登录代码——以后用它进入客户端。我们会用付款备注代码 ${storePaymentCode || ""} 核对你的微信付款，你可以立即开始。`
                              : `Save your login code — you'll use it to open your portal. We'll match your WeChat payment via note code ${storePaymentCode || ""}; you can start right away.`}
                          </p>
                          <a
                            className="primaryButton storeConfirmCtaV2"
                            href={`/?portal=client&client=${encodeURIComponent(storeRegisteredCode)}`}
                          >
                            {sZh ? "打开客户端并填写问卷" : "Open my portal & start intake"}
                            <ArrowRight size={16} />
                          </a>
                        </div>
                      ) : (
                        <>
                          <ol className="storeCheckoutStepsV2">
                            <li>
                              <span>1</span>
                              {sZh ? "用微信扫码付款" : "Scan & pay with WeChat"}
                            </li>
                            <li>
                              <span>2</span>
                              {sZh ? "填写姓名和微信号" : "Enter your name + WeChat"}
                            </li>
                            <li>
                              <span>3</span>
                              {sZh ? "我们为你创建客户端" : "We open your private portal"}
                            </li>
                            <li>
                              <span>4</span>
                              {sZh ? "完成问卷，计划自动加载" : "Finish intake → plan loads"}
                            </li>
                          </ol>
                          <div className="storePayNowV2">
                            <div className="storePayNowHead">
                              <strong>{sZh ? "微信支付" : "WeChat Pay"}</strong>
                              <span className="storePayNowAmount">
                                {currency === "USD" ? "$" : "¥"}
                                {subtotal}
                              </span>
                            </div>
                            <img src="/wechat-pay-qr.jpg" alt="WeChat QR" />
                          </div>
                          {storePaymentCode && (
                            <div className="storePaymentCodeV2">
                              <span>
                                {sZh
                                  ? "转账时请在备注中填写此代码："
                                  : "Add this code to your WeChat payment note:"}
                              </span>
                              <strong>{storePaymentCode}</strong>
                              <small>
                                {sZh
                                  ? "它能让我们立刻核对你的付款，无需等待。"
                                  : "It lets us match your payment instantly — no waiting."}
                              </small>
                            </div>
                          )}
                          <div className="storeRegisterV2">
                            <label>
                              {sZh ? "姓名" : "Name"}
                              <input
                                value={storeRegName}
                                onChange={(e) => setStoreRegName(e.target.value)}
                                placeholder={sZh ? "你的姓名" : "Your name"}
                              />
                            </label>
                            <label>
                              {sZh ? "微信 / 电话" : "WeChat / Phone"}
                              <input
                                value={storeRegPhone}
                                onChange={(e) => setStoreRegPhone(e.target.value)}
                                placeholder={sZh ? "微信号或手机号" : "WeChat ID or phone"}
                              />
                            </label>
                            <button
                              className="primaryButton"
                              disabled={storeRegistering}
                              onClick={() =>
                                void registerForProgram(sp, selectedAddons)
                              }
                            >
                              {storeRegistering
                                ? storeRegStage >= 3
                                  ? sZh
                                    ? "即将完成…"
                                    : "Almost done…"
                                  : storeRegStage === 2
                                    ? sZh
                                      ? "正在分配你的问卷…"
                                      : "Assigning your intake…"
                                    : sZh
                                      ? "正在创建你的客户端…"
                                      : "Creating your portal…"
                                : sZh
                                  ? "我已付款，创建客户端"
                                  : "I've paid — create my portal"}
                            </button>
                            <span className="storeRegisterHintV2">
                              {sZh
                                ? "点击即表示你已完成微信付款。"
                                : "Tapping this confirms you've paid via WeChat."}
                            </span>
                          </div>
                          <div className="storeStepActions">
                            <button
                              className="ghostButton"
                              onClick={() => setStoreStep(hasAddons ? 2 : 1)}
                            >
                              {sZh ? "返回" : "Back"}
                            </button>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>

              </div>
            </div>
          </div>
        );
      })()}

      {previewProgram && (() => {
        const pp = previewProgram.program;
        const ppName = (sZh && pp.programNameCn) || pp.programName;
        const weekNums = Array.from(
          new Set(previewProgram.sessions.map((s) => Number(s.week) || 1))
        ).sort((a, b) => a - b);
        const firstWeek = weekNums[0] || 1;
        const sampleDays = previewProgram.sessions
          .filter((s) => (Number(s.week) || 1) === firstWeek)
          .sort((a, b) => Number(a.day) - Number(b.day));
        const lockedWeeks = Math.max(0, weekNums.length - 1);
        const ppAddons = isBundleProgram(pp)
          ? []
          : storePrograms.filter(isAddonProgram);
        return (
          <div
            className="storeModalBackdropV2 storePreviewBackdropV2"
            onClick={() => setPreviewProgram(null)}
          >
            <div
              className="storePreviewModalV2"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="storeModalCloseV2"
                aria-label="Close"
                onClick={() => setPreviewProgram(null)}
              >
                x
              </button>
              <div className="storePreviewHeadV2">
                <span className="storeEyebrowV2">
                  {sZh ? "样板周预览" : "Sample week preview"}
                </span>
                <h2>{ppName}</h2>
                <p className="storePreviewSubV2">
                  {sZh
                    ? `这是第 ${firstWeek} 周的真实安排。购买后解锁完整计划。`
                    : `A real look at Week ${firstWeek}. The full program unlocks after purchase.`}
                </p>
              </div>

              <div className="storePreviewBodyV2">
                {previewLoading ? (
                  <p className="storePreviewMsgV2">
                    {sZh ? "正在加载样板周..." : "Loading sample week..."}
                  </p>
                ) : sampleDays.length === 0 ? (
                  <p className="storePreviewMsgV2">
                    {sZh
                      ? "该计划暂无可预览的训练日。"
                      : "No preview sessions available for this program yet."}
                  </p>
                ) : (
                  <>
                    <div className="storePreviewDaysV2">
                      {sampleDays.map((s) => (
                        <div className="storePreviewDayCardV2" key={s.localId}>
                          <div className="storePreviewDayHeadV2">
                            <strong>
                              {sZh ? `第 ${s.day} 天` : `Day ${s.day}`}
                            </strong>
                            <span>
                              {(sZh && s.sessionNameCn) ||
                                s.sessionName ||
                                (sZh
                                  ? `第 ${firstWeek} 周第 ${s.day} 天`
                                  : `Week ${firstWeek} Day ${s.day}`)}
                            </span>
                          </div>
                          <div className="glanceChain">
                            {buildGlanceChain(s.exercises).map((it: any, gi: number) => (
                              <div
                                className="glanceRow"
                                key={`${it.ex.exerciseRecordId}-${gi}`}
                              >
                                <div className="glanceBadgeWrap">
                                  {it.linked && !it.isFirst && (
                                    <span
                                      className={`glanceLineUp line-${it.lineUpColor}`}
                                    />
                                  )}
                                  {it.linked && !it.isLast && (
                                    <span
                                      className={`glanceLineDown line-${it.lineDownColor}`}
                                    />
                                  )}
                                  <span
                                    className={`exerciseLabelBadge glanceBadge ${it.colorClass}`}
                                  >
                                    {it.display}
                                  </span>
                                </div>
                                <div className="glanceText">
                                  <strong>{it.ex.exerciseName}</strong>
                                  {(it.ex.sets || it.ex.reps) && (
                                    <span>
                                      {it.ex.sets && it.ex.reps
                                        ? `${it.ex.sets} x ${it.ex.reps}`
                                        : it.ex.sets || it.ex.reps}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {lockedWeeks > 0 && (
                      <div className="storePreviewLockV2">
                        <Lock size={15} />
                        <span>
                          {sZh
                            ? `还有 ${lockedWeeks} 周在购买后解锁`
                            : `${lockedWeeks} more week${
                                lockedWeeks > 1 ? "s" : ""
                              } unlock after purchase`}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="storePreviewFootV2">
                <button
                  className="ghostButton"
                  onClick={() => setPreviewProgram(null)}
                >
                  {sZh ? "返回" : "Back"}
                </button>
                <button
                  className="primaryButton"
                  onClick={() => {
                    setPreviewProgram(null);
                    const target = ppAddons.length > 0 ? 2 : 3;
                    requestStoreStep(target);
                    setStoreSelectedProgram(pp);
                    setStoreStep(target);
                  }}
                >
                  {sZh ? "获取此计划" : "Get this program"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      <footer className="storeFooterV3">
        <img src="/nl_wordmark_black.png" alt="No Limit" />
        <div className="storeFooterLinksV3">
          <a href="#catalog">{sZh ? "计划" : "Programs"}</a>
          <a href="#coach">{sZh ? "教练" : "Coaching"}</a>
          <a href="#faq">FAQ</a>
          <button type="button" onClick={() => setStoreLauncherOpen(true)}>
            {sZh ? "客户端" : "Client Portal"}
          </button>
        </div>
        <span className="storeFooterTagV3">{sZh ? "为训练而生。" : "Built for Training."}</span>
      </footer>
    </div>
  );
}
