// Extracted from App.tsx (monolith split) — JSX verbatim; props threaded.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { X } from "lucide-react";

export default function ClientOverview({
  t,
  coachNotesDraft,
  editingMetrics,
  formatPace,
  getCoachDisplayName,
  getMasKmh,
  hrMaxMetric,
  i18n,
  isClientPortal,
  latestMasMetric,
  metricsDraft,
  openMetricsEditor,
  overviewDetailsOpen,
  paceZh,
  parseBpm,
  parseOverride,
  renderPerformanceMetrics,
  renderPersonalRecords,
  restingHrMetric,
  saveCoachNotes,
  saveMetricsOverrides,
  savingCoachNotes,
  savingMetrics,
  selectedClient,
  selectedClientLatestOrder,
  setCoachNotesDraft,
  setEditingMetrics,
  setMetricsDraft,
  setOverviewDetailsOpen,
  setWeightUnitPref,
  updateClientLanguagePreference,
  weightUnit,
}: { [key: string]: any }) {
  return (
    <>
                {isClientPortal ? (
                  <div className="portalProfile">
                    <header className="portalProfileHead">
                      <span className="portalProfileEyebrow">
                        {paceZh ? "账户" : "Account"}
                      </span>
                      <h1 className="portalProfileTitle">{t("profile")}</h1>
                    </header>

                    <div className="portalProfileHero">
                      <div className="portalProfileAvatar" aria-hidden="true">
                        {selectedClient.initials}
                      </div>
                      <div>
                        <strong>{selectedClient.name || "--"}</strong>
                        <span>
                          {selectedClient.program ||
                            selectedClient.package ||
                            selectedClient.status ||
                            "--"}
                        </span>
                      </div>
                    </div>

                    <section className="portalProfileCard">
                      <span className="portalProfileCardEyebrow">
                        {paceZh ? "设置" : "Settings"}
                      </span>
                      <div className="portalSettingRow">
                        <span className="portalSettingLabel">
                          {t("languagePreference")}
                        </span>
                        <select
                          className="portalSettingSelect"
                          value={
                            /中文|chinese|mandarin/i.test(
                              selectedClient.languagePreference || ""
                            )
                              ? "中文"
                              : "English"
                          }
                          onChange={(event) =>
                            updateClientLanguagePreference(event.target.value)
                          }
                        >
                          <option value="English">{t("english")}</option>
                          <option value="中文">{t("mandarin")}</option>
                        </select>
                      </div>
                      <div className="portalSettingRow">
                        <span className="portalSettingLabel">
                          {paceZh ? "重量单位" : "Weight units"}
                        </span>
                        <div
                          className="portalUnitToggle"
                          role="group"
                          aria-label={paceZh ? "重量单位" : "Weight units"}
                        >
                          <button
                            type="button"
                            className={weightUnit === "kg" ? "active" : ""}
                            onClick={() => setWeightUnitPref("kg")}
                          >
                            kg
                          </button>
                          <button
                            type="button"
                            className={weightUnit === "lb" ? "active" : ""}
                            onClick={() => setWeightUnitPref("lb")}
                          >
                            lb
                          </button>
                        </div>
                      </div>
                    </section>

                    <section className="portalProfileCard">
                      <span className="portalProfileCardEyebrow">
                        {paceZh ? "我的教练" : "My Coaching"}
                      </span>
                      <div className="portalSettingRow">
                        <span className="portalSettingLabel">{t("coach")}</span>
                        <strong>
                          {getCoachDisplayName(
                            selectedClient.coach ||
                              selectedClient.primaryCoach ||
                              "--"
                          )}
                        </strong>
                      </div>
                      <div className="portalSettingRow">
                        <span className="portalSettingLabel">
                          {paceZh ? "套餐" : "Plan"}
                        </span>
                        <strong>
                          {selectedClient.package ||
                            selectedClient.status ||
                            "--"}
                        </strong>
                      </div>
                      <div className="portalSettingRow">
                        <span className="portalSettingLabel">
                          {paceZh ? "有效期至" : "Access until"}
                        </span>
                        <strong>{selectedClient.accessEndDate || "--"}</strong>
                      </div>
                    </section>

                    <section className="portalProfileCard">
                      <span className="portalProfileCardEyebrow">
                        {paceZh ? "我的资料" : "My Details"}
                      </span>
                      <div className="portalSettingRow">
                        <span className="portalSettingLabel">{t("name")}</span>
                        <strong>{selectedClient.name || "--"}</strong>
                      </div>
                      <div className="portalSettingRow">
                        <span className="portalSettingLabel">{t("email")}</span>
                        <strong>{selectedClient.email || "--"}</strong>
                      </div>
                      <div className="portalSettingRow">
                        <span className="portalSettingLabel">
                          {t("phoneWechat")}
                        </span>
                        <strong>{selectedClient.phone || "--"}</strong>
                      </div>
                    </section>

                    <p className="portalProfileHelp">
                      {paceZh
                        ? "关于训练有疑问？请联系您的教练。"
                        : "Questions about your training? Message your coach."}
                    </p>
                  </div>
                ) : (
                <div className="overviewGrid">
                  <div className="profileCard profileMetricsCard">
                    <div className="profileMetricsHeader">
                      <h3>{t("performanceMetrics")}</h3>
                      {/online coaching|in[-\s]?person/i.test(
                        selectedClient.clientType || ""
                      ) && (
                        <button
                          className="outlineButton compactBuilderButton"
                          onClick={openMetricsEditor}
                        >
                          Edit
                        </button>
                      )}
                    </div>
                    {renderPerformanceMetrics(true)}
                  </div>

                  <div className="profileCard prCard">
                    <div className="profileMetricsHeader">
                      <h3>{paceZh ? "个人记录" : "Personal Records"}</h3>
                    </div>
                    {renderPersonalRecords()}
                  </div>

                  <div className="profileCard">
                    <div className="profileMetricsHeader">
                      <h3>{t("clientInformation")}</h3>
                      <button
                        className="outlineButton compactBuilderButton"
                        onClick={() => setOverviewDetailsOpen((open: any) => !open)}
                      >
                        {overviewDetailsOpen
                          ? paceZh
                            ? "收起"
                            : "Hide details"
                          : paceZh
                          ? "展开"
                          : "Show details"}
                      </button>
                    </div>
                    <div className="clientInfoRows">
                      <div>
                        <span>{t("name")}</span>
                        <strong>{selectedClient.name}</strong>
                      </div>
                      <div>
                        <span>{t("languagePreference")}</span>
                        <select
                          value={
                            /中文|chinese|mandarin/i.test(
                              selectedClient.languagePreference || ""
                            )
                              ? "中文"
                              : "English"
                          }
                          onChange={(event) =>
                            updateClientLanguagePreference(event.target.value)
                          }
                        >
                          <option value="English">{t("english")}</option>
                          <option value="中文">{t("mandarin")}</option>
                        </select>
                      </div>
                      <div>
                        <span>
                          {i18n.language === "zh" ? "重量单位" : "Weight units"}
                        </span>
                        <select
                          value={weightUnit}
                          onChange={(event) =>
                            setWeightUnitPref(
                              event.target.value === "lb" ? "lb" : "kg"
                            )
                          }
                        >
                          <option value="kg">kg</option>
                          <option value="lb">lb</option>
                        </select>
                      </div>
                    </div>

                    {overviewDetailsOpen && (
                      <div className="clientInfoRows">
                        <div>
                          <span>{t("email")}</span>
                          <strong>{selectedClient.email || "--"}</strong>
                        </div>
                        <div>
                          <span>{t("phoneWechat")}</span>
                          <strong>{selectedClient.phone || "--"}</strong>
                        </div>
                        <div>
                          <span>{t("coach")}</span>
                          <strong>
                            {getCoachDisplayName(
                              selectedClient.coach ||
                                selectedClient.primaryCoach ||
                                "--"
                            )}
                          </strong>
                        </div>
                        <div>
                          <span>Client Type</span>
                          <strong>{selectedClient.clientType || "--"}</strong>
                        </div>
                        <div>
                          <span>{t("package")}</span>
                          <strong>
                            {selectedClient.package || selectedClient.status || "--"}
                          </strong>
                        </div>
                        <div>
                          <span>Subscription</span>
                          <strong>{selectedClient.subscriptionStatus || "--"}</strong>
                        </div>
                        <div>
                          <span>Intake</span>
                          <strong>{selectedClient.intakeStatus || "--"}</strong>
                        </div>
                        <div>
                          <span>Payment</span>
                          <strong>{selectedClient.paymentStatus || "--"}</strong>
                        </div>
                        <div>
                          <span>Latest Order</span>
                          <strong>
                            {selectedClientLatestOrder
                              ? `${
                                  selectedClientLatestOrder.productName || "Order"
                                } - ${
                                  selectedClientLatestOrder.paymentStatus || "--"
                                }`
                              : "--"}
                          </strong>
                        </div>
                        <div>
                          <span>Source</span>
                          <strong>{selectedClient.source || "--"}</strong>
                        </div>
                        <div>
                          <span>{t("startDate")}</span>
                          <strong>{selectedClient.startDate || "--"}</strong>
                        </div>
                        <div>
                          <span>Access Window</span>
                          <strong>
                            {selectedClient.accessStartDate || "--"} to{" "}
                            {selectedClient.accessEndDate || "--"}
                          </strong>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="profileCard">
                    <div className="profileMetricsHeader">
                      <h3>Coach Notes</h3>
                      <button
                        className="outlineButton compactBuilderButton"
                        onClick={saveCoachNotes}
                        disabled={
                          savingCoachNotes ||
                          coachNotesDraft === (selectedClient.notes || "")
                        }
                      >
                        {savingCoachNotes ? "Saving…" : "Save"}
                      </button>
                    </div>
                    <textarea
                      className="coachNotesTextarea"
                      placeholder="Add private coach notes here..."
                      value={coachNotesDraft}
                      onChange={(event) => setCoachNotesDraft(event.target.value)}
                    />
                  </div>
                </div>
                )}

              {editingMetrics && selectedClient && (
                <div
                  className="metricsEditorOverlay"
                  onClick={() => setEditingMetrics(false)}
                >
                  <div
                    className="metricsEditorModal"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="metricsEditorHeader">
                      <div>
                        <span className="eyebrow">{selectedClient.name}</span>
                        <h3>Edit Performance Metrics</h3>
                      </div>
                      <button
                        className="iconButton"
                        aria-label="Close"
                        onClick={() => setEditingMetrics(false)}
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <p className="metricsEditorHint">
                      Leave a field blank to use the latest test value. MAS is in
                      km/h; zones are %MAS.
                    </p>

                    <div className="metricsEditorGrid">
                      <label>
                        <span>MAS (km/h)</span>
                        <input
                          inputMode="decimal"
                          value={metricsDraft.mas}
                          placeholder={
                            Number.isFinite(getMasKmh(latestMasMetric))
                              ? `${getMasKmh(latestMasMetric).toFixed(1)} (test)`
                              : "e.g. 16.5"
                          }
                          onChange={(e) =>
                            setMetricsDraft((d: any) => ({ ...d, mas: e.target.value }))
                          }
                        />
                      </label>
                      <label>
                        <span>HR Max (bpm)</span>
                        <input
                          inputMode="numeric"
                          value={metricsDraft.hrMax}
                          placeholder={
                            Number.isFinite(parseBpm(hrMaxMetric))
                              ? `${parseBpm(hrMaxMetric)} (test)`
                              : "e.g. 190"
                          }
                          onChange={(e) =>
                            setMetricsDraft((d: any) => ({
                              ...d,
                              hrMax: e.target.value,
                            }))
                          }
                        />
                      </label>
                      <label>
                        <span>Resting HR (bpm)</span>
                        <input
                          inputMode="numeric"
                          value={metricsDraft.restingHr}
                          placeholder={
                            Number.isFinite(parseBpm(restingHrMetric))
                              ? `${parseBpm(restingHrMetric)} (test)`
                              : "e.g. 50"
                          }
                          onChange={(e) =>
                            setMetricsDraft((d: any) => ({
                              ...d,
                              restingHr: e.target.value,
                            }))
                          }
                        />
                      </label>
                    </div>

                    <span className="eyebrow metricsEditorZonesTitle">
                      Zone %MAS
                    </span>
                    <div className="metricsEditorGrid metricsEditorZones">
                      <label>
                        <span>5K %</span>
                        <input
                          inputMode="numeric"
                          value={metricsDraft.z5k}
                          placeholder="95"
                          onChange={(e) =>
                            setMetricsDraft((d: any) => ({ ...d, z5k: e.target.value }))
                          }
                        />
                      </label>
                      <label>
                        <span>10K %</span>
                        <input
                          inputMode="numeric"
                          value={metricsDraft.z10k}
                          placeholder="91"
                          onChange={(e) =>
                            setMetricsDraft((d: any) => ({
                              ...d,
                              z10k: e.target.value,
                            }))
                          }
                        />
                      </label>
                      <label>
                        <span>Threshold %</span>
                        <input
                          inputMode="numeric"
                          value={metricsDraft.zThreshold}
                          placeholder="85"
                          onChange={(e) =>
                            setMetricsDraft((d: any) => ({
                              ...d,
                              zThreshold: e.target.value,
                            }))
                          }
                        />
                      </label>
                      <label>
                        <span>Easy %</span>
                        <input
                          inputMode="numeric"
                          value={metricsDraft.zEasy}
                          placeholder="70"
                          onChange={(e) =>
                            setMetricsDraft((d: any) => ({
                              ...d,
                              zEasy: e.target.value,
                            }))
                          }
                        />
                      </label>
                    </div>

                    {(() => {
                      const dMas =
                        parseOverride(metricsDraft.mas) ||
                        getMasKmh(latestMasMetric);
                      const dHrMax =
                        parseOverride(metricsDraft.hrMax) ||
                        parseBpm(hrMaxMetric);
                      const dRhr =
                        parseOverride(metricsDraft.restingHr) ||
                        parseBpm(restingHrMetric);
                      const dHasHr =
                        Number.isFinite(dHrMax) &&
                        Number.isFinite(dRhr) &&
                        dHrMax > dRhr;
                      const dKarvonen = (p: number) =>
                        Math.round(dRhr + (dHrMax - dRhr) * (p / 100));
                      const rows = [
                        { label: "MAS", pct: 100, lo: 95, hi: 100 },
                        {
                          label: "5K",
                          pct: parseOverride(metricsDraft.z5k) || 95,
                          lo: 90,
                          hi: 95,
                        },
                        {
                          label: "10K",
                          pct: parseOverride(metricsDraft.z10k) || 91,
                          lo: 85,
                          hi: 90,
                        },
                        {
                          label: "Threshold",
                          pct: parseOverride(metricsDraft.zThreshold) || 85,
                          lo: 80,
                          hi: 85,
                        },
                        {
                          label: "Easy",
                          pct: parseOverride(metricsDraft.zEasy) || 70,
                          lo: 60,
                          hi: 70,
                        },
                      ];
                      return (
                        <div className="metricsEditorPreview">
                          <span className="eyebrow">Live preview</span>
                          <table>
                            <thead>
                              <tr>
                                <th>Zone</th>
                                <th>%MAS</th>
                                <th>Pace</th>
                                {dHasHr && <th>HR</th>}
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map((row) => (
                                <tr key={row.label}>
                                  <td>{row.label}</td>
                                  <td>{row.pct}%</td>
                                  <td>
                                    {Number.isFinite(dMas)
                                      ? formatPace(dMas * (row.pct / 100))
                                      : "--"}
                                  </td>
                                  {dHasHr && (
                                    <td>
                                      {dKarvonen(row.lo)}–{dKarvonen(row.hi)}
                                    </td>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()}

                    <div className="metricsEditorActions">
                      <button
                        className="outlineButton"
                        onClick={() => setEditingMetrics(false)}
                        disabled={savingMetrics}
                      >
                        Cancel
                      </button>
                      <button
                        className="goldButton"
                        onClick={saveMetricsOverrides}
                        disabled={savingMetrics}
                      >
                        {savingMetrics ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
    </>
  );
}
