// Digital > Store: the coach-facing storefront admin. Products (live + draft)
// grouped by sport with a per-product Live toggle, a guided create flow, and a
// Product Settings slide-over. Live/Draft is unified on `publicStoreVisible`
// (productStatus is no longer shown as the row label). Recreated from the
// StoreAdminReference design — exact palette/type/motion.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import "./CoachStorePage.css";
import type { Program } from "./appCore";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Layers,
  Pencil,
  Plus,
  PlusCircle,
  ShoppingBag,
  X,
} from "lucide-react";

type Kind = "program" | "bundle" | "addon";

const TYPE_META: Record<
  Kind,
  { label: string; bg: string; color: string; Icon: any }
> = {
  program: { label: "Program", bg: "#e8f0ff", color: "#1f5fd6", Icon: Dumbbell },
  bundle: { label: "Bundle", bg: "#f3ecfb", color: "#6a2f9e", Icon: Layers },
  addon: { label: "Add-on", bg: "#e6f6f7", color: "#0c7382", Icon: PlusCircle },
};

const EASE = [0.16, 1, 0.3, 1] as const;

const trackStyle = (on: boolean): any => ({
  flex: "none",
  width: 46,
  height: 26,
  borderRadius: 999,
  border: "none",
  cursor: "pointer",
  position: "relative",
  padding: 0,
  transition: "background .2s",
  background: on ? "linear-gradient(140deg,#e6c766,#b5731a)" : "#d8cfba",
});
const knobStyle = (on: boolean): any => ({
  position: "absolute",
  top: 3,
  left: on ? 23 : 3,
  width: 20,
  height: 20,
  borderRadius: "50%",
  background: "#fff",
  transition: "left .2s",
  boxShadow: "0 1px 3px rgba(0,0,0,.3)",
});

