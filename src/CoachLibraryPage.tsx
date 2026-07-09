// Exercise Library — redesigned as a media card grid to match the Store /
// Digital Program / Clients pages (dark board, wrapping category chips, compact
// cards, cue slide-over). Restyle only: all handlers are threaded in from
// App.tsx; the exercise editor form + shared cue-data logic are untouched.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useRef, useState } from "react";
import "./CoachLibraryPage.css";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ClipboardList,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { parseExerciseCueSections, videoThumbnail } from "./appCore";

const BATCH = 60;
const CAP = 8;
const EASE = [0.16, 1, 0.3, 1] as const;

const CAT_COLORS: Record<string, { fg: string; bg: string; bd: string }> = {
  Squat: { fg: "#1f5fd6", bg: "#e8f0ff", bd: "#bcd3ff" },
  Hinge: { fg: "#237a30", bg: "#e9f6ee", bd: "#c2e6cd" },
  "Olympic/Power": { fg: "#a32f3e", bg: "#fdeaee", bd: "#f3c5cd" },
  "Climbing Specific": { fg: "#6a2f9e", bg: "#f3ecfb", bd: "#dcc8f0" },
  Core: { fg: "#9a6a12", bg: "#fdf0e1", bd: "#f0d8b4" },
  Conditioning: { fg: "#0c7382", bg: "#e6f6f7", bd: "#bfe6ea" },
  Cardio: { fg: "#3a4a8a", bg: "#ecedf6", bd: "#d0d4ea" },
  Accessory: { fg: "#97287f", bg: "#fbe9f6", bd: "#f1c6e4" },
  Breathing: { fg: "#0d8a7a", bg: "#e3f7f2", bd: "#bde8df" },
  Carry: { fg: "#8a5a12", bg: "#f7efe0", bd: "#ecd9b4" },
  "Horizontal Pull": { fg: "#2563a8", bg: "#e6f0fa", bd: "#c3ddf0" },
  "Horizontal Push": { fg: "#b25a20", bg: "#fbeee2", bd: "#f2d6bd" },
  "Vertical Pull": { fg: "#3a4a8a", bg: "#ecedf6", bd: "#d0d4ea" },
  "Vertical Push": { fg: "#a33f2f", bg: "#fdeee9", bd: "#f3ccc0" },
  Mobility: { fg: "#4a7a2f", bg: "#eef6e6", bd: "#cfe6bd" },
  Plyometric: { fg: "#7a3fa0", bg: "#f2ebfa", bd: "#dcc8f0" },
  "Skills / Drills": { fg: "#0c6b82", bg: "#e3f4f7", bd: "#bfe4ea" },
};
const CAT_FALLBACK = { fg: "#6b6459", bg: "#f1eee6", bd: "#e2ddcf" };
const catCol = (c?: string) => CAT_COLORS[c || ""] || CAT_FALLBACK;

