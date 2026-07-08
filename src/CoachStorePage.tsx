// Digital > Store: the coach-facing view of everything live on the public
// store, grouped by sport (individual programs + bundles) with a separate
// Add-ons group, plus a one-line quick-creator for new store products.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from "react";
import "./CoachStorePage.css";
import type { Program } from "./appCore";
import { Pencil, Plus, Check, ShoppingBag } from "lucide-react";

export default function CoachStorePage({
  programs,
  existingStoreCategories,
  createStoreProduct,
  onEditProduct,
  onNewProgram,
}: {
  programs: Program[];
  existingStoreCategories: string[];
  createStoreProduct: (p: any) => Promise<boolean>;
  onEditProduct: (p: Program) => void;
  onNewProgram: () => void;
  notify: (m: string, t?: any) => void;
}) {
  const isAddon = (p: Program) =>
    (p.storeListingType || "").toLowerCase() === "add-on" ||
    p.productType === "Digital Add-on";
  const isBundle = (p: Program) =>
    (p.storeListingType || "").toLowerCase() === "bundle" ||
    p.productType === "Digital Bundle";
  const priceNum = (p: Program) => parseFloat(p.price || "0") || 0;
  const compareNum = (p: Program) => parseFloat(p.compareAtPrice || "0") || 0;
  const bundleCount = (p: Program) =>
    (p.bundleProgramIds || "").split(",").map((s) => s.trim()).filter(Boolean)
      .length;

  const storePrograms = programs.filter((p) => p.publicStoreVisible);
  const addons = storePrograms.filter(isAddon);
  const mains = storePrograms.filter((p) => !isAddon(p));

  // Group the non-add-on products by store category (sport).
  const groups = useMemo(() => {
    const map = new Map<
      string,
      { individual: Program[]; bundles: Program[] }
    >();
    for (const p of mains) {
      const key = (p.storeCategory || "").trim() || "Uncategorised";
      if (!map.has(key)) map.set(key, { individual: [], bundles: [] });
      const g = map.get(key)!;
      if (isBundle(p)) g.bundles.push(p);
      else g.individual.push(p);
    }
    return Array.from(map.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    );
  }, [mains]);

  // ---- quick creator ----
  const [name, setName] = useState("");
  const [type, setType] = useState("Digital Program");
  const [price, setPrice] = useState("");
  const [compareAt, setCompareAt] = useState("");
  const [category, setCategory] = useState("");
  const [season, setSeason] = useState("");
  const [bundleIds, setBundleIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const isBundleType = type === "Digital Bundle";
  const isAddonType = type === "Digital Add-on";
  const bundleCandidates = mains.filter((p) => !isBundle(p));

  const reset = () => {
    setName("");
    setType("Digital Program");
    setPrice("");
    setCompareAt("");
    setCategory("");
    setSeason("");
    setBundleIds([]);
  };

  const submit = async () => {
    setCreating(true);
    const ok = await createStoreProduct({
      programName: name,
      productType: type,
      price,
      compareAtPrice: compareAt,
      storeCategory: category,
      season,
      bundleProgramIds: isBundleType ? bundleIds : [],
    });
    setCreating(false);
    if (ok) reset();
  };

  const bundleTotal = bundleCandidates
    .filter((p) => bundleIds.includes(p.programId))
    .reduce((s, p) => s + priceNum(p), 0);

  const priceTag = (p: Program) => {
    const c = p.currency || "CNY";
    return (
      <span className="cspPrice">
        {compareNum(p) > priceNum(p) && (
          <s>
            {c} {compareNum(p)}
          </s>
        )}
        {priceNum(p) ? `${c} ${priceNum(p)}` : "—"}
      </span>
    );
  };

  const productRow = (p: Program) => (
    <div className="cspRow" key={p.recordId}>
      <div className="cspRowMain">
        <strong>{p.programName}</strong>
        <small>
          {p.productStatus || "Draft"}
          {isBundle(p) ? ` · ${bundleCount(p)} programs` : ""}
        </small>
      </div>
      {priceTag(p)}
      <button
        type="button"
        className="cspEditBtn"
        onClick={() => onEditProduct(p)}
      >
        <Pencil size={13} /> Edit
      </button>
    </div>
  );

  return (
    <div className="coachStorePage">
      <div className="cspHead">
        <div>
          <span className="cspEyebrow">
            <ShoppingBag size={13} /> Digital Store
          </span>
          <h2>Store products</h2>
          <p>
            {storePrograms.length} live · {mains.filter((p) => !isBundle(p)).length}{" "}
            programs · {mains.filter(isBundle).length} bundles · {addons.length}{" "}
            add-ons
          </p>
        </div>
      </div>

      {/* ---- quick creator ---- */}
      <div className="cspCreator">
        <div className="cspCreatorRow">
          <input
            className="cspInput cspGrow"
            placeholder="New product name…"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="cspTypePick">
            {["Digital Program", "Digital Bundle", "Digital Add-on"].map((t) => (
              <button
                type="button"
                key={t}
                className={type === t ? "active" : ""}
                onClick={() => setType(t)}
              >
                {t === "Digital Program"
                  ? "Program"
                  : t === "Digital Bundle"
                    ? "Bundle"
                    : "Add-on"}
              </button>
            ))}
          </div>
          <input
            className="cspInput cspNarrow"
            type="number"
            min="0"
            placeholder="Price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
          <input
            className="cspInput cspNarrow"
            type="number"
            min="0"
            placeholder="Was (opt)"
            value={compareAt}
            onChange={(e) => setCompareAt(e.target.value)}
          />
          <button
            type="button"
            className="cspCreateBtn"
            disabled={creating || !name.trim()}
            onClick={submit}
          >
            <Plus size={15} /> {creating ? "Creating…" : "Create"}
          </button>
        </div>

        {!isAddonType && (
          <div className="cspCategoryRow">
            <span className="cspFieldLabel">Sport / category</span>
            <div className="cspChips">
              {existingStoreCategories.map((cat) => (
                <button
                  type="button"
                  key={cat}
                  className={`cspChip${category === cat ? " active" : ""}`}
                  onClick={() => setCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
            <input
              className="cspInput cspNarrow"
              placeholder="or new label…"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
            <input
              className="cspInput cspTiny"
              type="number"
              min="1"
              placeholder="Season"
              value={season}
              onChange={(e) => setSeason(e.target.value)}
            />
          </div>
        )}

        {isBundleType && (
          <div className="cspBundlePick">
            <span className="cspFieldLabel">
              Programs in this bundle
              {bundleIds.length > 0 &&
                ` · individual total ¥${bundleTotal}${
                  price ? ` · bundle ¥${price} · save ¥${bundleTotal - Number(price || 0)}` : ""
                }`}
            </span>
            <div className="cspBundleList">
              {bundleCandidates.length === 0 && (
                <p className="cspEmpty">
                  No individual programs yet — create some first.
                </p>
              )}
              {bundleCandidates.map((p) => {
                const on = bundleIds.includes(p.programId);
                return (
                  <button
                    type="button"
                    key={p.recordId}
                    className={`cspBundleItem${on ? " on" : ""}`}
                    onClick={() =>
                      setBundleIds((prev) =>
                        on
                          ? prev.filter((x) => x !== p.programId)
                          : [...prev, p.programId]
                      )
                    }
                  >
                    <span className="cspBundleCheck">
                      {on && <Check size={12} />}
                    </span>
                    <span>{p.programName}</span>
                    <span className="cspBundleItemPrice">
                      {p.price ? `${p.currency || "CNY"} ${p.price}` : "—"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <p className="cspCreatorHint">
          Creating a program here makes the store listing + pricing. Add its
          workouts afterwards from{" "}
          <button type="button" className="cspLink" onClick={onNewProgram}>
            the Digital Program builder
          </button>
          . Bundles and add-ons need no workouts of their own.
        </p>
      </div>

      {/* ---- live products, grouped by sport ---- */}
      {storePrograms.length === 0 ? (
        <p className="cspEmpty cspEmptyBig">
          Nothing is live on the store yet. Create your first product above.
        </p>
      ) : (
        <>
          {groups.map(([sport, g]) => (
            <div className="cspGroup" key={sport}>
              <h3 className="cspGroupTitle">{sport}</h3>
              {g.individual.length > 0 && (
                <div className="cspSub">
                  <span className="cspSubLabel">Individual programs</span>
                  {g.individual.map(productRow)}
                </div>
              )}
              {g.bundles.length > 0 && (
                <div className="cspSub">
                  <span className="cspSubLabel">Bundles</span>
                  {g.bundles.map(productRow)}
                </div>
              )}
            </div>
          ))}

          {addons.length > 0 && (
            <div className="cspGroup">
              <h3 className="cspGroupTitle">Add-ons</h3>
              <div className="cspSub">{addons.map(productRow)}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
