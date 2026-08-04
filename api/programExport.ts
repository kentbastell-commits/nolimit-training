import type { VercelRequest, VercelResponse } from "@vercel/node";
import QRCode from "qrcode";
import { listProgramTemplates } from "../server/db/repositories/programTemplates.ts";
import { listPrograms } from "../server/db/repositories/programs.ts";
import { listExercises } from "../server/db/repositories/exercises.ts";
import { clientHasProgramAccess } from "../server/db/repositories/clients.ts";
import { coachKeyOk } from "./_coachAuth.ts";

// Offline copy of a program: one self-contained HTML file the coach (or
// athlete) can save, print to PDF, or send over WeChat — the fallback when
// the app is unreachable. Every exercise with a video gets a QR code, so
// even the PAPER printout still reaches the videos. Same access rule as
// programTemplates: this is full paid content.

const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// Builder meta lines never reach the athlete-facing document.
const META_LINE =
  /^(Section|Section Color|Label|Superset|Circuit|Circuit Mode|Circuit Minutes|Tracking|Fields|Unilateral|Accessory|Accessory Parent|Accessory Color|Set Prescriptions|Alternate Exercises|Target[^:：]*)\s*[:：]/i;
const CN_META_LINE = /^[一-鿿][一-鿿0-9]{0,11}[:：]/;
function humanNotes(notes: string): string {
  return String(notes || "")
    .split(/\r?\n/)
    .filter((l) => l.trim() && !META_LINE.test(l.trim()) && !CN_META_LINE.test(l.trim()))
    .join("\n")
    .trim();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { programId, programRecordId, clientCode, clientName, lang } =
      req.query as Record<string, string>;
    if (!programId && !programRecordId) {
      return res.status(400).json({ error: "Missing programId" });
    }
    if (!coachKeyOk(req as never)) {
      const hasAccess = await clientHasProgramAccess(
        String(clientCode || ""),
        String(programId || "")
      );
      if (!hasAccess) {
        return res.status(403).json({ error: "No access to this program" });
      }
    }

    const zh = String(lang || "") === "zh";
    const programs = await listPrograms();
    const program = programs.find(
      (p) =>
        p.programId === programId ||
        p.recordId === programRecordId ||
        p.programId === programRecordId
    );
    const templates = await listProgramTemplates(
      String(programId || ""),
      String(programRecordId || "")
    );
    // Videos and Chinese names live on the exercise library, not the
    // template rows — join by exercise id.
    const { exercises: exercisesList } = await listExercises();
    const exMap = new Map(
      exercisesList.map((e) => [e.exerciseId, e] as const)
    );

    // Group rows into week/day sessions, keeping exercise order.
    const sessions = new Map<
      string,
      { week: number; day: number; name: string; nameCn: string; notes: string; rows: typeof templates }
    >();
    for (const t of templates) {
      const key = `${t.week}-${t.day}-${t.sessionName}`;
      if (!sessions.has(key)) {
        sessions.set(key, {
          week: t.week,
          day: t.day,
          name: t.sessionName,
          nameCn: t.sessionNameCn || "",
          notes: t.sessionNotes || "",
          rows: [],
        });
      }
      if (t.exerciseName || t.testTemplateId) sessions.get(key)!.rows.push(t);
    }
    const ordered = [...sessions.values()].sort(
      (a, b) => a.week - b.week || a.day - b.day
    );

    // One QR per distinct video URL (data URIs keep the file self-contained).
    const qrCache = new Map<string, string>();
    const qrFor = async (url: string) => {
      if (!url) return "";
      if (!qrCache.has(url)) {
        try {
          qrCache.set(
            url,
            await QRCode.toDataURL(url, { margin: 1, width: 96 })
          );
        } catch {
          qrCache.set(url, "");
        }
      }
      return qrCache.get(url) || "";
    };

    const L = zh
      ? {
          program: "训练计划",
          for: "训练者",
          week: "周",
          day: "第",
          dayUnit: "天",
          exercise: "动作",
          sets: "组数",
          reps: "次数",
          tempo: "节奏",
          rest: "休息",
          video: "视频",
          scan: "扫码看视频",
          notes: "教练提示",
          test: "体能测试",
          generated: "生成于",
          offline: "离线版 — 如应用无法访问时使用",
        }
      : {
          program: "Training Program",
          for: "Athlete",
          week: "Week",
          day: "Day",
          dayUnit: "",
          exercise: "Exercise",
          sets: "Sets",
          reps: "Reps",
          tempo: "Tempo",
          rest: "Rest",
          video: "Video",
          scan: "Scan for video",
          notes: "Coach notes",
          test: "Physical Test",
          generated: "Generated",
          offline: "Offline copy — use if the app is unavailable",
        };

    const weeks = new Map<number, typeof ordered>();
    for (const s of ordered) {
      if (!weeks.has(s.week)) weeks.set(s.week, []);
      weeks.get(s.week)!.push(s);
    }

    let body = "";
    for (const [week, days] of weeks) {
      body += `<section class="week"><h2>${L.week} ${week}</h2>`;
      for (const s of days) {
        const title = zh && s.nameCn ? s.nameCn : s.name;
        body += `<div class="session"><h3>${zh ? `${L.day}${s.day}${L.dayUnit}` : `${L.day} ${s.day}`} · ${esc(title)}</h3>`;
        if (s.notes) body += `<p class="sessionNotes">${esc(s.notes)}</p>`;
        if (s.rows.length && s.rows.every((r) => r.testTemplateId && !r.exerciseName)) {
          body += `<p class="testDay">🏁 ${L.test}</p></div>`;
          continue;
        }
        body += `<table><thead><tr><th>${L.exercise}</th><th>${L.sets}</th><th>${L.reps}</th><th>${L.tempo}</th><th>${L.rest}</th><th>${L.video}</th></tr></thead><tbody>`;
        for (const r of s.rows) {
          if (!r.exerciseName) continue;
          const ex = exMap.get(r.exerciseId);
          const displayName =
            zh && ex?.exerciseNameCn ? ex.exerciseNameCn : r.exerciseName;
          const cues = humanNotes(r.notes || "");
          const video = zh
            ? String(ex?.videoUrlCn || ex?.videoUrl || "")
            : String(ex?.videoUrl || "");
          const qr = await qrFor(video);
          body += `<tr>
            <td class="exName"><strong>${esc(displayName)}</strong>${
              cues ? `<div class="cues">${esc(cues).replace(/\n/g, "<br>")}</div>` : ""
            }</td>
            <td>${esc(r.sets || "-")}</td>
            <td>${esc(r.reps || "-")}</td>
            <td>${esc(r.tempo || "-")}</td>
            <td>${esc(r.rest || "-")}</td>
            <td class="videoCell">${
              qr
                ? `<a href="${esc(video)}"><img src="${qr}" alt="QR" width="72" height="72"><span>${L.scan}</span></a>`
                : video
                  ? `<a href="${esc(video)}">${L.video} ›</a>`
                  : "—"
            }</td>
          </tr>`;
        }
        body += `</tbody></table></div>`;
      }
      body += `</section>`;
    }

    const title = `${esc(program?.programName || programId)} — ${L.program}`;
    const athlete = clientName ? `<p class="athlete">${L.for}: ${esc(clientName)}</p>` : "";
    const html = `<!doctype html><html lang="${zh ? "zh-CN" : "en"}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, "PingFang SC", "Microsoft YaHei", "Segoe UI", sans-serif; color: #1a1712; padding: 28px 20px; max-width: 900px; margin: 0 auto; }
  header { border-bottom: 3px solid #d4af37; padding-bottom: 14px; margin-bottom: 22px; }
  h1 { font-size: 26px; letter-spacing: -0.01em; }
  .brand { font-weight: 900; letter-spacing: 0.02em; color: #8a6d1c; font-size: 13px; text-transform: uppercase; }
  .athlete { color: #4f4636; margin-top: 4px; font-weight: 600; }
  .offline { color: #8a8577; font-size: 12px; margin-top: 4px; }
  h2 { font-size: 20px; margin: 26px 0 10px; color: #8a6d1c; }
  .session { margin-bottom: 18px; break-inside: avoid; }
  h3 { font-size: 16px; margin: 12px 0 6px; }
  .sessionNotes { font-size: 13px; color: #4f4636; margin-bottom: 6px; white-space: pre-wrap; }
  .testDay { font-weight: 700; color: #6a4fc0; padding: 8px 0; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; background: #f4f2ed; padding: 7px 9px; border: 1px solid #e2ddd0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b675e; }
  td { padding: 8px 9px; border: 1px solid #e2ddd0; vertical-align: top; }
  .exName { min-width: 220px; }
  .cues { font-size: 12px; color: #55503f; margin-top: 4px; white-space: pre-wrap; }
  .videoCell { text-align: center; width: 96px; }
  .videoCell a { display: inline-flex; flex-direction: column; align-items: center; gap: 2px; font-size: 10px; color: #8a6d1c; text-decoration: none; }
  footer { margin-top: 30px; color: #8a8577; font-size: 11px; border-top: 1px solid #e2ddd0; padding-top: 10px; }
  @media print {
    body { padding: 0; }
    .week { break-before: page; }
    .week:first-of-type { break-before: auto; }
    a { color: inherit; }
  }
</style></head><body>
<header>
  <div class="brand">NX//LIMIT Training</div>
  <h1>${title}</h1>
  ${athlete}
  <p class="offline">${L.offline}</p>
</header>
${body}
<footer>${L.generated} ${new Date().toISOString().slice(0, 10)} · trainnolimit.cn</footer>
</body></html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${(program?.programName || "program").replace(/[^\w一-鿿 -]/g, "")}.html"`
    );
    return res.status(200).send(html);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ error: "Server error", message });
  }
}