export default function CoachLibraryPage(props: { [key: string]: any }) {
  const {
    deleteExercise,
    filteredLibraryExercises,
    groupedLibraryExercises,
    libraryCategoryFilter,
    libraryCategoryOptions,
    libraryExercises,
    libraryLoading,
    librarySearch,
    loadExerciseLibrary,
    openEditExerciseForm,
    openNewExerciseForm,
    setLibraryCategoryFilter,
    setLibrarySearch,
  } = props;

  const reduce = useReducedMotion();
  const [cueEx, setCueEx] = useState<any>(null);
  const [visibleCount, setVisibleCount] = useState(BATCH);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const all = (libraryExercises as any[]) || [];
  const hasCues = (e: any) =>
    parseExerciseCueSections(e?.notes || "").length > 0;
  const metaOf = (e: any) =>
    [e.equipment, e.movementPattern].filter(Boolean).join(" · ");

  // ---- board ----
  const sumTotal = all.length;
  const sumVideo = all.filter((e) => e.videoUrl).length;
  const sumCats = new Set(
    all.map((e) => (e.category || "").trim()).filter(Boolean)
  ).size;
  const sumNoCues = all.filter((e) => !hasCues(e)).length;

  // ---- category chip counts (from the full list, stable) ----
  const catCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of all) {
      const c = (e.category || "").trim();
      if (c) m[c] = (m[c] || 0) + 1;
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all]);

  const isAllView =
    libraryCategoryFilter === "All" && !String(librarySearch).trim();

  // reset incremental window whenever the filter/search changes
  useEffect(() => {
    setVisibleCount(BATCH);
  }, [libraryCategoryFilter, librarySearch]);

  // grow the window as the sentinel scrolls into view (no-dep virtualization)
  useEffect(() => {
    if (isAllView) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) setVisibleCount((c) => c + BATCH);
    });
    io.observe(el);
    return () => io.disconnect();
  }, [isAllView, filteredLibraryExercises.length]);

  const fade = reduce
    ? {}
    : { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } };

  const Card = (e: any) => {
    const col = catCol(e.category);
    const thumb = videoThumbnail(e.videoUrl || "");
    const cued = hasCues(e);
    return (
      <div
        className="clCard"
        key={e.recordId || e.exerciseId}
        onClick={() => setCueEx(e)}
      >
        <div
          className="clMedia"
          style={{
            background: thumb ? "#0d0b08" : `linear-gradient(135deg, ${col.bg}, #fff)`,
          }}
        >
          {thumb ? (
            <img className="clThumb" src={thumb} alt="" loading="lazy" />
          ) : (
            <div className="clGlyph" style={{ color: col.fg }}>
              <span className="clGlyphBar" />
              <span className="clGlyphMid" />
              <span className="clGlyphBar" />
            </div>
          )}
          <span
            className="clCatTag"
            style={{ color: col.fg, background: col.bg, borderColor: col.bd }}
          >
            {e.category || "Uncategorized"}
          </span>
          {e.videoUrl && (
            <span className="clPlayBadge">
              <Play size={14} fill="currentColor" />
            </span>
          )}
          {e.longVideoUrl && <span className="clInDepth">In-depth</span>}
        </div>
        <div className="clCardBody">
          <strong>{e.exerciseName || "Unnamed exercise"}</strong>
          {metaOf(e) && <div className="clCardMeta">{metaOf(e)}</div>}
        </div>
        <div className="clCardFoot" onClick={(ev) => ev.stopPropagation()}>
          <button
            type="button"
            className={`clCueBtn${cued ? "" : " needs"}`}
            onClick={() => setCueEx(e)}
          >
            <ClipboardList size={14} /> {cued ? "Cues" : "Add cues"}
          </button>
          <div className="clCardActions">
            <button
              type="button"
              className="clIconBtn"
              title="Edit"
              onClick={() => openEditExerciseForm(e)}
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              className="clIconBtn clIconDanger"
              title="Delete"
              onClick={() => deleteExercise(e)}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const empty =
    !libraryLoading && (filteredLibraryExercises as any[]).length === 0;

  return (
    <div className="coachLibraryPage">
      {/* header */}
      <div className="clHead">
        <div>
          <span className="clEyebrow">
            <ClipboardList size={14} /> Exercise Library
          </span>
          <h1>Exercises</h1>
          <p>Your movement library — video, cues, and categories at a glance.</p>
        </div>
        <div className="clHeadActions">
          <button
            type="button"
            className="clReload"
            title="Reload"
            onClick={() => void loadExerciseLibrary(true)}
          >
            <RefreshCw size={16} />
          </button>
          <button type="button" className="clAddBtn" onClick={openNewExerciseForm}>
            <Plus size={17} /> Add exercise
          </button>
        </div>
      </div>

      {/* board */}
      <div className="clBoard">
        <div className="clBoardLib">
          <div className="clBoardGlow" />
          <span className="clBoardEyebrow">Movement library</span>
          <div className="clBoardBig">
            <span>{sumTotal}</span>
            <small>exercises ready to program</small>
          </div>
          <div className="clBoardBreak">
            <span>
              <strong>{sumVideo}</strong> with video
            </span>
            <span>
              <strong>{sumCats}</strong> categories
            </span>
          </div>
        </div>
        <div className="clBoardCues">
          <span className="clBoardEyebrowLight">Need cues</span>
          <div className="clBoardBig">
            <span className="clBoardBigDark">{sumNoCues}</span>
            <small>missing coaching cues</small>
          </div>
          <p>Add cues so athletes train them right.</p>
        </div>
      </div>

      {/* search + wrapping category chips */}
      <div className="clSearchRow">
        <div className="clSearch">
          <Search size={16} />
          <input
            value={librarySearch}
            onChange={(e) => setLibrarySearch(e.target.value)}
            placeholder="Search exercise…"
          />
        </div>
      </div>
      <div className="clChips">
        <button
          type="button"
          className={`clChip${libraryCategoryFilter === "All" ? " active" : ""}`}
          onClick={() => setLibraryCategoryFilter("All")}
        >
          All <em>{sumTotal}</em>
        </button>
        {(libraryCategoryOptions as any[]).map((cat: string) => (
          <button
            type="button"
            key={cat}
            className={`clChip${libraryCategoryFilter === cat ? " active" : ""}`}
            onClick={() => setLibraryCategoryFilter(cat)}
          >
            {cat} <em>{catCounts[cat] || 0}</em>
          </button>
        ))}
      </div>

      {/* content */}
      {libraryLoading && (filteredLibraryExercises as any[]).length === 0 ? (
        <p className="clLoading">Loading exercises…</p>
      ) : empty ? (
        <div className="clEmpty">
          <p className="clEmptyTitle">No exercises found</p>
          <p className="clEmptySub">
            Try a different category or search — or add a new exercise.
          </p>
        </div>
      ) : isAllView ? (
        // All view: capped sections + "View all" tile
        (groupedLibraryExercises as [any, any[]][]).map(([category, items]) => {
          const col = catCol(category === "Uncategorized" ? "" : category);
          const shown = items.slice(0, CAP);
          const more = items.length - shown.length;
          return (
            <div className="clGroup" key={category}>
              <div className="clGroupHead">
                <span
                  className="clGroupTag"
                  style={{ color: col.fg, background: col.bg, borderColor: col.bd }}
                >
                  {category}
                </span>
                <span className="clGroupCount">{items.length}</span>
              </div>
              <div className="clGrid">
                {shown.map(Card)}
                {more > 0 && (
                  <button
                    type="button"
                    className="clMoreTile"
                    onClick={() => setLibraryCategoryFilter(category)}
                  >
                    <strong>+{more} more</strong>
                    <span>View all →</span>
                  </button>
                )}
              </div>
            </div>
          );
        })
      ) : (
        // Category / search view: full grid, incrementally rendered
        <>
          <div className="clGrid">
            {(filteredLibraryExercises as any[]).slice(0, visibleCount).map(Card)}
          </div>
          {(filteredLibraryExercises as any[]).length > visibleCount && (
            <div ref={sentinelRef} className="clSentinel">
              Loading more…
            </div>
          )}
        </>
      )}

      {/* ===== technical-cue slide-over ===== */}
      <AnimatePresence>
        {cueEx && (
          <motion.div
            className="clSlideScrim"
            onClick={() => setCueEx(null)}
            {...fade}
            transition={{ duration: 0.16 }}
          >
            {(() => {
              const e = cueEx;
              const col = catCol(e.category);
              const sections = parseExerciseCueSections(e.notes || "");
              const thumb = videoThumbnail(e.videoUrl || "");
              return (
                <motion.div
                  className="clSlide"
                  onClick={(ev) => ev.stopPropagation()}
                  initial={reduce ? { opacity: 0 } : { x: "100%" }}
                  animate={reduce ? { opacity: 1 } : { x: 0 }}
                  exit={reduce ? { opacity: 0 } : { x: "100%" }}
                  transition={{ duration: 0.26, ease: EASE }}
                >
                  <div
                    className="clSlideHero"
                    style={{
                      background: `linear-gradient(135deg, ${col.bg}, ${col.fg}22)`,
                    }}
                  >
                    {thumb && (
                      <img className="clSlideHeroImg" src={thumb} alt="" />
                    )}
                    <button
                      type="button"
                      className="clSlideClose"
                      onClick={() => setCueEx(null)}
                    >
                      <X size={17} />
                    </button>
                    <span
                      className="clSlideTag"
                      style={{ color: col.fg, borderColor: col.bd }}
                    >
                      {e.category || "Uncategorized"}
                    </span>
                    {e.videoUrl && (
                      <a
                        className="clWatch"
                        href={e.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Play size={14} fill="currentColor" /> Watch video
                      </a>
                    )}
                  </div>
                  <div className="clSlideBody">
                    <h2>{e.exerciseName || "Exercise"}</h2>
                    {metaOf(e) && <div className="clSlideMeta">{metaOf(e)}</div>}
                    {e.longVideoUrl && (
                      <a
                        className="clInDepthLink"
                        href={e.longVideoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Play size={13} fill="currentColor" /> In-depth video
                      </a>
                    )}

                    {sections.length === 0 ? (
                      <div className="clCueEmpty">
                        <p>No coaching cues yet.</p>
                        <button
                          type="button"
                          className="clAddCuesBtn"
                          onClick={() => {
                            openEditExerciseForm(e);
                            setCueEx(null);
                          }}
                        >
                          Add cues
                        </button>
                      </div>
                    ) : (
                      <div className="clCueSections">
                        {sections.map((sec, i) => (
                          <div key={i}>
                            <div className="clCueTitle">{sec.title}</div>
                            <div className="clCueLines">
                              {sec.lines.map((ln, j) => (
                                <div className="clCueLine" key={j}>
                                  <span className="clCueDot" />
                                  <span>{ln}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="clSlideFoot">
                      <button
                        type="button"
                        className="clEditExerciseBtn"
                        onClick={() => {
                          openEditExerciseForm(e);
                          setCueEx(null);
                        }}
                      >
                        <Pencil size={15} /> Edit exercise
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