export default function CoachStorePage({
  programs,
  existingStoreCategories,
  createStoreProduct,
  setProductLive,
  saveProduct,
  onEditProduct,
  onNewProgram,
}: {
  programs: Program[];
  existingStoreCategories: string[];
  createStoreProduct: (p: any) => Promise<boolean>;
  setProductLive: (program: Program, live: boolean) => Promise<void> | void;
  saveProduct: (program: Program, patch: Record<string, any>) => Promise<void> | void;
  onEditProduct: (p: Program) => void;
  onNewProgram: () => void;
  notify: (m: string, t?: any) => void;
}) {
  const reduce = useReducedMotion();

  // Optimistic overrides keyed by recordId, merged over the props until the
  // parent refresh lands and the override is dropped.
  const [overrides, setOverrides] = useState<Record<string, Partial<Program>>>(
    {}
  );
  const [filter, setFilter] = useState<"live" | "drafts" | "all">("live");
  const [typeFilter, setTypeFilter] = useState<"all" | Kind>("all");

  // create flow
  const [createOpen, setCreateOpen] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [createType, setCreateType] = useState<Kind | "">("");
  const [cName, setCName] = useState("");
  const [cSport, setCSport] = useState("");
  const [cNewCat, setCNewCat] = useState("");
  const [cSeason, setCSeason] = useState("");
  const [cPrice, setCPrice] = useState("");
  const [cWas, setCWas] = useState("");
  const [cBundleIds, setCBundleIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  // edit slide-over
  const [editId, setEditId] = useState<string | null>(null);
  const [eDraft, setEDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!createOpen && editId == null) return;
    const closeLayer = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (editId != null) setEditId(null);
      else setCreateOpen(false);
    };
    window.addEventListener("keydown", closeLayer);
    return () => window.removeEventListener("keydown", closeLayer);
  }, [createOpen, editId]);

  // ---- helpers ----
  const isAddon = (p: Program) =>
    (p.storeListingType || "").toLowerCase() === "add-on" ||
    p.productType === "Digital Add-on";
  const isBundle = (p: Program) =>
    (p.storeListingType || "").toLowerCase() === "bundle" ||
    p.productType === "Digital Bundle";
  const kindOf = (p: Program): Kind =>
    isAddon(p) ? "addon" : isBundle(p) ? "bundle" : "program";
  const isStoreProduct = (p: Program) =>
    ["Digital Program", "Digital Add-on", "Digital Bundle"].includes(
      p.productType || ""
    ) || Boolean(p.publicStoreVisible);
  const eff = (p: Program): Program => ({ ...p, ...(overrides[p.recordId] || {}) });
  const isLive = (p: Program) => Boolean(eff(p).publicStoreVisible);
  const priceNum = (p: Program) => parseFloat(eff(p).price || "0") || 0;
  const compareNum = (p: Program) => parseFloat(eff(p).compareAtPrice || "0") || 0;
  const money = (n: number, c?: string) => (n ? `${c || "CNY"} ${n}` : "—");
  // No saved-template count in the props — the planned session count
  // (weeks × sessions/week) is the honest real-data proxy.
  const workoutsOf = (p: Program) =>
    (parseInt(p.durationWeeks || "", 10) || 0) *
    (parseInt(p.sessionsPerWeek || "", 10) || 0);
  const bundleMembers = (p: Program) =>
    (p.bundleProgramIds || "").split(",").map((s) => s.trim()).filter(Boolean);

  const storeProducts = useMemo(
    () => programs.filter(isStoreProduct),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [programs]
  );

  // ---- optimistic toggle ----
  const toggleLive = (p: Program) => {
    const next = !isLive(p);
    setOverrides((o) => ({
      ...o,
      [p.recordId]: { ...(o[p.recordId] || {}), publicStoreVisible: next },
    }));
    Promise.resolve(setProductLive(p, next))
      .then(() =>
        setOverrides((o) => {
          const n = { ...o };
          delete n[p.recordId];
          return n;
        })
      )
      .catch(() =>
        setOverrides((o) => ({
          ...o,
          [p.recordId]: { ...(o[p.recordId] || {}), publicStoreVisible: !next },
        }))
      );
  };

  // ---- counts ----
  const liveProducts = storeProducts.filter(isLive);
  const sumLive = liveProducts.length;
  const sumPrograms = liveProducts.filter((p) => kindOf(p) === "program").length;
  const sumBundles = liveProducts.filter((p) => kindOf(p) === "bundle").length;
  const sumAddons = liveProducts.filter((p) => kindOf(p) === "addon").length;
  const sumDrafts = storeProducts.length - sumLive;

  // ---- filtered + grouped ----
  let base = storeProducts.slice();
  if (filter === "live") base = base.filter(isLive);
  else if (filter === "drafts") base = base.filter((p) => !isLive(p));
  if (typeFilter !== "all") base = base.filter((p) => kindOf(p) === typeFilter);

  const addonItems = base.filter((p) => kindOf(p) === "addon");
  const mainItems = base.filter((p) => kindOf(p) !== "addon");
  const groupMap = new Map<string, Program[]>();
  for (const p of mainItems) {
    const key = (p.storeCategory || "").trim() || "Uncategorised";
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key)!.push(p);
  }
  const groups: Array<{ title: string; items: Program[] }> = Array.from(
    groupMap.entries()
  )
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([title, items]) => ({ title, items }));
  if (addonItems.length) groups.push({ title: "Add-ons", items: addonItems });
  const empty = groups.length === 0;

  // ---- create flow ----
  const productTypeFor = (k: Kind) =>
    k === "bundle"
      ? "Digital Bundle"
      : k === "addon"
        ? "Digital Add-on"
        : "Digital Program";
  const resetCreate = () => {
    setCreateType("");
    setCName("");
    setCSport("");
    setCNewCat("");
    setCSeason("");
    setCPrice("");
    setCWas("");
    setCBundleIds([]);
    setCreateStep(1);
  };
  const openCreate = () => {
    resetCreate();
    setCreateOpen(true);
  };
  const pickType = (k: Kind) => {
    setCreateType(k);
    setCreateStep(2);
  };
  const bundleCandidates = programs.filter(
    (p) => kindOf(p) === "program" && isStoreProduct(p)
  );
  const bundleTotal = bundleCandidates
    .filter((p) => cBundleIds.includes(p.programId))
    .reduce((s, p) => s + (parseFloat(p.price || "0") || 0), 0);
  const savePrice = parseFloat(cPrice || "0") || 0;
  const bundleSaveText = cBundleIds.length
    ? savePrice
      ? `¥${bundleTotal} value → save ¥${Math.max(0, bundleTotal - savePrice)}`
      : `¥${bundleTotal} individual value`
    : "Pick 2+ programs";

  const submitCreate = async (live: boolean) => {
    if (!createType) return;
    setCreating(true);
    const ok = await createStoreProduct({
      programName: cName,
      productType: productTypeFor(createType),
      price: cPrice,
      compareAtPrice: cWas,
      storeCategory: createType === "addon" ? "" : cNewCat.trim() || cSport,
      season: createType === "program" ? cSeason : "",
      bundleProgramIds: createType === "bundle" ? cBundleIds : [],
      publicStoreVisible: live,
    });
    setCreating(false);
    if (ok) {
      setCreateOpen(false);
      setFilter(live ? "live" : "drafts");
      setTypeFilter("all");
      resetCreate();
    }
  };

  // ---- edit slide-over ----
  const editProgram = editId
    ? storeProducts.find((p) => p.recordId === editId) || null
    : null;
  const openEdit = (p: Program) => {
    const e = eff(p);
    setEDraft({
      price: e.price || "",
      compareAtPrice: e.compareAtPrice || "",
      currency: e.currency || "CNY",
      storeCategory: e.storeCategory || "",
      season: e.season || "",
      accessLengthDays: e.accessLengthDays || "",
      salesDescription: e.salesDescription || "",
    });
    setEditId(p.recordId);
  };
  const saveEdit = async () => {
    if (!editProgram) return;
    const p = editProgram;
    const patch = { ...eDraft };
    setOverrides((o) => ({
      ...o,
      [p.recordId]: { ...(o[p.recordId] || {}), ...(patch as any) },
    }));
    setSaving(true);
    try {
      await Promise.resolve(saveProduct(p, patch));
      setOverrides((o) => {
        const n = { ...o };
        delete n[p.recordId];
        return n;
      });
    } catch {
      // Drop the optimistic override on failure — keeping it made the row
      // display unsaved values as saved after the error toast expired.
      setOverrides((o) => {
        const n = { ...o };
        delete n[p.recordId];
        return n;
      });
    }
    setSaving(false);
    setEditId(null);
  };

  const fade = reduce
    ? {}
    : { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } };

  // ---- product row ----
  const Row = (p: Program) => {
    const k = kindOf(p);
    const meta = TYPE_META[k];
    const live = isLive(p);
    const season = eff(p).season;
    const was = compareNum(p) > priceNum(p) ? compareNum(p) : 0;
    const workouts = workoutsOf(p);
    const needsWork = k === "program" && workouts === 0;
    const metaText =
      k === "bundle"
        ? `${bundleMembers(p).length} programs`
        : k === "addon"
          ? "Attaches at checkout"
          : workouts
            ? `${workouts} workouts`
            : "";
    return (
      <div className="cspRow" key={p.recordId}>
        <div className="cspBadge" style={{ background: meta.bg, color: meta.color }}>
          <meta.Icon size={21} />
        </div>
        <div className="cspRowMain">
          <div className="cspRowName">
            <strong>{p.programName}</strong>
            {season && <span className="cspSeasonTag">S{season}</span>}
          </div>
          <div className="cspRowMeta">
            <span>{meta.label}</span>
            {(needsWork || metaText) && <span className="cspDot">·</span>}
            {needsWork && (
              <span className="cspNoWork">
                <AlertTriangle size={12} /> No workouts yet
              </span>
            )}
            {metaText && <span>{metaText}</span>}
          </div>
        </div>
        <div className="cspRowPrice">
          {was > 0 && <s>{money(was, eff(p).currency)}</s>}
          <span>{money(priceNum(p), eff(p).currency)}</span>
        </div>
        <div className="cspRowLive">
          <span
            className="cspLiveLabel"
            style={{ color: live ? "#237a30" : "#a8a091" }}
          >
            {live ? "Live" : "Draft"}
          </span>
          <button
            type="button"
            style={trackStyle(live)}
            role="switch"
            aria-checked={live}
            aria-label={`${live ? "Hide" : "Publish"} ${p.programName} on the store`}
            onClick={() => toggleLive(p)}
          >
            <span style={knobStyle(live)} />
          </button>
        </div>
        <button type="button" className="cspSettingsBtn" onClick={() => openEdit(p)}>
          <Pencil size={14} /> Settings
        </button>
      </div>
    );
  };

  return (
    <div className="coachStorePage">
      {/* header */}
      <div className="cspHead">
        <div>
          <span className="cspEyebrow">
            <ShoppingBag size={14} /> Digital Store
          </span>
          <h1>Store products</h1>
          <p>
            Everything clients can buy — grouped by sport, with live status you
            can flip in a tap.
          </p>
        </div>
        <button type="button" className="cspNewBtn" onClick={openCreate}>
          <Plus size={17} /> New product
        </button>
      </div>

      {/* storefront board */}
      <div className="cspBoard">
        <div className="cspBoardLive">
          <div className="cspBoardGlow" />
          <span className="cspBoardEyebrow">Live on the store</span>
          <div className="cspBoardBig">
            <span>{sumLive}</span>
            <small>products clients can buy right now</small>
          </div>
          <div className="cspBoardBreak">
            <span>
              <strong>{sumPrograms}</strong> programs
            </span>
            <span>
              <strong>{sumBundles}</strong> bundles
            </span>
            <span>
              <strong>{sumAddons}</strong> add-ons
            </span>
          </div>
        </div>
        <div className="cspBoardDraft">
          <span className="cspBoardEyebrowDraft">Drafts</span>
          <div className="cspBoardBig">
            <span className="cspBoardBigDark">{sumDrafts}</span>
            <small>hidden from clients</small>
          </div>
          <p>Finish these, then flip them live.</p>
        </div>
      </div>

      {/* filter bar */}
      <div className="cspFilters">
        <div className="cspStatusTabs">
          {([
            ["live", `Live · ${sumLive}`],
            ["drafts", `Drafts · ${sumDrafts}`],
            ["all", "All"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={filter === key ? "active" : ""}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="cspTypeChips">
          {([
            ["all", "All types"],
            ["program", "Programs"],
            ["bundle", "Bundles"],
            ["addon", "Add-ons"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`cspChip${typeFilter === key ? " active" : ""}`}
              onClick={() => setTypeFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* groups */}
      {empty ? (
        <div className="cspEmpty">
          <p className="cspEmptyTitle">
            {filter === "drafts"
              ? "No drafts"
              : filter === "live"
                ? "Nothing live yet"
                : "No products"}
          </p>
          <p className="cspEmptySub">
            {filter === "drafts"
              ? "Every product is live on the store."
              : "Create your first product to get started."}
          </p>
        </div>
      ) : (
        groups.map((g) => (
          <div className="cspGroup" key={g.title}>
            <div className="cspGroupHead">
              <h2>{g.title}</h2>
              <span>{g.items.length}</span>
            </div>
            {g.items.map(Row)}
          </div>
        ))
      )}

      {/* ===== create flow ===== */}
      <AnimatePresence>
        {createOpen && (
          <motion.div
            className="cspModalScrim"
            onClick={() => setCreateOpen(false)}
            {...fade}
            transition={{ duration: 0.18 }}
          >
            <motion.div
              className="cspModal"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label={
                createStep === 1
                  ? "Choose store product type"
                  : `Create ${createType || "store product"}`
              }
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.985 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.985 }}
              transition={{ duration: 0.24, ease: EASE }}
            >
              <div className="cspModalHead">
                <div>
                  <span className="cspEyebrow2">New store product</span>
                  <h2>
                    {createStep === 1
                      ? "What are you selling?"
                      : createType === "bundle"
                        ? "New bundle"
                        : createType === "addon"
                          ? "New add-on"
                          : "New program"}
                  </h2>
                </div>
                <button
                  type="button"
                  className="cspModalClose"
                  onClick={() => setCreateOpen(false)}
                  aria-label="Close new product"
                >
                  <X size={18} />
                </button>
              </div>

              {createStep === 1 ? (
                <div className="cspModalBody">
                  <p className="cspStepHint">
                    Pick what you're selling. You can change pricing and status
                    any time.
                  </p>
                  <div className="cspTypeCards">
                    {(
                      [
                        [
                          "program",
                          "Standalone program",
                          "A single training program clients buy and follow. Add its workouts afterwards in the builder.",
                        ],
                        [
                          "bundle",
                          "Bundle",
                          "Package several programs together at a discount. No workouts of its own.",
                        ],
                        [
                          "addon",
                          "Add-on",
                          "A small extra (e.g. joint prehab) clients attach to any program at a discount.",
                        ],
                      ] as const
                    ).map(([k, title, desc]) => {
                      const m = TYPE_META[k];
                      return (
                        <button
                          key={k}
                          type="button"
                          className={`cspTypeCard cspTypeCard-${k}`}
                          onClick={() => pickType(k)}
                        >
                          <span
                            className="cspBadge cspBadgeLg"
                            style={{ background: m.bg, color: m.color }}
                          >
                            <m.Icon size={22} />
                          </span>
                          <span className="cspTypeCardText">
                            <strong>{title}</strong>
                            <small>{desc}</small>
                          </span>
                          <ChevronRight size={20} className="cspTypeCardChev" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="cspModalBody">
                  <button
                    type="button"
                    className="cspBackLink"
                    onClick={() => setCreateStep(1)}
                  >
                    <ChevronLeft size={15} />{" "}
                    {createType === "bundle"
                      ? "Bundle"
                      : createType === "addon"
                        ? "Add-on"
                        : "Standalone program"}
                  </button>

                  <label className="cspField">
                    <span>Product name</span>
                    <input
                      value={cName}
                      onChange={(e) => setCName(e.target.value)}
                      placeholder="e.g. Climbing S3 – Peak Power"
                    />
                  </label>

                  {createType !== "addon" && (
                    <div className="cspField">
                      <span>Sport / category</span>
                      <div className="cspCatChips">
                        {existingStoreCategories.map((cat) => (
                          <button
                            type="button"
                            key={cat}
                            className={`cspCatChip${
                              !cNewCat.trim() && cSport === cat ? " active" : ""
                            }`}
                            onClick={() => {
                              setCSport(cat);
                              setCNewCat("");
                            }}
                          >
                            {cat}
                          </button>
                        ))}
                        <input
                          className="cspCatNew"
                          value={cNewCat}
                          onChange={(e) => setCNewCat(e.target.value)}
                          placeholder="or new label…"
                        />
                      </div>
                    </div>
                  )}

                  <div className="cspFieldRow">
                    <label className="cspField cspFieldGrow">
                      <span>Price (CNY)</span>
                      <input
                        type="number"
                        min="0"
                        value={cPrice}
                        onChange={(e) => setCPrice(e.target.value)}
                        placeholder="299"
                      />
                    </label>
                    <label className="cspField cspFieldGrow">
                      <span>
                        Was <em>(optional)</em>
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={cWas}
                        onChange={(e) => setCWas(e.target.value)}
                        placeholder="struck-through"
                      />
                    </label>
                    {createType === "program" && (
                      <label className="cspField cspFieldSeason">
                        <span>Season</span>
                        <input
                          type="number"
                          min="1"
                          value={cSeason}
                          onChange={(e) => setCSeason(e.target.value)}
                          placeholder="1"
                        />
                      </label>
                    )}
                  </div>

                  {createType === "bundle" && (
                    <div className="cspBundlePick">
                      <div className="cspBundlePickHead">
                        <span>Programs in this bundle</span>
                        <span className="cspBundleSave">{bundleSaveText}</span>
                      </div>
                      <div className="cspBundleList">
                        {bundleCandidates.length === 0 && (
                          <p className="cspEmptySub">
                            No individual programs yet — create some first.
                          </p>
                        )}
                        {bundleCandidates.map((p) => {
                          const on = cBundleIds.includes(p.programId);
                          return (
                            <button
                              type="button"
                              key={p.recordId}
                              className={`cspBundleItem${on ? " on" : ""}`}
                              onClick={() =>
                                setCBundleIds((prev) =>
                                  on
                                    ? prev.filter((x) => x !== p.programId)
                                    : [...prev, p.programId]
                                )
                              }
                            >
                              <span className="cspBundleCheck">
                                {on && <Check size={12} />}
                              </span>
                              <span className="cspBundleName">
                                {p.programName}
                              </span>
                              <span className="cspBundlePrice">
                                {money(
                                  parseFloat(p.price || "0") || 0,
                                  p.currency
                                )}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {createType === "program" && (
                    <p className="cspProgramNote">
                      This creates the store listing + pricing. Add its workouts
                      next in{" "}
                      <button
                        type="button"
                        className="cspInlineLink"
                        onClick={onNewProgram}
                      >
                        the Digital Program builder
                      </button>
                      .
                    </p>
                  )}

                  <div className="cspCreateActions">
                    <button
                      type="button"
                      className="cspBtnGhost"
                      disabled={creating || !cName.trim()}
                      onClick={() => submitCreate(false)}
                    >
                      Save as draft
                    </button>
                    <button
                      type="button"
                      className="cspBtnGold"
                      disabled={creating || !cName.trim()}
                      onClick={() => submitCreate(true)}
                    >
                      <Check size={16} /> Create &amp; make live
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== product settings slide-over ===== */}
      <AnimatePresence>
        {editProgram && (
          <motion.div
            className="cspSlideScrim"
            onClick={() => setEditId(null)}
            {...fade}
            transition={{ duration: 0.16 }}
          >
            {(() => {
              const p = editProgram;
              const k = kindOf(p);
              const live = isLive(p);
              const needsWork = k === "program" && workoutsOf(p) === 0;
              return (
                <motion.div
                  className="cspSlide"
                  onClick={(e) => e.stopPropagation()}
                  role="dialog"
                  aria-modal="true"
                  aria-label={`Product settings for ${p.programName}`}
                  initial={reduce ? { opacity: 0 } : { x: "100%" }}
                  animate={reduce ? { opacity: 1 } : { x: 0 }}
                  exit={reduce ? { opacity: 0 } : { x: "100%" }}
                  transition={{ duration: 0.26, ease: EASE }}
                >
                  <div className="cspSlideHead">
                    <div>
                      <span className="cspEyebrow2">
                        {TYPE_META[k].label} · Product settings
                      </span>
                      <h2>{p.programName}</h2>
                    </div>
                    <button
                      type="button"
                      className="cspModalClose"
                      onClick={() => setEditId(null)}
                      aria-label="Close product settings"
                    >
                      <X size={17} />
                    </button>
                  </div>

                  <div className="cspSlideBody">
                    <div
                      className="cspLiveCard"
                      style={{
                        borderColor: live ? "#c2e6cd" : "#e7e2d6",
                        background: live ? "#eefaf1" : "#fff",
                      }}
                    >
                      <div>
                        <strong>Live on the store</strong>
                        <span>
                          {live
                            ? "Clients can find and buy this now."
                            : "Hidden from clients until you flip it on."}
                        </span>
                      </div>
                      <button
                        type="button"
                        style={trackStyle(live)}
                        role="switch"
                        aria-checked={live}
                        aria-label={`${live ? "Hide" : "Publish"} ${p.programName} on the store`}
                        onClick={() => toggleLive(p)}
                      >
                        <span style={knobStyle(live)} />
                      </button>
                    </div>

                    {needsWork && (
                      <div className="cspWarnStrip">
                        <AlertTriangle size={16} />
                        <span>
                          This program has no workouts yet. Add them in the
                          builder before clients can train.
                        </span>
                      </div>
                    )}

                    <div className="cspSectionLabel">Pricing</div>
                    <div className="cspFieldRow">
                      <label className="cspField cspFieldGrow">
                        <span>Price</span>
                        <input
                          type="number"
                          min="0"
                          value={eDraft.price}
                          onChange={(e) =>
                            setEDraft((d) => ({ ...d, price: e.target.value }))
                          }
                        />
                      </label>
                      <label className="cspField cspFieldGrow">
                        <span>Was</span>
                        <input
                          type="number"
                          min="0"
                          value={eDraft.compareAtPrice}
                          onChange={(e) =>
                            setEDraft((d) => ({
                              ...d,
                              compareAtPrice: e.target.value,
                            }))
                          }
                        />
                      </label>
                      <label className="cspField cspFieldCurrency">
                        <span>Currency</span>
                        <select
                          value={eDraft.currency}
                          onChange={(e) =>
                            setEDraft((d) => ({ ...d, currency: e.target.value }))
                          }
                        >
                          <option>CNY</option>
                          <option>USD</option>
                          <option>CAD</option>
                        </select>
                      </label>
                    </div>

                    {k !== "addon" && (
                      <>
                        <div className="cspSectionLabel">Placement</div>
                        <div className="cspFieldRow">
                          <label className="cspField cspFieldGrow">
                            <span>Sport / category</span>
                            <input
                              value={eDraft.storeCategory}
                              onChange={(e) =>
                                setEDraft((d) => ({
                                  ...d,
                                  storeCategory: e.target.value,
                                }))
                              }
                            />
                          </label>
                          {k === "program" && (
                            <label className="cspField cspFieldSeason">
                              <span>Season</span>
                              <input
                                type="number"
                                min="1"
                                value={eDraft.season}
                                onChange={(e) =>
                                  setEDraft((d) => ({
                                    ...d,
                                    season: e.target.value,
                                  }))
                                }
                              />
                            </label>
                          )}
                        </div>
                      </>
                    )}

                    <div className="cspSectionLabel">Access</div>
                    <label className="cspField">
                      <span>
                        Access length (days) <em>— blank = lifetime</em>
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={eDraft.accessLengthDays}
                        onChange={(e) =>
                          setEDraft((d) => ({
                            ...d,
                            accessLengthDays: e.target.value,
                          }))
                        }
                        placeholder="e.g. 42"
                      />
                    </label>

                    <div className="cspSectionLabel">Listing</div>
                    <label className="cspField">
                      <span>Sales description</span>
                      <textarea
                        rows={3}
                        value={eDraft.salesDescription}
                        onChange={(e) =>
                          setEDraft((d) => ({
                            ...d,
                            salesDescription: e.target.value,
                          }))
                        }
                        placeholder="One or two lines clients see on the store card…"
                      />
                    </label>

                    {k === "bundle" && bundleMembers(p).length > 0 && (
                      <div className="cspBundleMembers">
                        <div className="cspSectionLabel">Programs in bundle</div>
                        {bundleMembers(p).map((pid) => {
                          const mem = programs.find((x) => x.programId === pid);
                          return (
                            <div className="cspMemberRow" key={pid}>
                              <span>{mem?.programName || pid}</span>
                              <span className="cspMemberPrice">
                                {mem
                                  ? money(
                                      parseFloat(mem.price || "0") || 0,
                                      mem.currency
                                    )
                                  : ""}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {k === "program" && (
                      <button
                        type="button"
                        className="cspBuilderLink"
                        onClick={() => {
                          setEditId(null);
                          onEditProduct(p);
                        }}
                      >
                        <span>
                          <Dumbbell size={17} /> Edit workouts in the builder
                        </span>
                        <ChevronRight size={18} />
                      </button>
                    )}

                    <div className="cspSlideActions">
                      <button
                        type="button"
                        className="cspBtnGhost"
                        onClick={() => setEditId(null)}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="cspBtnDark"
                        disabled={saving}
                        onClick={saveEdit}
                      >
                        {saving ? "Saving…" : "Save changes"}
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
