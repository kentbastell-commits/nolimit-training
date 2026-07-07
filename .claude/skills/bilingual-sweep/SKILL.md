---
name: bilingual-sweep
description: Find and convert hardcoded or combined "English 中文" UI strings to proper i18n (t() with en+zh keys), merge keys, and verify the language toggle switches cleanly. Use when Kent sends a screenshot showing untranslated/mixed-language UI, when a new feature added user-visible strings, or when he asks for anything to be "bilingual" or "translated".
---

# Bilingual sweep

Makes a target area of the app switch cleanly between English and 中文. Works in
both repos; the merge pipeline (`scripts/mergeI18nKeys.mjs` + `src/i18nGenerated.ts`)
exists in kangfu-zhuanjia — if sweeping nolimit-training for the first time, port
those two files over first (copy from kangfu, adjust nothing else).

## Step 1 — Scope from the evidence

- Screenshot from Kent → identify the exact components. One screenshot means a
  *category* of miss, not one string: sweep the whole file(s), not the visible lines.
- New feature → sweep exactly the files the feature touched.
- Find offenders mechanically (mixed EN+CJK literals per file):

```bash
cd <repo> && PYTHONIOENCODING=utf-8 python - << 'EOF'
import re, glob
latin = re.compile(r'[A-Za-z]{3,}.*[一-鿿]|[一-鿿].*[A-Za-z]{3,}')
for f in sorted(glob.glob('src/*.tsx') + glob.glob('src/*.ts')):
    if f.endswith(('i18n.ts','i18nGenerated.ts')): continue
    text = open(f, encoding='utf-8', errors='ignore').read()
    hits = [m.group(0)[:70] for m in re.finditer(r'"[^"\n]*"|\'[^\'\n]*\'|`[^`\n]*`', text) if latin.search(m.group(0))]
    if hits:
        print(f, len(hits)); [print('   ', h) for h in hits[:8]]
EOF
```

Also grep for English-only literals in the target files (headers, buttons,
placeholders, empty states) — those are equally in scope.

## Step 2 — Classify every hit before touching it (the safety gate)

For each string decide which of these it is. Getting this wrong breaks saves,
parsers, or filters — this is the step a careless pass skips.

| Class | Examples | Action |
|---|---|---|
| UI chrome | headers, buttons, placeholders, tooltips-with-text, empty/loading states | Convert to `t("key")` |
| Logic value | `<option value>`, strings compared with `===`, status values, filter keys | Translate ONLY the displayed text; `value=`/comparison constant unchanged: `<option value="Weight">{t("weight")}</option>` |
| Persisted constant | strings written into Feishu records or composed into saved text (kangfu: `SECTION_PRESETS` titles → saved SOAP, `SCAN_SECTIONS` → image category, notes meta lines `Tracking:`/`Unilateral:`) | DO NOT change the constant. Add a render-time label map: `const LABEL_KEYS = {...}; const label = (v) => LABEL_KEYS[v] ? t(LABEL_KEYS[v]) : v;` |
| Data value | record content from the API (exercise names, injury names, "Shoulder 肩" body parts) | Leave alone — data is bilingual by design |
| Pacing-language ternary | `paceZh ? "次" : "reps"` in the patient portal | Leave alone — driven by the patient's language, not UI locale |
| Language names | the EN/中文 toggle labels themselves | Leave alone |

## Step 3 — Convert

- Component without `t`: add `import { useTranslation } from "react-i18next";` and
  `const { t } = useTranslation();` (check first — some components receive `t` as a
  prop; use what exists).
- REUSE existing keys: read `src/i18n.ts` and `src/i18nGenerated.ts` key lists
  before inventing keys. Match by identical English text.
- New keys: camelCase with a per-file prefix (`lib`, `exm`, `inj`, `ct`, `bld`,
  `ws`, `sn`, `rpt`, `app`, `nav` are taken — pick a fresh one per new area).
- Plurals: i18next v26 / JSON v4 — `key_one` + `key_other` in EN, ONLY `key_other`
  in zh. `key_plural` silently never fires; never use it.
- Chinese quality bar: natural clinical/professional app Chinese (患者 not 客户,
  治疗师 not 教练, 训练方案 not 程序), not literal translation.
- Watch for `t` shadowing (`.map((t) => ...)`) — rename the loop var, not the hook.

## Step 4 — Register the keys

Never edit `src/i18nGenerated.ts` by hand.

1. Write new keys to the session scratchpad as `i18n-<area>.json`:
   `{"en": {"key": "Text"}, "zh": {"key": "文本"}}`
2. `node scripts/mergeI18nKeys.mjs` (set `SEED_DIR` env var to the scratchpad dir
   if it differs from the default baked into the script — update that default to
   the current session's scratchpad when it's stale).
3. Confirm the merge output reports no unexpected `MISSING zh` (missing `*_one` in
   zh is correct; anything else missing zh is a defect — fix the JSON).

## Step 5 — Verify (checkable, all required)

- [ ] `npx tsc -b --force` clean and `npm run build` clean
- [ ] re-run the Step 1 scanner on the swept files: remaining hits are ONLY
      classified leave-alones (persisted/data/pacing), each one justifiable
- [ ] grep the swept files for `t("` keys and spot-check 5 against the merged
      bundle — a typo'd key renders as its raw key name at runtime
- [ ] no `value=` attribute or `===` comparand changed anywhere in the diff

Then commit (list the areas swept and the leave-alone rationale in the message)
and end the response with the deploy command, or run /deploy if Kent already
approved deploying.
