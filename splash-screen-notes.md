# splash-screen-notes.md — Boot splash / "Power Bars" loader

Goal: an animated brand loading screen on app boot — five gold bars charge
left-to-right like a battery, a percentage counter climbs to 100%, then the app
is revealed. Implemented from the drop-in `SplashScreen.tsx` / `SplashScreen.css`
per `PROMPT_FOR_OPUS.md`.

## Files

| File | What |
|---|---|
| `src/SplashScreen.tsx` | The component (drop-in, verbatim except the logo asset — see below). Self-contained, no new deps. |
| `src/SplashScreen.css` | Styles (drop-in + one `mix-blend-mode` line — see below). |
| `src/main.tsx` | Gates the app behind the splash (scoped — see below). |
| `tests/unit/components/SplashScreen.test.tsx` | Smoke test: renders wordmark/bars/label, zero-pads %, fires `onFinish` at 100%. |

## Where the splash shows (scope decision)

The splash gates the **coach console (`?view=coach`) and the client portal
(`?portal=client`)** — the two data-loading app experiences. It is deliberately
**skipped** on the public marketing landing, store, invite and enquiry pages so
their first paint stays instant (those were recently optimized for a lean public
bundle; a 2.6s loader in front of the sales page would undo that).

The lever is `bootShowsSplash()` in `src/main.tsx`: `ready` starts `true`
(app renders immediately) for public pages, `false` (splash first) for the app.
**To show the splash everywhere, make that function return `true`.**

## Logo asset — the one deviation from the drop-in

The prompt assumed `/nl_wordmark_clean.png` was a white/transparent wordmark. In
this repo it is not — it is gold text on a **checkerboard/opaque light plate**,
which renders as an ugly light box on the dark splash. Verified by rendering all
wordmark assets on a black background:

- `nl_wordmark_clean.png` — gold on an opaque light plate → **unusable on dark**.
- `nl_wordmark_black.png` — gold on a **solid-black** plate → perfect with
  `mix-blend-mode: screen` (black blends into the dark bg; only gold shows).
- `nl_monogram_clean.png` — transparent gold NL monogram (the fallback if the
  wordmark ever changes).

Fix applied (exactly the fallback the prompt anticipated):
- `SplashScreen.tsx`: `src="/nl_wordmark_black.png"`
- `SplashScreen.css`: `.nlSplash__logo { … mix-blend-mode: screen; }`

Result: clean gold "NØLIMIT" wordmark on the dark splash, no box.

## Behavior

Timed fill as shipped: self-runs a ~2.6s charge, dwells ~0.45s at 100%, then
mounts `<App />`. To tie it to real boot work instead, pass
`progress={0..100}` from your own load steps and drive the reveal off that (the
component already supports a controlled `progress` prop).

## Verification

- `npx tsc -b --force` clean, `npm run build` clean.
- Unit suite green (96 files, 506 tests — +3 for the splash).
- Screenshotted the built app at iPhone 13 width: splash renders correctly on
  `?view=coach` (gold wordmark, charging bars, %, gold track, "POWERING UP");
  confirmed the public landing (`/`) shows **no** splash.

## Not yet deployed

Committed on `main`; deploy is Kent's call.
