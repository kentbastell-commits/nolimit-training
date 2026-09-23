import { useState } from "react";
import { useTranslation } from "react-i18next";
import ProgrammingSheet from "./ProgrammingSheet";
import type { Client } from "./appCore";
export default function CoachAthleteSwitcher({ clients, selected, name, select }: { clients: Client[]; selected: string; name: string; select: (client: Client) => void }) {
  const { i18n } = useTranslation(); const zh = i18n.language?.startsWith("zh");
  const [open, setOpen] = useState(false), [query, setQuery] = useState("");
  return <><button type="button" className="coachSwitchAthlete" aria-label={zh ? "切换运动员" : "Switch athlete"} onClick={() => setOpen(true)}>{name} <span aria-hidden="true">⌄</span></button>{open && <ProgrammingSheet title={zh ? "切换运动员" : "Switch athlete"} close={() => setOpen(false)}><input aria-label={zh ? "搜索运动员" : "Search athletes"} placeholder={zh ? "搜索运动员…" : "Search athletes…"} value={query} onChange={e => setQuery(e.target.value)} />
    <p>{zh ? "保留当前日历日期和页面。" : "Keep the current date and workspace tab."}</p>
    {clients.filter(c => `${c.name} ${c.clientCode}`.toLowerCase().includes(query.toLowerCase())).map(c => <button type="button" className="athleteSwitchRow" key={c.id} disabled={c.id === selected} onClick={() => { select(c); setOpen(false); setQuery(""); }}>{c.name}{c.id === selected ? (zh ? " · 当前" : " · Current") : ""}</button>)}
  </ProgrammingSheet>}</>;
}
