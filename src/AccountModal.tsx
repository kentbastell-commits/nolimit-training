// Extracted from App.tsx (monolith split) — JSX verbatim; props threaded.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { CalendarDays } from "lucide-react";
import "./AccountModal.css";
import { labelColor } from "./appCore";

export default function AccountModal({
  relativeDue,
  accountCategoryInput,
  accountClient,
  accountClientId,
  accountDraft,
  accountProgramId,
  accountStartDate,
  accountSubscription,
  accountTagInput,
  addAccountChip,
  assignProgramFromAccount,
  clients,
  deleteSubscription,
  openAthleteCalendar,
  programs,
  removeAccountChip,
  saveAccountTagsCategories,
  saveAccountTeamPosition,
  saveSubscription,
  savingAccount,
  savingSub,
  setAccountCategoryInput,
  setAccountClientId,
  setAccountProgramId,
  setAccountStartDate,
  setAccountTagInput,
  setSubDraft,
  subDraft,
  subEffectiveStatus,
  teams,
  toggleAccountTeam,
  updateAccountTeamPositionLocal,
}: { [key: string]: any }) {
  return (
    <>
          <div className="workout-modal-overlay">
            <div className="clientFormModal accountModal">
              <div className="modal-header accountModalHeader">
                <div className="accountModalIdentity">
                  <div className="clientAvatar largeAvatar">
                    {accountClient.initials}
                  </div>
                  <div>
                    <h2>{accountClient.name}</h2>
                    <p>{accountClient.email || accountClient.phone || "—"}</p>
                  </div>
                </div>
                <div className="accountHeaderActions">
                  <button
                    className="outlineButton"
                    onClick={() => openAthleteCalendar(accountClient)}
                  >
                    <CalendarDays size={16} aria-hidden="true" /> Calendar
                  </button>
                  <button
                    className="drawerClose"
                    onClick={() => setAccountClientId("")}
                  >
                    x
                  </button>
                </div>
              </div>

              <div className="accountModalBody">
                <div className="accountSection">
                  <span className="teamPickerLabel">
                    Categories (Sports / Positions / Groups)
                  </span>
                  <div className="chipRow">
                    {accountDraft.categories.map((c: any) => {
                      const cc = labelColor(c);
                      return (
                        <span
                          className="editChip groupChip"
                          key={c}
                          style={{
                            background: cc.bg,
                            color: cc.fg,
                            borderColor: cc.bd,
                          }}
                        >
                          {c}
                          <button
                            onClick={() => removeAccountChip("categories", c)}
                            aria-label={`Remove ${c}`}
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                    {accountDraft.categories.length === 0 && (
                      <span className="mutedText">None yet</span>
                    )}
                  </div>
                  <div className="chipAddRow">
                    <input
                      list="accountCategoryOptions"
                      value={accountCategoryInput}
                      placeholder="Add a category"
                      onChange={(e) => setAccountCategoryInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addAccountChip("categories", accountCategoryInput);
                        }
                      }}
                    />
                    <datalist id="accountCategoryOptions">
                      {Array.from(
                        new Set(clients.flatMap((c: any) => c.categories || []))
                      ).map((c: any) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                    <button
                      className="outlineButton"
                      onClick={() =>
                        addAccountChip("categories", accountCategoryInput)
                      }
                    >
                      Add
                    </button>
                  </div>
                </div>

                <div className="accountSection">
                  <span className="teamPickerLabel">Tags</span>
                  <div className="chipRow">
                    {accountDraft.tags.map((t: any) => (
                      <span className="editChip" key={t}>
                        {t}
                        <button
                          onClick={() => removeAccountChip("tags", t)}
                          aria-label={`Remove ${t}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    {accountDraft.tags.length === 0 && (
                      <span className="mutedText">None yet</span>
                    )}
                  </div>
                  <div className="chipAddRow">
                    <input
                      list="accountTagOptions"
                      value={accountTagInput}
                      placeholder="Add a tag"
                      onChange={(e) => setAccountTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addAccountChip("tags", accountTagInput);
                        }
                      }}
                    />
                    <datalist id="accountTagOptions">
                      {Array.from(
                        new Set(clients.flatMap((c: any) => c.tags || []))
                      ).map((t: any) => (
                        <option key={t} value={t} />
                      ))}
                    </datalist>
                    <button
                      className="outlineButton"
                      onClick={() => addAccountChip("tags", accountTagInput)}
                    >
                      Add
                    </button>
                  </div>
                  <button
                    className="goldButton accountSaveBtn"
                    onClick={saveAccountTagsCategories}
                    disabled={savingAccount}
                  >
                    {savingAccount ? "Saving…" : "Save Tags & Categories"}
                  </button>
                </div>

                <div className="accountSection">
                  <span className="teamPickerLabel">Teams</span>
                  {teams.length === 0 ? (
                    <p className="mutedText">No teams created yet.</p>
                  ) : (
                    <div className="accountTeamList">
                      {teams.map((team: any) => {
                        const isMember =
                          team.memberIds.includes(accountClientId);
                        return (
                          <div key={team.id} className="accountTeamRow">
                            <label className="accountTeamToggle">
                              <input
                                type="checkbox"
                                checked={isMember}
                                onChange={() => void toggleAccountTeam(team)}
                              />
                              <span>{team.name}</span>
                            </label>
                            {isMember && (
                              <input
                                className="accountTeamPosition"
                                placeholder="Subgroup / position"
                                value={team.positions[accountClientId] || ""}
                                onChange={(e) =>
                                  updateAccountTeamPositionLocal(
                                    team.id,
                                    e.target.value
                                  )
                                }
                                onBlur={(e) =>
                                  void saveAccountTeamPosition(
                                    team.id,
                                    e.target.value
                                  )
                                }
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="accountSection">
                  <span className="teamPickerLabel">
                    Subscription{" "}
                    {accountSubscription && (
                      <em className="subStatusInline">
                        · {subEffectiveStatus(accountSubscription)}
                        {accountSubscription.nextBillingDate
                          ? ` · renews ${relativeDue(
                              accountSubscription.nextBillingDate
                            )}`
                          : ""}
                      </em>
                    )}
                  </span>
                  <div className="subGrid">
                    <label>
                      <span>Plan</span>
                      <select
                        value={subDraft.plan}
                        onChange={(e) =>
                          setSubDraft((d: any) => ({ ...d, plan: e.target.value }))
                        }
                      >
                        <option>Online Coaching</option>
                        <option>In-Person Coaching</option>
                        <option>Hybrid</option>
                        <option>Custom</option>
                      </select>
                    </label>
                    <label>
                      <span>Status</span>
                      <select
                        value={subDraft.status}
                        onChange={(e) =>
                          setSubDraft((d: any) => ({ ...d, status: e.target.value }))
                        }
                      >
                        <option>Active</option>
                        <option>Trial</option>
                        <option>Past Due</option>
                        <option>Paused</option>
                        <option>Cancelled</option>
                      </select>
                    </label>
                    <label>
                      <span>Price</span>
                      <input
                        inputMode="decimal"
                        value={subDraft.price}
                        onChange={(e) =>
                          setSubDraft((d: any) => ({
                            ...d,
                            price: e.target.value.replace(/[^\d.]/g, ""),
                          }))
                        }
                        placeholder="0"
                      />
                    </label>
                    <label>
                      <span>Currency</span>
                      <select
                        value={subDraft.currency}
                        onChange={(e) =>
                          setSubDraft((d: any) => ({
                            ...d,
                            currency: e.target.value,
                          }))
                        }
                      >
                        <option>CNY</option>
                        <option>USD</option>
                      </select>
                    </label>
                    <label>
                      <span>Billing Cycle</span>
                      <select
                        value={subDraft.billingCycle}
                        onChange={(e) =>
                          setSubDraft((d: any) => ({
                            ...d,
                            billingCycle: e.target.value,
                          }))
                        }
                      >
                        <option>1 Month</option>
                        <option>3 Month</option>
                        <option>6 Month</option>
                        <option>1 Year</option>
                      </select>
                    </label>
                    <label>
                      <span>Start Date</span>
                      <input
                        type="date"
                        value={subDraft.startDate}
                        onChange={(e) =>
                          setSubDraft((d: any) => ({
                            ...d,
                            startDate: e.target.value,
                          }))
                        }
                      />
                    </label>
                    <label>
                      <span>Next Billing</span>
                      <input
                        type="date"
                        value={subDraft.nextBillingDate}
                        onChange={(e) =>
                          setSubDraft((d: any) => ({
                            ...d,
                            nextBillingDate: e.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="subAutoRenew">
                      <input
                        type="checkbox"
                        checked={subDraft.autoRenew}
                        onChange={(e) =>
                          setSubDraft((d: any) => ({
                            ...d,
                            autoRenew: e.target.checked,
                          }))
                        }
                      />
                      <span>Auto-renew</span>
                    </label>
                  </div>
                  <div className="subActions">
                    <button
                      className="goldButton accountSaveBtn"
                      onClick={saveSubscription}
                      disabled={savingSub}
                    >
                      {savingSub
                        ? "Saving…"
                        : accountSubscription
                        ? "Update Subscription"
                        : "Create Subscription"}
                    </button>
                    {accountSubscription && (
                      <button
                        className="outlineButton subRemoveBtn"
                        onClick={deleteSubscription}
                        disabled={savingSub}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                <div className="accountSection">
                  <span className="teamPickerLabel">Assign a program</span>
                  <div className="teamAssignRow">
                    <select
                      value={accountProgramId}
                      onChange={(e) => setAccountProgramId(e.target.value)}
                    >
                      <option value="">Select a program…</option>
                      {programs.map((p: any) => (
                        <option key={p.programId} value={p.programId}>
                          {p.programName}
                        </option>
                      ))}
                    </select>
                    <input
                      type="date"
                      value={accountStartDate}
                      onChange={(e) => setAccountStartDate(e.target.value)}
                    />
                    <button
                      className="goldButton"
                      onClick={assignProgramFromAccount}
                      disabled={savingAccount || !accountProgramId}
                    >
                      Assign
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
    </>
  );
}
