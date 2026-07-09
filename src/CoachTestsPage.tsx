// Tests — physical-test library, redesigned into the light system (board, search,
// category cards → test cards → detail slide-over). Category colors come from
// testVisuals tone vars; all copy via t(). Creating/editing hands off to the
// Physical Test Builder (onCreateTest/onEditTest/onDuplicateTest) — untouched.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  Copy,
  FlaskConical,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import "./CoachTestsPage.css";
import type { SavedTestTemplate } from "./appCore";
import {
  TEST_CATEGORIES,
  normalizeTestCategory,
  testCategoryLabelKey,
  testCategoryToneStyle,
} from "./testVisuals";

const EASE = [0.16, 1, 0.3, 1] as const;

export default function CoachTestsPage(props: { [key: string]: any }) {
  const {
    savedTestTemplates,
    testTemplatesLoading,
    loadTestTemplates,
    onCreateTest,
    onEditTest,
    onDuplicateTest,
    deleteSavedTestTemplate,
  } = props;

  const { t } = useTranslation();
  const reduce = useReducedMotion();
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
        test.items.some((item) => (item.testName || "").toLowerCase().includes(q))
    );
  }, [query, activeTests]);

  const selected =
    activeTests.find(
      (test) => test.testTemplateId === selectedId || test.recordId === selectedId
    ) || null;

  const categoryLabel = (value: string) => t(testCategoryLabelKey(value));

  // ---- board metrics (all derived) ----
  const totalTests = activeTests.length;
  const catCount = byCategory.length;
  const itemCount = activeTests.reduce((sum, tst) => sum + tst.items.length, 0);
  const metricCount = activeTests.reduce(
    (sum, tst) => sum + tst.items.filter((it) => it.createsMetric).length,
    0
  );

  const renderTestCard = (test: SavedTestTemplate) => (
    <button
      type="button"
      className="ctpTestCard"
      key={test.recordId}
      style={testCategoryToneStyle(test.category)}
      onClick={() => setSelectedId(test.testTemplateId || test.recordId)}
    >
      <strong>{test.name || test.testTemplateId || t("testsUntitled")}</strong>
      <span className="ctpTestCardCat">{categoryLabel(test.category || "")}</span>
      <em>{t("testsItemCount", { count: test.items.length })}</em>
    </button>
  );

  const inCategory = !query.trim() && !!category;
  const searching = !!query.trim();

  return (
    <div className="ctpPage">
      {/* header */}
      <div className="ctpHead">
        <div>
          <span className="ctpEyebrow">
            <FlaskConical size={14} /> {t("testsEyebrow")}
          </span>
          <h1>{t("testsPageTitle")}</h1>
          <p>{t("testsPageSub")}</p>
        </div>
        <button type="button" className="ctpNewBtn" onClick={() => onCreateTest()}>
          <Plus size={17} /> {t("testsCreate")}
        </button>
      </div>

      {/* board */}
      <div className="ctpBoard">
        <div className="ctpBoardDark">
          <div className="ctpBoardGlow" />
          <span className="ctpBoardEyebrow">{t("testsLibrary")}</span>
          <div className="ctpBoardBig">
            <span>{totalTests}</span>
            <small>{t("testsProtocolsReady")}</small>
          </div>
          <div className="ctpBoardBreak">
            <span>
              <strong>{catCount}</strong> {t("testsCategoriesLabel")}
            </span>
            <span>
              <strong>{itemCount}</strong> {t("testsItemsLabel")}
            </span>
          </div>
        </div>
        <div className="ctpBoardLight">
          <span className="ctpBoardEyebrowLight">{t("testsCreatesMetricsTitle")}</span>
          <div className="ctpBoardBig">
            <span className="ctpBoardBigDark">{metricCount}</span>
            <small>{t("testsTrackedOverTime")}</small>
          </div>
          <p>{t("testsMetricsHint")}</p>
        </div>
      </div>

      {/* search */}
      <div className="ctpSearch">
        <Search size={16} />
        <input
          placeholder={t("testsSearchPlaceholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* content */}
      {testTemplatesLoading && activeTests.length === 0 ? (
        <p className="ctpMuted">{t("testsLoading")}</p>
      ) : searching ? (
        searchResults.length === 0 ? (
          <p className="ctpMuted">{t("testsNoMatches")}</p>
        ) : (
          <div className="ctpGrid">{searchResults.map(renderTestCard)}</div>
        )
      ) : inCategory ? (
        <>
          <button
            type="button"
            className="ctpBack"
            onClick={() => setCategory(null)}
          >
            <ArrowLeft size={15} /> {t("testsAllCategories")}
          </button>
          <h2
            className="ctpCategoryTitle"
            style={testCategoryToneStyle(category!)}
          >
            {categoryLabel(category!)}
          </h2>
          <div className="ctpGrid">
            {(byCategory.find(([key]) => key === category)?.[1] || []).map(
              renderTestCard
            )}
          </div>
        </>
      ) : activeTests.length === 0 ? (
        <div className="ctpEmpty">
          <p className="ctpEmptyTitle">{t("testsNoneYet")}</p>
        </div>
      ) : (
        <div className="ctpGrid">
          {byCategory.map(([key, list]) => (
            <button
              type="button"
              className="ctpCatCard"
              key={key}
              style={testCategoryToneStyle(key)}
              onClick={() => setCategory(key)}
            >
              <span className="ctpCatIcon">
                <FlaskConical size={18} />
              </span>
              <strong>{categoryLabel(key)}</strong>
              <span className="ctpCatCount">
                {t("testsCount", { count: list.length })}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* detail slide-over */}
      <AnimatePresence>
        {selected && (
          <motion.div
            className="ctpSlideScrim"
            onClick={() => setSelectedId(null)}
            initial={reduce ? { opacity: 0 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
          >
            <motion.div
              className="ctpSlide"
              onClick={(e) => e.stopPropagation()}
              initial={reduce ? { opacity: 0 } : { x: "100%" }}
              animate={reduce ? { opacity: 1 } : { x: 0 }}
              exit={reduce ? { opacity: 0 } : { x: "100%" }}
              transition={{ duration: 0.26, ease: EASE }}
            >
              <div
                className="ctpSlideHeader"
                style={testCategoryToneStyle(selected.category)}
              >
                <div className="ctpSlideClose">
                  <button type="button" onClick={() => setSelectedId(null)}>
                    <X size={17} />
                  </button>
                </div>
                <span className="ctpBadge">
                  {categoryLabel(selected.category || "")}
                </span>
                <h2>{selected.name || selected.testTemplateId}</h2>
                {selected.description && <p>{selected.description}</p>}
              </div>

              <div className="ctpSlideBody">
                <div className="ctpItemsLabel">
                  {t("testsItemsTitle")}{" "}
                  <span>· {selected.items.length}</span>
                </div>
                <div className="ctpItemList">
                  {selected.items.map((item, index) => (
                    <div
                      className="ctpItemRow"
                      key={item.recordId || index}
                      style={testCategoryToneStyle(selected.category)}
                    >
                      <span className="ctpItemOrder">{index + 1}</span>
                      <strong className="ctpItemName">
                        {item.testName || t("testsUntitled")}
                      </strong>
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

                <div className="ctpSlideFoot">
                  <button
                    type="button"
                    className="ctpGoldBtn"
                    onClick={() => onEditTest(selected)}
                  >
                    <Pencil size={15} /> {t("testsEdit")}
                  </button>
                  <button
                    type="button"
                    className="ctpGhostBtn"
                    onClick={() => onDuplicateTest(selected)}
                  >
                    <Copy size={15} /> {t("testsDuplicate")}
                  </button>
                  <button
                    type="button"
                    className="ctpGhostBtn ctpDangerBtn"
                    onClick={() =>
                      void Promise.resolve(
                        deleteSavedTestTemplate(selected)
                      ).then(() => setSelectedId(null))
                    }
                  >
                    <Trash2 size={15} /> {t("testsDelete")}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
