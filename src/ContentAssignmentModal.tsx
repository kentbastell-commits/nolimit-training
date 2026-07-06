// Extracted from App.tsx (monolith split) — JSX verbatim; props threaded.
import "./ContentAssignmentModal.css";
/* eslint-disable @typescript-eslint/no-explicit-any */

export default function ContentAssignmentModal({
  t,
  activeAssignmentIsTest,
  activeContentAssignment,
  activeFormTemplate,
  activeTestTemplate,
  contentAssignmentAnswers,
  contentAssignmentComment,
  getAssignmentDisplayName,
  getTestAnswerKey,
  getTestInputMode,
  isTwoKilometerTest,
  localizeText,
  setActiveContentAssignment,
  setContentAssignmentAnswers,
  setContentAssignmentComment,
  submitActiveContentAssignment,
  submittingContentAssignment,
}: { [key: string]: any }) {
  return (
    <>
          <div className="workout-modal-overlay">
            <div className="clientFormModal contentAssignmentModal">
              <div className="modal-header">
                <div>
                  <h2>
                    {activeAssignmentIsTest
                      ? localizeText(
                          activeTestTemplate?.name ||
                            activeContentAssignment.templateName ||
                            getAssignmentDisplayName(activeContentAssignment),
                          activeTestTemplate?.nameCn
                        )
                      : localizeText(
                          activeFormTemplate?.name ||
                            activeContentAssignment.templateName ||
                            getAssignmentDisplayName(activeContentAssignment),
                          activeFormTemplate?.nameCn
                        )}
                  </h2>
                  <p>
                    {activeAssignmentIsTest
                      ? localizeText(
                          activeTestTemplate?.description || "Record your test results.",
                          activeTestTemplate?.descriptionCn
                        )
                      : localizeText(
                          activeFormTemplate?.description ||
                            "Answer the assigned questionnaire.",
                          activeFormTemplate?.descriptionCn
                        )}
                  </p>
                </div>

                <button
                  className="drawerClose"
                  onClick={() => {
                    setActiveContentAssignment(null);
                    setContentAssignmentComment("");
                  }}
                >
                  x
                </button>
              </div>

              <div className="contentAssignmentFields">
                {activeAssignmentIsTest
                  ? (activeTestTemplate?.items || []).map((item: any) => {
                      const testMode = getTestInputMode(item);
                      const updateTestAnswer = (key: string, value: string) =>
                        setContentAssignmentAnswers((current: any) => ({
                          ...current,
                          [key]: value,
                        }));

                      return (
                        <div className="testResultField" key={item.testItemId}>
                          <div className="testResultHeader">
                            <span>
                              {localizeText(item.testName, item.testNameCn)}
                              {item.unit ? ` (${item.unit})` : ""}
                            </span>
                            {item.instructions || item.instructionsCn ? (
                              <small>
                                {localizeText(
                                  item.instructions || "",
                                  item.instructionsCn
                                )}
                              </small>
                            ) : null}
                          </div>

                          {testMode === "weightReps" ? (
                            <div className="structuredTestInputs">
                              <label>
                                <span>Weight</span>
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  value={
                                    contentAssignmentAnswers[
                                      getTestAnswerKey(item, "weight")
                                    ] || ""
                                  }
                                  onChange={(event) =>
                                    updateTestAnswer(
                                      getTestAnswerKey(item, "weight"),
                                      event.target.value
                                    )
                                  }
                                  placeholder={item.inputUnit || item.unit || "kg"}
                                />
                              </label>
                              <label>
                                <span>Reps</span>
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  value={
                                    contentAssignmentAnswers[
                                      getTestAnswerKey(item, "reps")
                                    ] || ""
                                  }
                                  onChange={(event) =>
                                    updateTestAnswer(
                                      getTestAnswerKey(item, "reps"),
                                      event.target.value
                                    )
                                  }
                                  placeholder="reps"
                                />
                              </label>
                            </div>
                          ) : testMode === "distanceTime" ? (
                            <div className="structuredTestInputs threeFields">
                              <label>
                                <span>Distance</span>
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  value={
                                    contentAssignmentAnswers[
                                      getTestAnswerKey(item, "distance")
                                    ] || ""
                                  }
                                  onChange={(event) =>
                                    updateTestAnswer(
                                      getTestAnswerKey(item, "distance"),
                                      event.target.value
                                    )
                                  }
                                  placeholder={isTwoKilometerTest(item) ? "2000 m" : "m"}
                                />
                              </label>
                              <label>
                                <span>Minutes</span>
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  value={
                                    contentAssignmentAnswers[
                                      getTestAnswerKey(item, "minutes")
                                    ] || ""
                                  }
                                  onChange={(event) =>
                                    updateTestAnswer(
                                      getTestAnswerKey(item, "minutes"),
                                      event.target.value
                                    )
                                  }
                                  placeholder="min"
                                />
                              </label>
                              <label>
                                <span>Seconds</span>
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  value={
                                    contentAssignmentAnswers[
                                      getTestAnswerKey(item, "seconds")
                                    ] || ""
                                  }
                                  onChange={(event) =>
                                    updateTestAnswer(
                                      getTestAnswerKey(item, "seconds"),
                                      event.target.value
                                    )
                                  }
                                  placeholder="sec"
                                />
                              </label>
                            </div>
                          ) : (
                            <label>
                              <span>{t("testResult")}</span>
                              <input
                                type="number"
                                inputMode="decimal"
                                value={contentAssignmentAnswers[item.testItemId] || ""}
                                onChange={(event) =>
                                  updateTestAnswer(item.testItemId, event.target.value)
                                }
                                placeholder={item.unit || "Result"}
                              />
                            </label>
                          )}

                          <label className="testResultNotesField">
                            <span>Notes</span>
                            <input
                              value={
                                contentAssignmentAnswers[
                                  `${item.testItemId}__notes`
                                ] || ""
                              }
                              onChange={(event) =>
                                updateTestAnswer(
                                  `${item.testItemId}__notes`,
                                  event.target.value
                                )
                              }
                              placeholder="Optional notes"
                            />
                          </label>
                        </div>
                      );
                    })
                  : (activeFormTemplate?.questions || []).map((question: any) => (
                      <label key={question.questionId}>
                        <span>
                          {localizeText(question.label, question.labelCn)}
                          {question.required ? " *" : ""}
                        </span>
                        {question.helpText || question.helpTextCn ? (
                          <small>
                            {localizeText(question.helpText || "", question.helpTextCn)}
                          </small>
                        ) : null}
                        {question.questionType.toLowerCase().includes("scale") ? (
                          <select
                            value={contentAssignmentAnswers[question.questionId] || ""}
                            onChange={(event) =>
                              setContentAssignmentAnswers((current: any) => ({
                                ...current,
                                [question.questionId]: event.target.value,
                              }))
                            }
                          >
                            <option value="">Select</option>
                            {[1, 2, 3, 4, 5].map((value) => (
                              <option key={value} value={value}>
                                {value}
                              </option>
                            ))}
                          </select>
                        ) : question.questionType.toLowerCase().includes("long") ? (
                          <textarea
                            value={contentAssignmentAnswers[question.questionId] || ""}
                            onChange={(event) =>
                              setContentAssignmentAnswers((current: any) => ({
                                ...current,
                                [question.questionId]: event.target.value,
                              }))
                            }
                            placeholder="Answer"
                          />
                        ) : (
                          <input
                            value={contentAssignmentAnswers[question.questionId] || ""}
                            onChange={(event) =>
                              setContentAssignmentAnswers((current: any) => ({
                                ...current,
                                [question.questionId]: event.target.value,
                              }))
                            }
                            placeholder="Answer"
                          />
                        )}
                      </label>
                    ))}

                <label className="submissionCommentField">
                  <span>{t("clientComment")}</span>
                  <textarea
                    value={contentAssignmentComment}
                    onChange={(event) =>
                      setContentAssignmentComment(event.target.value)
                    }
                    placeholder={t("clientCommentPlaceholder")}
                  />
                </label>
              </div>

              <div className="modalActions">
                <button
                  className="outlineButton"
                  onClick={() => {
                    setActiveContentAssignment(null);
                    setContentAssignmentComment("");
                  }}
                >
                  Cancel
                </button>
                <button
                  className="goldButton"
                  onClick={submitActiveContentAssignment}
                  disabled={submittingContentAssignment}
                >
                  {submittingContentAssignment ? "Submitting..." : "Submit"}
                </button>
              </div>
            </div>
          </div>
    </>
  );
}
