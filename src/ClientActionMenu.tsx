import { coachClientName } from "./clientIdentity";
import { useLayoutEffect, useRef, useState } from "react";
import { CalendarDays, UserRound, Activity, BookOpen, House, Users, Link2 } from "lucide-react";
import type { Client } from "./appCore";
import "./ClientActionMenu.css";

export default function ClientActionMenu({ client, x, y, zh, close, profile, navigate, assign, copy }: {
  client: Client; x: number; y: number; zh: boolean; close: () => void;
  profile: () => void; navigate: (view: "Home" | "Training" | "Programs" | "Progress") => void; assign: () => void; copy: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: x, top: y });
  useLayoutEffect(() => {
    const root = ref.current!;
    const bounds = root.getBoundingClientRect();
    setPosition({ left: Math.max(8, Math.min(x, innerWidth - bounds.width - 8)), top: Math.max(8, Math.min(y, innerHeight - bounds.height - 8)) });
    const previous = document.activeElement as HTMLElement | null;
    root.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
    const outside = (e: Event) => { if (!root.contains(e.target as Node)) close(); };
    const dismiss = () => close();
    document.addEventListener("pointerdown", outside);
    window.addEventListener("resize", dismiss);
    window.addEventListener("scroll", dismiss, true);
    return () => { document.removeEventListener("pointerdown", outside); window.removeEventListener("resize", dismiss); window.removeEventListener("scroll", dismiss, true); if (previous?.isConnected) previous.focus(); };
  }, [x, y, close]);
  const actions = [
    { label: zh ? "查看资料" : "View profile", Icon: UserRound, run: profile },
    { label: zh ? "训练日历" : "Calendar", Icon: CalendarDays, run: () => navigate("Training") },
    { label: zh ? "训练概览" : "Training overview", Icon: House, run: () => navigate("Home") },
    { label: zh ? "训练计划" : "Programs", Icon: BookOpen, run: () => navigate("Programs") },
    { label: zh ? "进展与测试" : "Progress & tests", Icon: Activity, run: () => navigate("Progress") },
    { label: zh ? "分配教练" : "Assign coaches", Icon: Users, run: assign },
    { label: zh ? "复制学员链接" : "Copy athlete link", Icon: Link2, run: copy },
  ];
  return <div className="clientActionPopover" ref={ref} style={position} role="menu" aria-label={`${zh ? "运动员操作" : "Actions for"} ${client.name}`} onContextMenu={e => e.preventDefault()} onKeyDown={e => {
    const buttons = Array.from(ref.current!.querySelectorAll("button"));
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "Escape" || e.key === "Tab") { close(); if (e.key === "Escape") e.preventDefault(); }
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
      e.preventDefault();
      const next = e.key === "Home" ? 0 : e.key === "End" ? buttons.length - 1 : (index + (e.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length;
      buttons[next]?.focus();
    }
  }}><div className="clientActionPopoverIdentity"><strong>{coachClientName(client)}</strong><span>{client.clientCode}</span></div>
    {actions.map(({ label, Icon, run }) => <button key={label} role="menuitem" type="button" onClick={() => { close(); run(); }}><Icon size={17} aria-hidden="true" />{label}</button>)}
  </div>;
}
