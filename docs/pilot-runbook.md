# Pilot Runbook — first real athletes on NX LIMIT

Written 2026-07-28. Everything here is live and rehearsed: the coached loop
(assign → train → log → wellness → review), the digital-buyer loop, the
message loop, backups (restore drill passed 2026-07-28), and the launch gate.

## Before inviting the first athlete — one-time decisions

| Decision | Status | What to do |
|---|---|---|
| Coach console lock | **OFF (dev mode)** | Say the word and the console goes behind the access key (`COACH_ACCESS_KEY` — already built). Recommended ON before the first invite. |
| Launch gate | UP | Athletes enter via the entry link (below). Lift the gate entirely only when you want the public site open. |
| Mini program trial version | Check it points at **2026.07.28** | 版本管理 → 体验版. |
| Wellness morning ping | Dormant | Needs the subscribe template (admin scan — girlfriend batch). Everything else is already live. |
| WeChat admin rebind + 变更备案 cert | Parked | Girlfriend batch. Neither blocks the pilot. |

## Inviting a coached athlete (Online / In-person)

1. Coach console → Clients → add the athlete. Set **Client Type = Online
   Coaching** or **In-Person Training** (this switches on wellness, workload,
   coach QR, and inbox for them) and their preferred language.
2. Assign their program in the builder as usual.
3. Send them, on WeChat:
   - the **entry link**: `https://trainnolimit.cn/enter-nx-9gzsH5SyZuj0`
     (opens the gate, then the portal)
   - the **mini program trial QR** (体验版 QR from 版本管理) — they may need
     to be added as 体验成员 in the mp console first.
4. They log in with **phone + name exactly as you entered them** (or WeChat
   one-tap after the first phone login binds their account).

## Your daily 5 minutes

- Coach console → **Review**: new workout logs, wellness check-ins (reply —
  athletes see your reply in the app), and 留言 messages.
- Your phone gets a Feishu ping the moment an athlete messages you or an
  order/signup happens — no need to poll.

## If something looks broken

- **You get a Feishu alert automatically** when the site goes down or
  crash-loops (5-min watchdog), plus a morning digest at 06:00. Silence from
  the digest = the monitor itself is broken — tell Claude.
- Athletes always have the **写给教练** message loop even if a page fails.
- First move for any athlete report: ask for a screenshot, forward it to
  Claude in a new session.

## Emergency levers (tell Claude, or run yourself)

- Roll back the web app one commit:
  `ssh nolimit-cn "cd /opt/nolimit-training && git reset --hard HEAD~1 && npx vite build && pm2 restart nolimit-training"`
- Restart only: `ssh nolimit-cn "pm2 restart nolimit-training"`
- Backups: nightly 03:30 on the Shanghai box (`/opt/backups/pg/`), pulled to
  the HK box 04:45 (`/opt/backups/pg-cn/`). Restore procedure proven
  2026-07-28 (identical row counts from the previous night's dump).
- trainnolimit.com (rest of world) is a pass-through to the same backend; if
  only .com breaks, the HK proxy is the suspect, not the app.

## Known limits going into the pilot

- Payment is the manual WeChat QR + NL-XXXX reference flow (商户号 later).
  Orders unlock only after you verify payment in the console — never on the
  buyer's say-so.
- The morning wellness WeChat ping activates once the subscribe template
  exists; until then athletes see the Daily wellness item on their homepage
  when they open the app.
- Jump Lab is web-portal only (Metrics tab), by design.
