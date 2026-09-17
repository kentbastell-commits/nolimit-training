// Extracted from App.tsx (monolith split) — JSX verbatim; props threaded.
import "./ContentAssignmentModal.css";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Suspense, lazy, useState } from "react";
import { displayAnswer } from "./contentAnswers";
import { localizedOptions } from "./localizedOptions";

const JumpLabModal = lazy(() => import("./JumpLabModal"));

// Map Jump Lab metrics onto a test's items by name/unit. Only simple
// single-value items are filled; anything unmatched is left for manual entry.
function matchJumpValue(item: any, r: any): string | null {
  const name = String(item.testName || "").toLowerCase();
  const unit = String(item.unit || "").toLowerCase();
  if (/rsi/.test(name)) return r.rsiValue > 0 ? String(r.rsiValue) : null;
  if (/contact|触地/.test(name)) return r.contactMs > 0 ? String(r.contactMs) : null;
  if (/flight|腾空/.test(name)) return r.flightMs > 0 ? String(r.flightMs) : null;
  if (/power|功率/.test(name) || unit === "w")
    return r.powerW > 0 ? String(r.powerW) : null;
  if (/height|jump|cmj|纵跳|跳/.test(name) || unit === "cm")
    return r.heightCm > 0 ? String(r.heightCm) : null;
  return null;
}

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
  contentAssignmentReview = false,
  savedResponses = [],
  draftStatus = "",
}: { [key: string]: any }) {
  // Jump Lab analyzer for jump-style tests: fills item answers from video.
  const [jumpAnalyzerOpen, setJumpAnalyzerOpen] = useState(false);
  const setQuestionAnswer = (id: string, value: string) =>
    setContentAssignmentAnswers((current: any) => ({ ...current, [id]: value }));

  const applyJumpResult = (r: any) => {
    const filled: Record<string, string> = {};
    for (const item of activeTestTemplate?.items || []) {
      const value = matchJumpValue(item, r);
      if (value !== null) filled[item.testItemId] = value;
    }
    if (Object.keys(filled).length) {
      setContentAssignmentAnswers((current: any) => ({ ...current, ...filled }));
    }
    if (r.clipUrl) {
      setContentAssignmentComment((current: string) =>
        current ? `${current}\nVideo: ${r.clipUrl}` : `Video: ${r.clipUrl}`
      );
    }
  };

  return (
    <>
          <div className="workout-modal-overlay">
            <div className="clientFormModal contentAssignmentModal" role="dialog" aria-modal="true" aria-labelledby="assignment-title">
              <div className="modal-header">
                <div>
                  <h2 id="assignment-title">
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
                          activeTestTemplate?.description || localizeText("Record your test results.", "请记录测试结果。"),
                          activeTestTemplate?.descriptionCn
                        )
                      : localizeText(
                          activeFormTemplate?.description ||
                            localizeText("Answer the assigned questionnaire.", "请填写已分配的问卷。"),
                          activeFormTemplate?.descriptionCn
                        )}
                  </p>
                </div>

                <button
                  className="drawerClose"
                  aria-label={localizeText("Close dialog", "关闭窗口")}
                  disabled={submittingContentAssignment}
                  onClick={() => {
                    setActiveContentAssignment(null);
                    setContentAssignmentComment("");
                  }}
                >
                  x
                </button>
              </div>

              {contentAssignmentReview ? (
                <div className="contentAssignmentFields">
                  <p role="status">{localizeText("Completed · Saved answers", "已完成 · 已保存的回答")}</p>
                  {savedResponses.map((response: any) => {
                    const question = activeFormTemplate?.questions?.find((q: any) => q.questionId === response.itemId);
                    const item = activeTestTemplate?.items?.find((i: any) => i.testItemId === response.itemId);
                    const title = response.itemId === "__client_comment" ? t("clientComment")
                      : question ? localizeText(question.label, question.labelCn)
                      : item ? localizeText(item.testName, item.testNameCn) : response.label;
                    const choices = question ? localizedOptions(question.options, question.optionsCn, localizeText("en", "zh")) : [];
                    let answer = response.answer || "";
                    try { const parsed = JSON.parse(answer); if (Array.isArray(parsed)) answer = parsed.map(v => choices.find(o => o.matches(v))?.label || v).join(", "); } catch { answer = choices.find(o => o.matches(answer))?.label || answer; }
                    return <div className="assignmentSavedAnswer" key={response.recordId}>
                      <strong>{title}</strong><p>{displayAnswer(answer) || localizeText("No answer", "未填写")}{response.unit ? ` (${response.unit})` : ""}</p>
                      {response.notes ? <small>{response.notes}</small> : null}
                    </div>;
                  })}
                </div>
              ) : <div className="contentAssignmentFields">
                {draftStatus ? <p className="assignmentDraftNotice" role="status">{draftStatus === "memory"
                  ? localizeText("This device could not store your draft. Keep this page open until you submit.", "设备暂时无法保存草稿，提交前请勿关闭此页面。")
                  : draftStatus === "restored" ? localizeText("Draft restored. Changes are saved on this device.", "已恢复草稿，修改会保存在此设备。")
                  : localizeText("Draft saved on this device. You can close and return later.", "草稿已保存在此设备，可关闭后继续填写。")}</p> : null}
                {activeAssignmentIsTest ? (
                  <button
                    type="button"
                    className="outlineButton jlbMeasureButton"
                    onClick={() => setJumpAnalyzerOpen(true)}
                  >
                    📹 {t("jlbMeasure")}
                  </button>
                ) : null}
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
                                <span>{localizeText("Weight", "重量")}</span>
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
                                <span>{localizeText("Reps", "次数")}</span>
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
                                  placeholder={localizeText("reps", "次")}
                                />
                              </label>
                            </div>
                          ) : testMode === "distanceTime" ? (
                            <div className="structuredTestInputs threeFields">
                              <label>
                                <span>{localizeText("Distance", "距离")}</span>
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
                                <span>{localizeText("Minutes", "分钟")}</span>
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
                                <span>{localizeText("Seconds", "秒")}</span>
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
                                placeholder={item.unit || localizeText("Result", "结果")}
                              />
                            </label>
                          )}

                          <label className="testResultNotesField">
                            <span>{localizeText("Notes", "备注")}</span>
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
                              placeholder={localizeText("Optional notes", "补充说明（选填）")}
                            />
                          </label>
                        </div>
                      );
                    })
                  : (activeFormTemplate?.questions || []).map((question: any) => (
                      <div className="assignmentQuestion" key={question.questionId}>
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
                            aria-label={localizeText(question.label, question.labelCn)}
                            value={contentAssignmentAnswers[question.questionId] || ""}
                            onChange={(event) => setQuestionAnswer(question.questionId, event.target.value)}
                          >
                            <option value="">{localizeText("Select", "请选择")}</option>
                            {[1, 2, 3, 4, 5].map((value) => (
                              <option key={value} value={value}>
                                {value}
                              </option>
                            ))}
                          </select>
                        ) : question.questionType.toLowerCase().includes("long") ? (
                          <textarea
                            aria-label={localizeText(question.label, question.labelCn)}
                            value={contentAssignmentAnswers[question.questionId] || ""}
                            onChange={(event) => setQuestionAnswer(question.questionId, event.target.value)}
                            placeholder={localizeText("Answer", "请输入回答")}
                          />
                        ) : localizedOptions(question.options, question.optionsCn, "en").length > 0 && /multi|checkbox/i.test(question.questionType) ? (
                          <div className="assignmentChoices" role="group" aria-label={localizeText(question.label, question.labelCn)}>
                            {localizedOptions(question.options, question.optionsCn, localizeText("en", "zh")).map((option) => {
                              let selected: string[] = [];
                              try { const parsed = JSON.parse(contentAssignmentAnswers[question.questionId] || "[]"); if (Array.isArray(parsed)) selected = parsed; } catch { /* no prior choices */ }
                              const checked = selected.some(option.matches);
                              return <label className="assignmentChoice" key={option.value}>
                                <input type="checkbox" aria-label={option.label} checked={checked}
                                  onChange={() => setContentAssignmentAnswers((current: any) => ({ ...current,
                                    [question.questionId]: JSON.stringify(checked ? selected.filter((v) => !option.matches(v)) : [...selected, option.value]),
                                  }))} /><span>{option.label}</span>
                              </label>;
                            })}
                          </div>
                        ) : localizedOptions(question.options, question.optionsCn, "en").length > 0 ? (
                          <select
                            aria-label={localizeText(question.label, question.labelCn)}
                            value={contentAssignmentAnswers[question.questionId] || ""}
                            onChange={(event) => setQuestionAnswer(question.questionId, event.target.value)}
                          >
                            <option value="">{localizeText("Select", "请选择")}</option>
                            {localizedOptions(question.options, question.optionsCn, localizeText("en", "zh")).map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            aria-label={localizeText(question.label, question.labelCn)}
                            value={contentAssignmentAnswers[question.questionId] || ""}
                            onChange={(event) => setQuestionAnswer(question.questionId, event.target.value)}
                            placeholder={localizeText("Answer", "请输入回答")}
                          />
                        )}
                      </div>
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
              </div>}

              <div className="modalActions">
                <button
                  className="outlineButton"
                  disabled={submittingContentAssignment}
                  onClick={() => {
                    setActiveContentAssignment(null);
                    setContentAssignmentComment("");
                  }}
                >
                  {contentAssignmentReview ? localizeText("Close", "关闭") : draftStatus === "memory" ? localizeText("Close", "关闭") : localizeText("Save & close", "保存并关闭")}
                </button>
                {!contentAssignmentReview && <button
                  className="goldButton"
                  onClick={submitActiveContentAssignment}
                  disabled={submittingContentAssignment}
                >
                  {submittingContentAssignment ? localizeText("Submitting...", "正在提交…") : localizeText("Submit", "提交")}
                </button>}
              </div>
            </div>
          </div>

      {jumpAnalyzerOpen && (
        <Suspense fallback={null}>
          <JumpLabModal
            onClose={() => setJumpAnalyzerOpen(false)}
            onResult={applyJumpResult}
            t={t}
          />
        </Suspense>
      )}
    </>
  );
}
