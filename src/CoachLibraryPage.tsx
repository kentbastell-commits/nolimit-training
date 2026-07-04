// Extracted from App.tsx (monolith split) — JSX verbatim; props threaded.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Fragment } from "react";
import { ClipboardList, Play, Trash2 } from "lucide-react";
import { categorySlug, videoThumbnail } from "./appCore";

export default function CoachLibraryPage({
  deleteExercise,
  filteredLibraryExercises,
  groupedLibraryExercises,
  libraryCategoryFilter,
  libraryCategoryOptions,
  libraryLoading,
  librarySearch,
  loadExerciseLibrary,
  openEditExerciseForm,
  openNewExerciseForm,
  setLibraryCategoryFilter,
  setLibrarySearch,
  setTechnicalCueExercise,
}: { [key: string]: any }) {
  return (
    <>
              <>
                <section className="searchRow librarySearchRow">
                  <input
                    placeholder="Search exercise..."
                    value={librarySearch}
                    onChange={(e) => setLibrarySearch(e.target.value)}
                  />
                  <select
                    className="libraryCategorySelect"
                    value={libraryCategoryFilter}
                    onChange={(e) => setLibraryCategoryFilter(e.target.value)}
                    aria-label="Filter by category"
                  >
                    <option value="All">All categories</option>
                    {libraryCategoryOptions.map((category: any) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  <button className="goldButton" onClick={openNewExerciseForm}>
                    + Add Exercise
                  </button>
                  <button
                    className="outlineButton"
                    onClick={() => void loadExerciseLibrary(true)}
                  >
                    Reload
                  </button>
                </section>

                <section className="tableCard exerciseLibraryTable">
                  <div
                    className="tableHeader exerciseTableHeader"
                    style={{
                      gridTemplateColumns: "minmax(220px, 2fr) minmax(120px, 1fr) 72px 110px 90px",
                    }}
                  >
                    <span>Exercise</span>
                    <span>Category</span>
                    <span>Cues</span>
                    <span>Video</span>
                    <span>Actions</span>
                  </div>

                  {libraryLoading && filteredLibraryExercises.length === 0 && (
                    <p>Loading exercises...</p>
                  )}

                  {!libraryLoading && filteredLibraryExercises.length === 0 && (
                    <p style={{ padding: "18px 22px" }}>No exercises found.</p>
                  )}

                  {groupedLibraryExercises.map(([category, items]: [any, any]) => (
                    <Fragment key={category}>
                      <div className="libraryCategoryGroupHeader">
                        <span
                          className={`exerciseCategoryCell ${categorySlug(
                            category === "Uncategorized" ? "" : category
                          )}`}
                        >
                          {category}
                        </span>
                        <em>{items.length}</em>
                      </div>
                      {items.map((exercise: any) => (
                      <div
                        className="clientRow exerciseTableRow"
                        key={exercise.recordId || exercise.exerciseId}
                        style={{
                          gridTemplateColumns: "minmax(220px, 2fr) minmax(120px, 1fr) 72px 110px 90px",
                        }}
                      >
                        <div className="clientName">
                          {(() => {
                            const thumb = videoThumbnail(exercise.videoUrl || "");
                            return thumb ? (
                              <div className="clientAvatar exerciseThumbAvatar">
                                <img src={thumb} alt="" loading="lazy" />
                              </div>
                            ) : (
                              <div className="clientAvatar">
                                {exercise.exerciseName
                                  ? exercise.exerciseName.slice(0, 2).toUpperCase()
                                  : "EX"}
                              </div>
                            );
                          })()}
                          <div>
                            <strong>
                              {exercise.exerciseName || "Unnamed Exercise"}
                            </strong>
                          </div>
                        </div>

                        <span
                          className={`exerciseCategoryCell ${categorySlug(
                            exercise.category
                          )}`}
                        >
                          {exercise.category || "--"}
                        </span>

                        <span className="iconCell">
                          <button
                            className="cueIconButton"
                            onClick={() => setTechnicalCueExercise(exercise)}
                            title="View technical cues"
                            aria-label={`View technical cues for ${
                              exercise.exerciseName || "exercise"
                            }`}
                          >
                            <ClipboardList size={18} aria-hidden="true" />
                          </button>
                        </span>

                        <span className="libraryVideoCell">
                          {exercise.videoUrl ? (
                            <a
                              className="iconActionButton libraryVideoButton"
                              href={exercise.videoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={`Open short video for ${
                                exercise.exerciseName || "exercise"
                              }`}
                              aria-label={`Open short video for ${
                                exercise.exerciseName || "exercise"
                              }`}
                            >
                              <Play size={17} fill="currentColor" aria-hidden="true" />
                            </a>
                          ) : (
                            "--"
                          )}
                          {exercise.longVideoUrl ? (
                            <a
                              className="libraryLongVideoLink"
                              href={exercise.longVideoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={`Open in-depth video for ${
                                exercise.exerciseName || "exercise"
                              }`}
                              aria-label={`Open in-depth video for ${
                                exercise.exerciseName || "exercise"
                              }`}
                            >
                              In-depth
                            </a>
                          ) : null}
                        </span>

                        <span className="rowActions">
                          <button
                            className="outlineButton"
                            onClick={() => openEditExerciseForm(exercise)}
                          >
                            Edit
                          </button>
                          <button
                            className="iconActionButton dangerIconButton"
                            onClick={() => deleteExercise(exercise)}
                            title="Delete exercise"
                            aria-label={`Delete ${exercise.exerciseName || "exercise"}`}
                          >
                            <Trash2 size={17} aria-hidden="true" />
                          </button>
                        </span>
                      </div>
                      ))}
                    </Fragment>
                  ))}
                </section>
              </>
    </>
  );
}
