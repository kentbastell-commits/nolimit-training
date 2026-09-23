import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Star, Plus, Trash2 } from "lucide-react";
import type { ProgramExercise } from "./appCore";
import { exercisePrescription } from "./appCore";
import type { ProgrammingBlock } from "./programmingBlockData";
import ProgrammingSheet from "./ProgrammingSheet";

export default function ProgrammingBlocks({ exercises, insert, close }: { exercises: ProgramExercise[]; insert: (exercises: ProgramExercise[]) => void; close: () => void }) {
  const { i18n } = useTranslation(); const zh = i18n.language.startsWith("zh");
  const [blocks, setBlocks] = useState<ProgrammingBlock[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [search, setSearch] = useState(""), [filter, setFilter] = useState("all"), [saving, setSaving] = useState(false), [creating, setCreating] = useState(false);
  const [name, setName] = useState(""), [nameCn, setNameCn] = useState(""), [selected, setSelected] = useState<Set<number>>(new Set());
  const [newId, setNewId] = useState(() => crypto.randomUUID());
  const [notice, setNotice] = useState("");
  async function load() {
    setLoading(true); setError("");
    try { const res = await fetch("/api/programmingBlocks"); if (!res.ok) throw new Error(); setBlocks((await res.json()).blocks); }
    catch { setError(zh ? "无法加载训练模块，请重试。" : "Could not load blocks. Try again."); } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  async function write(body: object) {
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/programmingBlocks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error(res.status === 409 ? (zh ? "模块已更改，请刷新后重试。" : "Block changed. Refresh and try again.") : "");
      const data = await res.json();
      if (data.block) setBlocks(cur => [data.block, ...cur.filter(b => b.id !== data.block.id)]);
      return true;
    } catch (e) { setError((e as Error).message || (zh ? "保存失败，已保留输入。请重试。" : "Save failed. Your input is retained. Try again.")); return false; }
    finally { setSaving(false); }
  }
  // Selecting one linked station selects its entire group; a saved circuit
  // must not lose half its stations by accident.
  function toggle(index: number) {
    const ex = exercises[index]; const grouped = ex.groupType !== "Straight" && ex.groupName;
    const indexes = exercises.map((e, i) => i === index || (grouped && e.groupType === ex.groupType && e.groupName === ex.groupName) ? i : -1).filter(i => i >= 0);
    setSelected(current => { const next = new Set(current); for (const i of indexes) current.has(index) ? next.delete(i) : next.add(i); return next; });
  }
  const visible = blocks.filter(b => (filter !== "favorites" || b.favorite) && `${b.name} ${b.nameCn} ${b.exercises.map(e => e.exerciseName).join(" ")}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => filter === "recent" ? (b.lastUsedAt || 0) - (a.lastUsedAt || 0) : Number(b.favorite) - Number(a.favorite) || b.updatedAt - a.updatedAt);
  return <ProgrammingSheet title={zh ? "训练模块" : "Exercise blocks"} close={close}>
    <p>{zh ? "保存热身或循环训练。插入后可独立调整，不会改变原模块。" : "Reuse warm-ups and circuits. Inserted exercises are independent copies."}</p>
    <div className="programmingToolbar"><input aria-label={zh ? "搜索模块" : "Search blocks"} placeholder={zh ? "搜索模块…" : "Search blocks…"} value={search} onChange={e => setSearch(e.target.value)} /><button type="button" onClick={() => void load()} disabled={loading || saving}>{zh ? "刷新" : "Refresh"}</button></div>
    <div className="programmingFilters">{[["all", zh ? "全部" : "All"], ["favorites", zh ? "收藏" : "Favorites"], ["recent", zh ? "最近使用" : "Recent"]].map(([key, label]) => <button type="button" key={key} aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}</button>)}</div>
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    {exercises.length > 0 && <button type="button" className="outlineButton" onClick={() => setCreating(!creating)}>{zh ? "从当前训练保存模块" : "Save a block from this session"}</button>}
    {creating && <form className="blockCreate" onSubmit={async e => { e.preventDefault(); if (await write({ action: "save", id: newId, version: 0, name, nameCn, exercises: exercises.filter((_, i) => selected.has(i)) })) { setCreating(false); setName(""); setNameCn(""); setSelected(new Set()); setNewId(crypto.randomUUID()); setNotice(zh ? "模块已保存。" : "Block saved."); } }}>
      <label>{zh ? "模块名称（英文）" : "Block name"}<input required maxLength={120} value={name} onChange={e => setName(e.target.value)} /></label>
      <label>{zh ? "模块名称（中文，可选）" : "Chinese name (optional)"}<input maxLength={120} value={nameCn} onChange={e => setNameCn(e.target.value)} /></label>
      <p>{zh ? "选择要保存的动作。循环训练将整组保存。" : "Select exercises. Linked circuits stay together."}</p>
      {exercises.map((ex, i) => <label className="blockPick" key={i}><input type="checkbox" checked={selected.has(i)} onChange={() => toggle(i)} /><span>{ex.exerciseName}<small>{exercisePrescription(ex, zh).summary} · {ex.sectionName}{ex.groupType !== "Straight" ? ` · ${ex.groupType}` : ""}</small></span></label>)}
      <button className="goldButton" disabled={saving || !selected.size || !name.trim()}>{saving ? (zh ? "保存中…" : "Saving…") : (zh ? "保存模块" : "Save block")}</button>
    </form>}
    {loading ? <p>{zh ? "加载中…" : "Loading blocks…"}</p> : !visible.length && <p>{zh ? "暂无匹配的模块。" : "No matching blocks yet."}</p>}
    {visible.map(b => <article className="programmingBlock" key={b.id}><div className="blockTitle"><strong>{zh && b.nameCn ? b.nameCn : b.name}</strong><button type="button" disabled={saving} aria-label={`${b.favorite ? "Unfavorite" : "Favorite"} ${b.name}`} aria-pressed={b.favorite} onClick={() => void write({ action: "favorite", id: b.id, version: b.version })}><Star size={18} fill={b.favorite ? "currentColor" : "none"} /></button></div>
      <details><summary>{b.exercises.length} {zh ? "个动作 · 查看内容" : "exercises · View prescription"}</summary><ol>{b.exercises.map((e, i) => <li key={i}><strong>{e.exerciseName}</strong><small>{exercisePrescription(e, zh).summary} · {e.groupType === "Straight" ? e.sectionName : `${e.groupType} · ${e.groupMode || (zh ? "循环" : "Rounds")}`}</small>{e.rest && <small>{zh ? "休息" : "Rest"}: {e.rest}</small>}{(zh ? e.coachingNotesCn || e.coachingNotes : e.coachingNotes) && <p>{zh ? e.coachingNotesCn || e.coachingNotes : e.coachingNotes}</p>}</li>)}</ol></details>
      <div className="blockActions"><button type="button" className="goldButton" disabled={saving} onClick={() => { insert(b.exercises); setNotice(zh ? "已插入独立副本，请保存训练。" : "Independent copy inserted. Save the session when ready."); void write({ action: "used", id: b.id, version: b.version }); }}><Plus size={16} />{zh ? "插入模块" : "Insert block"}</button><button type="button" disabled={saving} aria-label={`Delete ${b.name}`} onClick={async () => { if (window.confirm(zh ? "删除此模块？已插入的训练不受影响。" : "Delete this saved block? Inserted sessions remain unchanged.")) if (await write({ action: "delete", id: b.id, version: b.version })) setBlocks(cur => cur.filter(row => row.id !== b.id)); }}><Trash2 size={18} /></button></div>
    </article>)}
  </ProgrammingSheet>;
}
