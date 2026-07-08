// Tests library page — its own nav tab under the Library group, organized by
// test category with color-coded cards (layout mirrors the kangfu-zhuanjia
// Clinical Tests directory: category grid → tests in category → detail).
// Creating/editing a test hands off to the Physical Test Builder in
// CoachBuilderPage via the onCreateTest/onEditTest/onDuplicateTest handlers.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Copy, Pencil, Plus, Search, Trash2 } from "lucide-react";
import "./CoachTestsPage.css";
import type { SavedTestTemplate } from "./appCore";
import {
  TEST_CATEGORIES,
  normalizeTestCategory,
  testCategoryLabelKey,
  testCategoryToneStyle,
} from "./testVisuals";

export default function CoachTestsPage({
  savedTestTemplates,
  testTemplatesLoading,
  loadTestTemplates,
  onCreateTest,
  onEditTest,
  onDuplicateTest,
  deleteSavedTestTemplate,
}: {
  [key: string]: any;
}) {
  const { t } = useTranslation();
  const [category, setCategory] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    void loadTestTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeTests: SavedTestTemplate[] = useMemo(
    () =>
      (savedTestTemplates || []).filter(
        (test: SavedTestTemplate) => test.status !== "Archived"
      ),
    [savedTestTemplates]
  );

  // Group by canonical category, in the fixed TEST_CATEGORIES order so the
  // directory reads the same every visit (empty categories are omitted).
  const byCategory = useMemo(() => {
    const groups = new Map<string, SavedTestTemplate[]>();
    for (const test of activeTests) {
      const key = normalizeTestCategory(test.category);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(test);
    }
    return TEST_CATEGORIES.filter((key) => groups.has(key)).map(
      (key) => [key, groups.get(key)!] as const
    );
  }, [activeTests]);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return activeTests.filter(
      (test) =>
        (test.name || "").toLowerCase().includes(q) ||
        (test.nameCn || "").includes(query.trim()) ||
        test.items.some((item) =>
          (item.testName || "").toLowerCase().includes(q)
        )
    );
  }, [query, activeTests]);

  // Resolve the open test from the live list so a reload/edit keeps it fresh.
  const selected =
    activeTests.find(
      (test) => test.testTemplateId === selectedId || test.recordId === selectedId
    ) || null;

  const categoryLabel = (value: string) => t(testCategoryLabelKey(value));

  const renderTestCard = (test: SavedTestTemplate) => (
    <button
      type="button"
      className="ctpCard"
      key={test.recordId}
      style={testCategoryToneStyle(test.category)}
      onClick={() => setSelectedId(test.testTemplateId || test.recordId)}
    >
      <strong>{test.name || test.testTemplateId || t("testsUntitled")}</strong>
      <span>{categoryLabel(test.category || "")}</span>
      <em>{t("testsItemCount", { count: test.items.length })}</em>
    </button>
  );

  // ---------- detail ----------
  if (selected) {
    const tone = testCategoryToneStyle(selected.category);
    return (
      <div className="ctpPage">
        <button
          type="button"
          className="ctpBack"
          onClick={() => setSelectedId(null)}
        >
          <ArrowLeft size={16} /> {t("testsBackToTests")}
        </button>
        <div className="ctpDetail" style={tone}>
          <div className="ctpDetailHeader">
            <div>
              <span className="ctpCategoryBadge">
                {categoryLabel(selected.category || "")}
              </span>
              <h2>{selected.name || selected.testTemplateId}</h2>
              {selected.description && <p>{selected.description}</p>}
            </div>
            <div className="ctpDetailActions">
              <button
                type="button"
                className="outlineButton"
                onClick={() => onDuplicateTest(selected)}
              >
                <Copy size={15} /> {t("testsDuplicate")}
              </button>
              <button
                type="button"
                className="outlineButton"
                onClick={() =>
                  void Promise.resolve(deleteSavedTestTemplate(selected)).then(
                    () => setSelectedId(null)
                  )
                }
              >
                <Trash2 size={15} /> {t("testsDelete")}
              </button>
              <button
                type="button"
                className="goldButton"
                onClick={() => onEditTest(selected)}
              >
                <Pencil size={15} /> {t("testsEdit")}
              </button>
            </div>
          </div>
          <h3>{t("testsItemsTitle")}</h3>
          <div className="ctpItemList">
            {selected.items.map((item, index) => (
              <div className="ctpItemRow" key={item.recordId || index}>
                <span className="ctpItemOrder">{index + 1}</span>
                <span className="ctpItemName">
                  {item.testName || t("testsUntitled")}
                </span>
                <span className="ctpItemMeta">
                  {[item.metricType, item.unit].filter(Boolean).join(" · ")}
                </span>
                {item.createsMetric && (
                  <span className="ctpItemMetric">
                    {t("testsCreatesMetric")}
                    {item.metricName ? `: ${item.metricName}` : ""}
                  </span>
                )}
              </div>
            ))}
            {selected.items.length === 0 && (
              <p className="ctpMuted">{t("testsNoItems")}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---------- directory ----------
  return (
    <div className="ctpPage">
      <div className="ctpHead">
        <h2>{t("testsPageTitle")}</h2>
        <button type="button" className="goldButton" onClick={() => onCreateTest()}>
          <Plus size={15} /> {t("testsCreate")}
        </button>
      </div>
      <div className="ctpSearch">
        <Search size={16} />
        <input
          placeholder={t("testsSearchPlaceholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {testTemplatesLoading && activeTests.length === 0 ? (
        <p className="ctpMuted">{t("testsLoading")}</p>
      ) : query.trim() ? (
        <div className="ctpGrid">
          {searchResults.length === 0 ? (
            <p className="ctpMuted">{t("testsNoMatches")}</p>
          ) : (
            searchResults.map(renderTestCard)
          )}
        </div>
      ) : category ? (
        <>
          <button
            type="button"
            className="ctpBack"
            onClick={() => setCategory(null)}
          >
            <ArrowLeft size={16} /> {t("testsAllCategories")}
          </button>
          <h3 className="ctpCategoryTitle" style={testCategoryToneStyle(category)}>
            {categoryLabel(category)}
          </h3>
          <div className="ctpGrid">
            {(byCategory.find(([key]) => key === category)?.[1] || []).map(
              renderTestCard
            )}
          </div>
        </>
      ) : activeTests.length === 0 ? (
        <p className="ctpMuted">{t("testsNoneYet")}</p>
      ) : (
        <div className="ctpGrid">
          {byCategory.map(([key, list]) => (
            <button
              type="button"
              className="ctpCard ctpCategoryCard"
              key={key}
              style={testCategoryToneStyle(key)}
              onClick={() => setCategory(key)}
            >
              <strong>{categoryLabel(key)}</strong>
              <span>{t("testsCount", { count: list.length })}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
