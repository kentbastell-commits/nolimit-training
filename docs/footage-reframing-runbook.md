# Exercise footage reframing runbook

Last verified: 2026-10-30 (Strength 2 and Yanjun Saturday recordings/instructions)

This is the canonical handoff for both Codex and Claude. Read it before changing, recreating, moving, or publishing the 2026-08-08 exercise footage.

## Approved deliverables

The two complete libraries live side by side in the main footage folder:

- `C:\Users\kentb\Videos\nolimit-footage\16x9` - 94 landscape MP4 masters.
- `C:\Users\kentb\Videos\nolimit-footage\9x16` - 94 vertical MP4 masters.

The untouched 3072x3072 camera originals remain in `C:\Users\kentb\Videos\nolimit-footage\2026-08-08`. Never overwrite them. The folders under `edited`, `final`, `local-16x9-clean`, `analysis`, and `reframed-remaining` are working history and QA evidence; the two top-level delivery folders above are the convenient handoff copies.

Keep the DJI clip id suffix (`__0137`, for example) in every filename. It is the reliable link back to the camera original.

## Non-negotiable creative rules

- Exercise-library and workout-player videos must show the complete movement. Preserve feet and floor contact for squats, jumps, lunges, carries, deadlifts, sled work, and landings. Preserve hands, implement paths, the full back, and relevant machine setup where technique depends on them.
- Frame the athlete and action, not the rack, machine column, or empty room.
- Use a clean full-bleed crop when the movement genuinely fits. Side-fill is a preservation tool, not the default.
- When a hard crop would remove essential movement, use the smallest wider treatment that keeps the action readable. Avoid unnecessary zoom.
- Do not add captions, emoji, stickers, graphics, or decorative overlays.
- Do not use OpusClip or another paid API unless Kent explicitly approves the spend for that run. Both approved libraries were completed locally.
- Never approve a moving exercise from one midpoint frame. Review the entire duration using evenly distributed frames, including setup, transitions, peak movement, landing/end range, and the first and last five seconds.

## Reframing decision process for future edits

Use this process for every new correction or batch. A crop is not approved merely because the athlete looks centered in a standing, setup, or midpoint frame.

### 1. Confirm the destination before choosing the crop

- The top-level `9x16` and `16x9` folders are technique-first masters for the exercise library and workout player. Complete movement visibility takes priority over a tight, full-screen social crop.
- If a separate social post needs a tighter or differently composed edit, make a separate derivative. Never overwrite the app master with a social-only treatment.
- Explanation clips must retain the speaker's full head plus the equipment, limb, or contact point being explained. A face-centered crop that loses the machine or demonstration is a failure.

### 2. Measure the technique-critical motion envelope across time

Judge the union of all important positions throughout the clip, not a single person bounding box. Include setup, every repetition direction, transitions, and finish:

- Squats, lunges, split squats, calf raises, and deadlifts: both complete feet, floor contact, knee and hip positions, and any bench or footplate. For reverse lunges and rear-foot-elevated split squats, explicitly inspect the deepest position and the complete rear shoe; the back leg can disappear even when the standing frames look centered.
- Jumps: the top of the head or implement at peak flight and both feet plus floor at landing. Lowering a crop for the feet is not valid if it loses airborne headroom.
- Pullups and scapular pullups: both hands and the bar at the top, then the full back, pelvis, and useful lower-body motion at the bottom.
- Rows, presses, triceps work, and kettlebell movements: hands, implement path, torso, supported leg or bench, and the furthest implement position on both sides.
- Carries, sleds, broad jumps, and walking lunges: the complete travel path. Center the combined action path, not the athlete's position at the start.
- Ergometers and machines: the athlete plus the technique-relevant machine body, handles, rail, footplate, sled, or display. Do not center an empty machine column while cropping the person.

No technique-critical landmark should touch the crop edge at its most extreme frame. Leave visible safety space around feet, hands, implements, and landing positions so normal motion does not appear clipped during playback.

### 3. Choose the smallest treatment that passes the full motion envelope

For 9:16:

1. Use a true 1728x3072 vertical crop only when the complete motion envelope and safety space fit for the whole clip.
2. If the hard crop fails, prefer a stable sharp square/wider foreground on solid charcoal `#111214`. The established options are:
   - 1320-pixel foreground at y=180 when the action fits within roughly the central 82% of the source width.
   - 1240-pixel foreground at y=220 when the action needs roughly 87% of the source width. This is the default correction for lunges and rear-foot-elevated split squats that lose a foot in a hard crop.
   - 1080-pixel foreground at y=360 when the full square source width or full equipment path is required.
3. Recenter the foreground only after comparing the leftmost and rightmost action extremes. Do not bias toward the rack, bench, or the athlete's setup pose.
4. Use a tracked crop only when the athlete materially travels and a stable wide treatment would make the exercise too small. Tracking must use deliberate holds and smooth pans; it must not hunt between the athlete and equipment.
5. Do not use blur in the approved 9:16 exercise-library treatment.

For 16:9:

1. Start with a true 1728-high full-bleed crop when both the upper and lower motion extremes fit.
2. If a true crop loses feet, hands, head, or equipment, expand only as much as required using the established graduated near-fit heights such as 1920, 2048, 2304, or 2560. Use side-fill only for the part of the source that cannot fit; blur is a preservation tool, not a default look.
3. Use the complete square foreground only when the action genuinely needs the full source height, such as full wall-ball or SkiErg paths.
4. Set vertical position from both extremes. Increasing source-space y reveals more floor and lower body but can remove head, hands, or an overhead implement; verify both before approving a “lower” crop.

### 4. Render candidates before replacing masters

- Render corrections into a working folder first. Never test by overwriting the untouched square originals or the current approved master.
- Keep the clip ID suffix through every source, candidate, review sheet, and delivery filename. Resolve naming by visual content plus clip ID; do not trust the descriptive source title alone.
- Preserve the explicit `__0154` / `__0196` canonical-title swap. Source `__0154` is the dumbbell rear-foot-elevated split squat; source `__0196` is the cable-triceps lateral-bias exercise.

### 5. Full-duration visual QA gate

Every corrected candidate must pass all of the following before promotion:

1. Compare source, current master, and candidate with at least 20 evenly distributed frames covering the complete duration.
2. Inspect the first five seconds and last five seconds more densely; the established check uses 10 frames from each segment. For clips shorter than 10 seconds, densely sample the complete clip instead.
3. Inspect the exact technique extremes: deepest lunge or squat, elevated rear foot, forward stride, takeoff, airborne peak, landing, top and bottom of a pull, and furthest implement or machine position as applicable.
4. Check both sides or directions when the exercise alternates. A crop that passes one leg or repetition but clips the other fails.
5. Scrub or play any section where a landmark approaches an edge. Contact sheets are evidence, not permission to ignore motion between samples.
6. Reject unnecessary empty ceiling, cropped floor, avoidable blur, off-center equipment-first framing, or a subject that is needlessly small.
7. Confirm visually that no captions, emoji, stickers, graphics, or decorative overlays were added.

### 6. Technical QA and promotion gate

- Verify dimensions, H.264 video, AAC audio, 60000/1001 frame rate, duration continuity against the source, no subtitle stream, and fast-start delivery metadata.
- Promote only after visual and technical QA pass. Copy the approved filename into the correct top-level `9x16` or `16x9` folder; synchronize any maintained mirror so two folders do not silently carry different versions.
- Hash-check promoted copies when more than one library location is maintained.
- Recount both libraries and compare normalized clip identities. The approved set remains 94 landscape plus 94 vertical masters with the same 94 clip IDs.
- Record every new per-clip decision in the reproducible recipe and this runbook, including treatment, scale or crop dimensions, x/y position or tracking expression, and the visual reason for the exception.

### Explanation audio and edit restraint

- Apply speech enhancement only to filenames containing `Explanation`; do not alter exercise-only audio as a batch side effect.
- Remove a filler word only when transcription and listening make the interval unambiguous and the synchronized audio/video cut is natural. When confidence is low, retain it.
- Never add captions, emoji, or other engagement graphics unless Kent explicitly requests them for a separate social derivative.
- Keep all routine reframing and explanation-audio work local. Paid services require explicit approval for that specific run, with the expected credit or monetary cost stated before submission.

## How the approved 9:16 library was made

The finished vertical library is the result of a measured first pass plus full-duration audits and 46 targeted corrections. It was not a generic center crop.

### Measured first pass

1. `scripts/footage/extract-analysis-frames.mjs` made contact sheets from all 94 square originals.
2. Each athlete was measured as `headTop`, `xLeft`, and `xRight` in `C:\Users\kentb\Videos\nolimit-footage\analysis\measurements.json`.
3. `scripts/footage/batch-crop.mjs` calculated a floor-anchored crop with about 420 source pixels of headroom, never tighter than 75% of the square's height, widened for horizontal exercises, and centered on the athlete.
4. Outputs were 1080x1920 H.264 at the source 60000/1001 frame rate with audio and fast-start metadata.

The general command was:

```powershell
node scripts/footage/batch-crop.mjs `
  C:\Users\kentb\Videos\nolimit-footage\2026-08-08 `
  C:\Users\kentb\Videos\nolimit-footage\edited `
  C:\Users\kentb\Videos\nolimit-footage\analysis\measurements.json
```

### Full-duration audit and corrections

The first pass was sampled at 15%, 38%, 62%, and 85% of every clip: 376 frames total. The audit found 52 passes, 26 reviews, and 16 failures. The original correction pass replaced 23 clips; four 2026-08-18 follow-up reviews replaced 8, 8, 1, and 5 clips. The 2026-08-19 final audit added one correction and revised one existing treatment:

- 31 horizontal, traveling, or equipment-dependent clips use a sharp square/wider foreground on a solid charcoal `#111214` vertical canvas. Most use a 1240- or 1320-pixel foreground; clips whose athlete/equipment path requires the complete source use the 1080-pixel square. There is no blur in the approved 9:16 corrections.
- 13 clips use a recentered true 9:16 crop because the original crop followed equipment, selected the wrong side, or centered the machine rather than the athlete/action.
- Two clips use time-tracked 1728x3072 crops. `Sled Push__0107` uses `if(lt(t,4),600,if(lt(t,8),600-120*(t-4),120))`: hold x=600 through 4 seconds, pan linearly to x=120 from 4-8 seconds, then hold x=120. `Ski Erg Explanation__0114` uses `if(lt(t,80),650,if(lt(t,84),650+62.5*(t-80),900))`: hold x=650 through the teaching and demonstration, pan smoothly to x=900 from 80-84 seconds, then hold x=900 for the closing explanation.

The follow-up vertical corrections are encoded in `scripts/reframe-remaining-footage.ps1` with these source-space decisions:

- `KB Swing Explanation__0172`: true 1728x3072 crop at x=820, keeping the green kettlebell inside the complete swing.
- `Scap Pullups Rear View__0128`: true crop at x=820; `Scap Pullups Side View__0129`: true crop at x=850. Both center Mario and preserve hands, back, and lower body.
- `Single Arm DB Row Explanation__0145` and `Single Arm DB Row__0146`: 1240-pixel sharp square foreground at y=220 on charcoal, retaining the bench-supported leg.
- `Single Leg Back Extension ISO__0210` and `Single Leg Back Extension__0209`: complete 1080-pixel sharp square foreground at y=360 on charcoal, retaining the full raised foot and leg.
- `Zombie Squat__0165`: true crop at x=700, centered on the athlete and full stance.

The second follow-up adds these complete-duration-reviewed decisions:

- `DB Squat Jump__0186`: true crop at x=800, preserving feet through takeoff and landing.
- `Glute Dominant Back Extension__0211`: complete 1080-pixel square at y=360 on charcoal, preserving the athlete and the full bench.
- `High Incline DB Bench Press__0142`: 1320-pixel square at y=180 on charcoal, with a -110-pixel horizontal subject adjustment so the athlete, dumbbells, bench, and lower body remain centered.
- `KB Side Bend__0185`: true crop at x=650; `Rope Tricep Extension__0198`: true crop at x=900; both retain the full body and implement path.
- `Single Leg Squat 1__0173`: true crop at x=1100, centered on the side-view movement with both feet visible.
- `Sled Push Explanation__0120`: complete 1080-pixel square at y=360 on charcoal so the athlete and relevant equipment remain visible across instruction and demonstration.
- `BB Split Squat__0147`: complete 1080-pixel square at y=360 on charcoal, preserving the rear leg and shoe through the deepest split-squat position.

The fourth follow-up replaces five hard crops after 20-frame full-duration reviews showed that the first-pass framing lost the traveling or elevated leg at movement extremes. Each now uses a centered 1240-pixel sharp square foreground at y=220 on charcoal:

- `BB Rear Foot Elevated Split Squat__0156`: preserves the rear foot on the bench through the complete repetition.
- `BB Reverse Lunge__0148`: preserves the complete rear leg and shoe at full lunge depth.
- `DB Forward Lunge__0152`: preserves the forward foot and complete stride instead of clipping the leading edge.
- `DB Rear Foot Elevated Split Squat__0154`: preserves the elevated rear foot, bench, and front-leg position. Its camera source remains the mislabeled `Cable Tricep Extension Lateral Bias__0154.MP4`; keep the canonical delivery title and `__0154` ID.
- `DB Reverse Lunge__0151`: preserves the complete rear leg and shoe across both sides of the repetition.

The 2026-08-19 final audit adds or revises these vertical decisions:

- `BB Split Squat Explanation__0149`: 1240-pixel sharp square foreground at y=220 on charcoal with a -60-pixel horizontal adjustment, preserving the rear shoe through the loaded demonstration without sacrificing the speaker's head.
- `Sandbag Lunges__0104`: complete 1080-pixel square at y=360 on charcoal, replacing the hard x=650 crop so the traveling athlete and both ends of the lunge path remain visible wherever they exist in the camera original.
- `Ski Erg Explanation__0114`: full-bleed tracked 1728x3072 crop, held at x=650 through 80 seconds, panned to x=900 from 80-84 seconds, then held. This removes the black square boundary, keeps the SkiErg visible during teaching and demonstration, and recenters the athlete for the close.

The reproducible correction recipes are in `scripts/reframe-remaining-footage.ps1`; the visual comparison generator is `scripts/build-reframe-review-sheets.ps1`. The detailed results and the list of retained review clips are in `deliverables/footage-9x16-reframe-results.md`. The original audit is `deliverables/footage-9x16-audit.md`.

The approved 9:16 batch did not add captions, graphics, blur, or the later 16:9 explanation-audio treatment.

## How the approved 16:9 library was made

The earlier generic landscape crop is superseded. Do not use `edited\16x9` as the final library and do not regenerate these masters with the old `headTop - 50` rule.

Every clip has an explicit, full-duration-reviewed decision in `scripts/footage/framing-decisions-16x9.mjs`. The production renderer is `scripts/footage/local-render-16x9.mjs`.

The approved mix after the 2026-08-19 follow-up is:

- 30 true 16:9 full-bleed crops with no blur.
- 58 graduated near-fit compositions with only the blurred side-fill needed to preserve movement.
- 6 full-square foreground compositions for movements whose top-to-bottom action cannot survive a landscape crop, chiefly wall-ball and SkiErg footage.

Important approved examples:

- Bench-press explanations retain the full head and useful leg/foot setup.
- High-incline and incline dumbbell bench press are lowered enough to retain the knees/lower-body setup.
- Burpee broad jump preserves the floor, feet, back, and travel path.
- Both scapular-pullup views preserve the hands, full back, pelvis, and movement range.
- Glute-dominant back extension and single-leg dumbbell hip thrust are true full-bleed 16:9 with no blur.
- Use side-fill for wall ball, SkiErg, broad/traveling movements, or other clips only when full bleed would remove essential action.

The follow-up landscape audit lowers chin-ups, Barbell RDL, cable/rope/katana triceps work, and every jump family crop. All jump crops now retain landing feet and enough airborne headroom. The two recorded source titles below are wrong; delivery titles are corrected without changing the source IDs:

The second follow-up gives `Pullups__0178` the same lower 2048-high crop used for chin-ups (y=256), and expands `Seated DB Shoulder Press__0143` to a 2560-high crop at y=256 so the overhead dumbbells, torso, seated position, and feet remain visible throughout.

The third follow-up lowers five more landscape clips after another 20-frame full-duration review:

- `Elevated Pigeon Stretch Explanation 2 PAILs__0216`: 2048-high crop at y=320, preserving the head while revealing the crossed leg and box setup.
- `EMOM Explanation 2__0134`: true 16:9 crop at y=600, reducing ceiling and showing more body.
- `Single Arm DB Row__0146`: 2560-high crop at y=384, retaining the complete bench-supported stance and shoes.
- `Row Erg Explanation__0117`: 2304-high crop at y=384, keeping the athlete, rower body, rail, and leg position visible.
- `Scap Pullups Rear View__0128`: 2048-high crop at y=200, lowering the composition while preserving both hands overhead.

The fourth follow-up makes this lower-body visibility correction:

- `Single Leg Back Extension__0209`: true 16:9 crop lowered to y=700, showing more of the feet and apparatus without adding side-fill.

The 2026-08-19 final audit supersedes the earlier calf treatment after full-motion review showed that the 2048-high crops still hid the working shoe at the bottom edge:

- `Seated Calf ISO High Position__0125`, `Seated Calf ISO Low Position__0126`, and `Seated Calf Machine Raises__0124`: 2304-high crops at y=576, retaining the complete head while showing the working shoe, ankle motion, footplate, and machine through the full clip. The 240-pixel side fill on each side is the minimum needed to preserve that vertical action.
- `Sandbag Lunges Explanation__0121`: true full-bleed 16:9 crop at y=1300, replacing the 2304-high blurred treatment. The lower crop preserves both feet and the complete stride during the loaded lunges while keeping the sandbag and head clear.

- Source `Cable Tricep Extension Lateral Bias__0154.MP4` shows the dumbbell rear-foot elevated split squat and exports as `DB Rear Foot Elevated Split Squat__0154`.
- Source `DB Rear Foot Elevated Split Squat__0196.MP4` shows the cable triceps lateral-bias exercise and exports as `Cable Tricep Extension Lateral Bias__0196`.

The shared title mapping is `scripts/footage/canonical-output-titles.mjs`. Both `batch-crop.mjs` and `local-render-16x9.mjs` use it; the PowerShell vertical correction/review scripts carry the same explicit map. Never swap or remove the `__0154` and `__0196` IDs.

Render and verify with:

```powershell
node scripts/footage/local-render-16x9.mjs
node scripts/footage/local-verify-16x9.mjs
```

The verifier creates a 20-frame full-duration contact sheet for every encoded output and checks dimensions, video/audio streams, duration continuity, subtitle absence, and the no-overlay flag. Final QA evidence is in:

- `C:\Users\kentb\Videos\nolimit-footage\local-16x9-clean\review`
- `C:\Users\kentb\Videos\nolimit-footage\local-16x9-clean\qa-summary.json`
- `deliverables/footage-16x9-local-clean-results.md`

### Explanation audio

Only clips whose filenames contain `Explanation` receive the local speech chain: 75 Hz high-pass, 14.5 kHz low-pass, conservative FFT denoise, 3:1 compression, and loudness normalization to -16 LUFS / -1.5 dBTP. The exact filter is in `local-render-16x9.mjs`.

Filler removal must be conservative and synchronized across audio and video. The 2026-08-18 transcription audit found zero high-confidence filler intervals, so the approved 16:9 masters contain zero filler cuts. Do not manufacture cuts merely to claim filler removal.

## Encoder and QA notes

- Source is DJI 10-bit HEVC. With `h264_nvenc`, convert to `yuv420p`; otherwise FFmpeg can report the misleading `No capable devices` error.
- CUDA decoding materially speeds up the 3072x3072 sources.
- Cap delivery bitrate. Unbounded NVENC quality mode created needlessly large files.
- Required final dimensions: 1920x1080 for landscape and 1080x1920 for vertical.
- Final accounting is 94 landscape plus 94 vertical videos, with the same 94 normalized clip identities in both folders.

## Separate library addition — Leg Extension, 2026-09-24

- Source: `C:\Users\kentb\OneDrive\Desktop\App Recordings\Leg Extensions.mp4`, supplied for library exercise `EX-LEG-1809`. This 2842x1568, approximately 30 fps clip is separate from the August DJI master set and has no DJI clip ID.
- Preserve the full source frame: scale to 1920x1060, then pad 10 pixels above and below with charcoal to deliver 1920x1080. No crop, tracking, trimming, overlays, or speech processing. Keep the complete visible knee/roller path, handles, seated setup and head; the lowest return position already approaches the source's bottom edge.
- Delivery: H.264/yuv420p, 30 fps matching this source's nominal rate, original AAC stream copied, fast-start MP4. Do not manufacture 59.94 fps for this non-DJI source. The original remains untouched and the 94+94 masters are not modified.
- QA: source and candidate each reviewed at 20 full-duration samples plus 20 dense beginning/end samples; complete candidate decode passed. Duration 9.792s → 9.833s; delivery 4.68 MB versus source 22.64 MB. Recipe and evidence: `deliverables/leg-extension-video-2026-09-24/qa.json`, `review.py`, and the source/candidate contact sheets.

## Separate library additions — calf extension and walking drills, 2026-09-25

These three supplied clips in `C:\Users\kentb\OneDrive\Desktop\App Recordings` are separate from the August DJI masters. Preserve the original files and the existing 94+94 master accounting. Each clip uses its entire source frame as the protected motion envelope; no additional crop, trim, tracking, overlay, audio processing, or paid service was used.

| Source and library entry | Source frame | Approved landscape composition | Motion to preserve |
| --- | --- | --- | --- |
| `Calf Extension Machine.mp4` — `EX-CAL-1249` | 2866x1532 | Scale to 1920x1026, charcoal-pad to 1920x1080 | Seated support, hands, knees, both forefeet and footplate through ankle extension and return. Retain the source's existing recording graphics. |
| `Toe Walks.mp4` — `EX-SA-TOEW-7114` | 2824x1586 | Scale to 1920x1078, charcoal-pad to 1920x1080 | Setup, both heels and forefeet, table support, travel in both directions and turns. The shoe approaches the source edge; do not crop further. |
| `Heel Walks.mp4` — `EX-HYX-HIGH-9281` | 2848x1554 | Scale to 1920x1048, charcoal-pad to 1920x1080 | Heels, lifted toes, shin position, supported setup, both travel directions and turns. |

- All candidates: H.264/yuv420p, nominal source rate of 30 fps, original AAC stream copied, fast-start MP4. No conversion to the DJI 59.94 fps standard. Set `comment=nx-opt` because these deliveries have already been optimized.
- QA: each source and candidate reviewed with 20 full-duration frames plus 20 beginning/end samples. Full candidate decodes passed; source/candidate AAC packet hashes match; MP4 `moov` precedes `mdat`. Durations are 8.448→8.467s, 11.115→11.133s and 14.293→14.300s, respectively. Delivery sizes are 697,733, 3,556,458 and 3,562,186 bytes.
- Evidence and exact render arguments: `deliverables/yanjun-day2-2026-09-25/media-plan.json`, `render.py`, `review.py`, source/candidate probe JSON and full/edge contact sheets.
- Uploaded bytes matched candidate SHA-256 hashes before library linking. Generated thumbnails, origin and media-CDN HTTP 206 responses, total byte sizes and both application workers were verified. Publication and verification receipts are in the same delivery folder.

## Separate library additions — COS footage batch, 2026-09-25

Twenty-four clips already sitting in the footage bucket (`Content September 6th 2026/`, `mobile-uploads/mario/`, `Summer Hotel Filming Pushups/`, `Summer Filming Skips and Jumps/`) were linked to library rows that had no video. Full list, identity decisions and the one drop (a dumbbell press mislabelled as a barbell press) are in `deliverables/cos-library-batch-2026-09-25/RESULTS.md`; render arguments, probes and hashes in `media-plan.json`; 100 contact sheets in `review/`.

- These sources are landscape recordings (DJI 3840x2160 at 59.94/29.97 fps, phone 1920x1080 at 60 fps, two square 3072x3072 hotel clips already pillarboxed), not the August square masters. Each uses its entire frame as the protected motion envelope: scale to 1920x1080 (charcoal-pad the square ones), source nominal fps, libx264 crf 23 / 4M cap, AAC copied, `comment=nx-opt`, fast-start. No crop, trim, tracking, overlay, audio processing or paid service. The 94+94 August masters are untouched.
- Baked-in captions on the hotel and skips edits are part of the source and were kept; the already-linked clips from those shoots have the same style.
- Publication mirrored the 2026-09-25 Yanjun batch (`publish-library.cjs`: hash-checked local upload, thumbnail, before-snapshot-guarded transaction on `short_video_url`, cache-bus notify). Verified: live API shows all 24 URLs; origin and media CDN answer 206; thumbnails 200.
- Transport lesson: candidates went browser→box via COS (`web-inbox/` staging + regional pull), because a direct upload from abroad runs ~40 KB/s. Signing a COS URL for a key with spaces uses the RAW pathname in the signature while the request URL is percent-encoded; signing the encoded path gives 403.

## Separate library additions — COS footage batch 2, 2026-09-25

Seventy-four more bucket clips: 69 NEW library rows created from the footage (names, 中文, taxonomy in `deliverables/cos-library-batch-2026-09-25/plan2.json`) plus 5 existing rows linked. Same treatment and QA as batch 1; details, identity decisions and receipts in `RESULTS2.md`, sheets in `review/`.

- Lesson: two renderers pointed at the same plan race on the tail (one full-decoded a file the other was still writing → "moov atom not found"). Split the slug list between processes, or re-verify every candidate from disk afterwards (`verify2.mjs` does: probe + full decode + re-hash) and never trust a manifest written during a race.
- New rows were created through the real `/api/upsertExercise` (coach key from the box's .env) so ids, translation mirrors and cache invalidation behave exactly as the coach console; preflight refuses any name that already exists on an Active row.

## Separate library replacement — Smith Machine Bench Press, 2026-09-29

- Source: `C:\Users\kentb\OneDrive\Desktop\App Recordings\Smith Machine Bench Press.mp4`, for existing exercise `EX-SMI-2268`. Replace that exercise's demo link only; retain the original recording and the previous uploaded asset for rollback. Incline and Power Bench Press are separate entries.
- The source stores 268x480 H.264 pixels with a -90° display matrix, presenting a 480x268 landscape frame at 30 fps. Bake its existing display orientation, scale the complete visible frame to 1920x1072 and charcoal-pad four pixels above and below. No cropping, trimming, tracking, overlays or speech processing; preserve the AAC packets. This non-DJI source retains 30 fps and does not change the August 94+94 master libraries.
- Protected motion envelope is the complete displayed 480x268 frame. Both hands, bar travel from chest to extension, head, shoulders, torso, visible bench and knees stay visible throughout. Feet and outer plate edges are already outside the supplied recording; no additional framing can recover them. The source is low resolution; upscaling does not add detail.
- Source, previous demo and candidate reviewed using 20 full-duration samples plus 20 dense beginning/end samples each, including every sampled chest-level and lockout extreme. Candidate full decode, orientation, H.264/yuv420p, AAC packet equality, 30 fps, subtitle/data-track absence and fast-start metadata pass. Duration 12.533333→12.538005s; candidate 5,097,183 bytes.
- Recipe, hashes, technical probes, contact sheets and publication/verification receipts: `deliverables/smith-bench-video-2026-09-29/`. Library update is guarded against concurrent edits; workout prescriptions and coaching cues remain intact.

## Separate library additions — Chen Cong, 2026-09-30

- Sources in `C:\Users\kentb\OneDrive\Desktop\App Recordings`: `Deadbug leg Lowers.mp4` (`EX-DEA-2312`), `Landmine 180's.mp4` (`EX-LAN-3279`), and `Landmine Shoulder Press.mp4` (`EX-0059`). The exact existing library entries are linked; no duplicate exercises were created. The `Landmine !80's` typo and its mistranslated Chinese name were corrected to `Landmine 180s` / `地雷杠180度转体`.
- Each source stores 568x320 video with a -90° display matrix, displaying a 320x568 portrait frame. Retain that portrait composition: bake display orientation, scale the entire displayed frame to 1080x1918 and pad two charcoal pixels at the bottom to make 1080x1920. Protected source envelope is x=0, y=0, width=320, height=568. No crop, trim, tracking, added overlay, or audio processing. Preserve the original files and August 94+94 libraries.
- Movement review includes both alternating legs, bench/head/hand supports, pelvic position, both directions of the landmine arc, hip/foot pivots, the pressing hand and overhead reach. The supplied deadbug recording already cuts off part of the lowering shoe at its furthest right extent. The landmine 180 recording similarly lets the plate/bar and occasionally the hand approach or cross the right boundary. Preserve every available source pixel; a wider export cannot recover content absent from the recording. These are low-resolution supplied demonstrations, not new high-detail masters.
- Delivery is H.264/yuv420p, original AAC packet copy, fast-start MP4, `comment=nx-opt`, with source nominal rates retained: deadbug 30 fps, landmine clips 30000/1001. Durations: 12.000→12.000s, 9.680→9.7097s and 10.998333→11.011s. Sizes: 5,490,635; 5,251,330; and 5,003,665 bytes. Full decode, audio packet equality, orientation, stream types, duration continuity and fast-start checks passed.
- Visual evidence: each source and candidate has 20 full-duration and 20 beginning/end samples. The existing split-squat demo was separately reviewed to inform session notes. Recipes, SHA-256 hashes, probes, contact sheets, guarded publication and verification receipts are in `deliverables/chen-cong-2026-09-30/`.
- Candidate bytes were hash-checked through temporary COS staging, origin upload and final storage; temporary staging objects were removed. Both API workers resolve all three new videos in the library and Chen Cong's draft. Origin and media CDN range requests returned 206 with matching bytes, and all thumbnails returned 200. The assigned session remains private; athlete-mode requests return 403. No app deployment was needed.

## Separate library additions — Chen Cong activation, 2026-10-01

Eight supplied screen recordings from `C:\Users\kentb\OneDrive\Desktop\App Recordings` were matched to the existing exercise IDs in Chen Cong's October 1 coach-only draft. Library names, rather than stale template titles, confirmed the two deadbug identities. All originals and August masters remain unchanged.

| Source | Existing exercise ID | Protected full source frame | Delivery composition |
| --- | --- | --- | --- |
| Foam Roller Deadbug Ipsilateral Squeeze.mp4 | EX-FOA-1EFD2943 | 2864×1578 | Scale 1920×1058; center-pad to 1920×1080 |
| Foam Roller Situps.mp4 | EX-FOA-EC3697E1 | 974×1580 | Scale 1080×1752; center-pad to 1080×1920 |
| Foam Roller Deadbug Contralateral Squeeze.mp4 | EX-FOA-6C578391 | 2842×1558 | Scale 1920×1052; center-pad to 1920×1080 |
| Foam Roller Hold Heel Floating.mp4 | EX-FOA-98377E05 | 2836×1526 | Scale 1920×1034; center-pad to 1920×1080 |
| Banded Supraspinatus Raise.mp4 | EX-BAN-2E79E173 | 2832×1582 | Scale 1920×1072; center-pad to 1920×1080 |
| Banded Lower Trap Raises.mp4 | EX-BAN-9C7BD9E5 | 2848×1598 | Scale 1920×1078; center-pad to 1920×1080 |
| Banded Shoulder Extension Isometric.mp4 | EX-BAN-37879865 | 2832×1534 | Scale 1920×1040; center-pad to 1920×1080 |
| Banded External Rotations.mp4 | EX-BAN-44A2A51F | 2852×1564 | Scale 1920×1052; center-pad to 1920×1080 |

- The protected envelope is the complete visible source rectangle for each clip, x=0/y=0. Preserve roller contacts, forearms, extending hands and feet, trunk/pelvis positions, forefoot/roller contact and floating heels, both band hands, overhead reach and external-rotation arc. No new crop, tracking, blur, overlay, or audio processing. Existing screen-recording graphics/transitions remain. Several sources omit the feet/low anchor, and the heel clip's balancing hand is partly outside its frame; preserve all available pixels rather than inventing missing setup footage.
- Deliveries use H.264/yuv420p, source nominal 30 fps, original AAC packet copy, fast-start, `comment=nx-opt`, and charcoal padding. These are separate non-DJI additions. Exact commands, dimensions, hashes and technical QA are in `deliverables/chen-cong-activation-videos-2026-10-01/media-plan.json` and `render.py`.
- **Explicitly approved trim:** Kent requested removal of the floating-heel recording's unrelated recommendation ending. Frame-by-frame review around 8.85–9.48 seconds located the transition; the final app copy retains 275 exercise frames, ending at 9.166667 seconds (container/audio 9.173333 seconds). Only this ending is removed. `trim-heel.py` preserves the original and compares AAC packet hashes over the retained interval. The untrimmed candidate remains as QA history.
- Every source and candidate was reviewed at 20 full-duration and 20 dense beginning/end samples. Additional large frames confirmed both deadbug contact patterns, roller sit-up forearm pressure, band-held overhead Y and raised-heel support. The trimmed heel candidate received another full/edge review. Full decodes, streams, frame rate, audio equality, duration and fast-start checks passed.
- Content matching corrected previous provisional instructions: A1 is same-side roller pressure; A3 is opposite-side pressure; lower-trap raises hold a band between the hands; shoulder extension is prone isometric; external rotation uses the 90/90 raised-arm position. Kent explicitly approved changing B3 from 10 reps to one 10-second hold. Reviewed bilingual setup/execution/coaching-focus/muscles-felt text is stored in the library and the assigned draft for all nine exercises, including the existing scapular-pullup demo.
- Transport used regional COS staging, with no acceleration or paid reframing service. A regional DNS address timed out; retry used another returned address. Staging objects were removed after transfer, and bytes were hash-checked at the server and final upload location. Origin and media CDN returned matching 206 ranges and 200 thumbnails for all eight videos. Both workers and public-origin API checks passed. The October 1 assignment remains a private draft (athlete access 403), with other sessions, ordering, labels, groups and all other prescriptions preserved. No application deployment was needed.

## Separate library addition — Tension Block Finger Curls, 2026-10-01

- Source: `C:\Users\kentb\OneDrive\Desktop\App Recordings\Tension Block Finger Curls.mp4`. This is a dynamic finger curl; the existing Finger Curl Isometric library entry remains separate. Preserve the complete 970×986 source envelope (x=0, y=0), including fingertips and block travel, wrist/arm position, both feet and the band anchor throughout the clip.
- Delivery: scale to 1062×1080 and center on a 1920×1080 charcoal canvas. No crop, trim, tracking, overlay or audio processing. Source nominal 30 fps retained; H.264/yuv420p, original AAC packets, fast-start and `comment=nx-opt`. Original and August masters unchanged.
- Source and candidate each reviewed at 20 full-duration and 20 beginning/end samples, with a full-size frame for hand/attachment setup. Complete decode, stream checks, duration continuity, AAC packet equality and fast-start passed. Source duration 7.637333s; candidate 7.637333s, 869,725 bytes. Recipe, hashes and contact sheets: `deliverables/finger-curls-2026-10-01/`.
- Uploaded copy hash-checked, thumbnail generated, and origin/CDN range and thumbnail responses verified. Added as C2 after scapular pull-ups in Chen Cong's activation session with English/Chinese setup, execution, coaching focus and muscles felt. The session was already published at this later inspection; its live status and existing nine prescriptions were preserved. Other sessions and existing library rows were verified unchanged. No application deployment needed.

## Separate library additions — CC October 2 strength draft, prepared 2026-10-01

Five new supplied recordings in `C:\Users\kentb\OneDrive\Desktop\App Recordings` were matched to the eight-exercise October 2 draft. All source pixels are protected; no crop, trim, tracking, blur, new overlays or audio processing. The three previously linked videos were reviewed to match the notes to the demonstrated chest-supported Smith row, supported side plank and seated shoulder press.

| Source / library ID | Full displayed source envelope | Delivery |
| --- | --- | --- |
| High Stepups.mp4 / EX-HIG-1808 | 320×568; stored 568×320 with -90° display rotation | Bake orientation, scale 1080×1916, center-pad to 1080×1920 |
| Band-Assisted Jumps.mp4 / EX-BAN-3585 | 320×568; stored 568×320 with -90° display rotation | Bake orientation, scale 1080×1916, center-pad to 1080×1920 |
| Inverted Bicep Curls.mp4 / EX-INV-2363 | 704×1266 | Scale 1068×1920, center-pad to 1080×1920 |
| Swiss Ball Hamstring Curls.mp4 / EX-0038 | 2864×1400 | Scale 1920×938, center-pad to 1920×1080 |
| Hanging Knee Raises.mp4 / EX-0114 | 2858×1522 | Scale 1920×1022, center-pad to 1920×1080 |

- Protected motion: high-box foot contact, low return and upright finish; jump takeoff, airborne head/hands and both landing feet; inverted-curl grip, elbows, trunk and heels; Swiss-ball working heel, rolling ball and pelvis; hanging-knee hand/bar support, raised knees and lowered legs. The Swiss-ball source already cuts off the free raised foot near the top edge, and the hanging source is tight around the hands; preserve all available source pixels. No additional crop can restore absent content.
- Source and candidate each reviewed using 20 full-duration and 20 beginning/end samples. Additional enlarged frames confirmed Smith setup and the single-leg Swiss-ball variant. All candidates passed full decode, H.264/yuv420p, source nominal 30 fps, original AAC packet equality, duration continuity, no subtitle track and fast-start checks. Charcoal padding and `comment=nx-opt`; original files and August 94+94 masters unchanged.
- Exact commands, hashes, source/candidate probes and contact sheets: `deliverables/cc-next-2026-10-01/`. Cue wording preserves Kent's Smith-machine setup and 30-second final rowing hold, high-step support and even working-foot pressure, soft jump landings, and explicitly confirmed 45-second second-set hanging-knee hold. Generic library instructions are separate from those session-specific prescriptions.
- Publication verified: all five new library videos and eight English/Chinese library/session cue sets resolve on both API workers and the public origin. Video bytes match the reviewed candidates; origin/CDN range requests return 206 and thumbnails return 200. Regional COS staging objects were removed after transfer. The October 2 assignment remains a coach-only draft and athlete-mode reads return 403. All set prescriptions, exercise order, labels, groups, existing video links, other client sessions and the previous session version were checked and preserved. No application deployment needed.

## Separate library additions — William Monday/Tuesday, 2026-10-05

Four supplied recordings from `C:\Users\kentb\OneDrive\Desktop\App Recordings` match the existing exercises in William's October 5 and 6 sessions. Preserve the entire source rectangle, x=0/y=0, for each. No crop, trim, tracking, new overlay, blur or audio processing. Original files and August masters remain untouched.

| Source / library ID | Protected source frame | Landscape delivery |
| --- | --- | --- |
| Shoulder Walk-outs.mp4 / EX-SHO-6361 | 568×320 | Scale 1916×1080, center-pad to 1920×1080 |
| Isometric Pullup hold.mp4 / EX-0305 | 2834×1528 | Scale 1920×1036, center-pad to 1920×1080 |
| Wall Sits Floating Heel.mp4 / EX-WAL-6963 | 2842×1532 | Scale 1920×1034, center-pad to 1920×1080 |
| Hamstring Bridge.mp4 / EX-HAM-3335 | 2846×1534 | Scale 1920×1034, center-pad to 1920×1080 |

- Protected motion includes both hands and their full forward/backward path, feet/bench support, raised pelvis and wrist band in the walk-out; both hands/bar, top hold, full body and supporting step in the pull-up; back/wall contact, knees, forefeet and lifted heels in the wall sit; both heel contacts, bench, head, shoulders and hip lift/lower in the bridge. All movement extremes fit the full source frame; no tighter crop is used. The walk-out is a low-resolution supplied demo; enlarging it does not add detail. The bridge's existing “FUNDAMENTALS” label remains source content.
- Every source and candidate reviewed at 20 full-duration plus 20 dense beginning/end samples. All candidates pass full decode, H.264/yuv420p, original nominal 30 fps, copied AAC packet equality, duration continuity, fast-start, and absence of subtitle/data streams. Walk-out source data tracks are omitted. Charcoal padding and `comment=nx-opt` match the established non-DJI delivery treatment.
- Recipes, source/candidate probes, hashes, review sheets, content snapshots and guarded publication/verification scripts: `deliverables/william-mon-tue-2026-10-05/`. The elevated plyometric push-up recording is not assigned in either session and is not substituted for the programmed kneeling hold.
- Publication verified on both application workers and the public origin: all 16 English/Chinese session cue sets and four new library videos resolve in coach and athlete views. Origin/CDN byte-range responses and thumbnails pass, uploaded files match reviewed SHA-256 hashes, and temporary COS staging objects were removed. Both sessions were already published and remain published. Dates, exercise selection/order, sets, reps, hold durations, rests, original program versions and other assignments are preserved; external rotation is explicitly marked eight per side as previously confirmed for William. Tuesday's stale Chinese Monday title is corrected. No application deployment was required.


## Separate library addition - Density Hangs, 2026-10-05

- Source: `C:/Users/kentb/OneDrive/Desktop/App Recordings/Density Hangs.mp4`, matched to Density Hang `EX-0173`. Protect the complete 898x1522 source envelope, including both hands and hangboard contact, elbows, shoulder blades, torso, hips and feet throughout the hold. Full-duration review confirms these regions remain visible. No crop or trim.
- Delivery: scale to 1080x1830 and center-pad with charcoal to 1080x1920. Preserve nominal 30 fps and original AAC packets; H.264/yuv420p, fast-start, `comment=nx-opt`. No new graphics, audio processing, paid reframing or changes to original/August masters.
- Source and candidate each reviewed at 20 full-duration and 20 dense beginning/end samples, plus a full-size grip/setup frame. Full decode, stream checks, AAC packet hash equality, fast-start and duration continuity pass: source 9.471979 seconds, candidate 9.500000 seconds, 3,447,473 bytes. Exact command, hashes, probes and visual QA: `deliverables/density-hangs-2026-10-05/`.
- Published video: `/uploads/ex-e5acd0035b64a95b715c6abc.mp4`, SHA-256 `64b6809eba05eae29540237cde10446c81aa45edacd383c95f75476683123d61`. Regional COS staging removed after hash-verified transfer. Origin and CDN byte ranges and thumbnails pass.
- Replaced unrelated squat cues in the Density Hang library entry with reviewed English/Chinese setup, execution and a short child-friendly cue. Updated only the matching exercise notes in William's October 6 assignment `AW-677427`, retaining its already-published state, three 30-second holds and 120-second rests. Coach and athlete API reads pass on both workers and the public origin. A concurrent program-ID change on William's separate Monday assignment was observed during verification and left untouched. No application deployment needed.

## Separate library addition - Side Plank Abduction Hold, 2026-10-06

- Source: `C:/Users/kentb/OneDrive/Desktop/App Recordings/Side Plank-Abduction Hold.mp4`, matched to existing entry `EX-SID-2567`. The demonstration is a knee-supported side plank with the top thigh held in abduction. It is distinct from the plain Knee-Supported Side Plank `EX-KNE-SIDE-261006`.
- Protected motion envelope: the complete 480x480 source, x=0/y=0. Preserve head, supporting elbow/forearm/hand, trunk, raised pelvis, supporting knee/foot, top-thigh position and controlled lowering at the finish. Scale to 1080x1080 and center at x=420/y=0 on a 1920x1080 charcoal canvas. No crop, trim, tracking, blur, overlays or audio processing. The low-resolution source is retained in full; scaling does not create extra detail.
- Source and candidate reviewed with 20 full-duration and 20 dense beginning/end samples each, plus an enlarged setup frame. Full candidate decode, H.264/yuv420p, source nominal 30 fps, original AAC packet hash equality, no subtitle/data stream, fast-start and duration continuity pass. Duration remains 8.833333 seconds; candidate 1,434,194 bytes, `comment=nx-opt`. Recipe, probes, contact sheets, source/candidate hashes and visual QA: `deliverables/william-review-2026-10-06/`.
- Published video: `/uploads/ex-2db30dcb1ecbd8fab2cd38d4.mp4`, SHA-256 `ebb9011a9aa508ac5ab3efb64855d990bd3777efc648e8a3561fd86e7902832e`. Regional COS staging was removed after hash-verified transfer. Origin/CDN ranges return 206 and thumbnails return 200. The initial uncompressed content-snapshot transfer timed out after media transfer; compressed plan transfer completed before any library/session write.
- Updated William's six October 5-9 assignments: bilingual labels, setup/execution and parent-cue removal, with the requested push-up back-pocket/outward-twist cues and elevated stairs/bench option. A version conflict detected a newer Wednesday workout before any content write; the revised exercise selection and doses were re-read and preserved. The side-plank video now resolves in that Wednesday draft. All 29 exercise instructions, prescribed sets/reps/times/rests, other assignments and publication states pass verification on both workers and the public origin. Three published assignments remain published and three drafts remain private (athlete reads 403). No app deployment needed.
- Kent subsequently confirmed that Shoulder Walk-outs are counted in repetitions: walking the shoulders out and all the way back is one rep. Wednesday's entry is corrected to **two sets of three reps**, with `Fields: Reps`, no work-duration value and `Unilateral: No`. The 60-second rests, other exercises, video link and draft state are preserved. English/Chinese session and library instructions include the counting rule; both workers and public-origin verification pass. Evidence: `walkouts-before.json`, `walkouts-plan.json`, `apply-walkouts.cjs` and `walkouts-verification.json` in the same delivery folder. Nine entries in Thursday/Friday still lack linked videos; the exact IDs and labels are in `verification.json`.
- Original recording and August master files were not edited. The inventory check observed 93 landscape MP4s and 94 portrait MP4s, rather than the historical 94+94 count. Clip `__0158` is present only in the portrait folder; this task did not restore or remove an August master.

## Separate library addition - Finger Recruitment Pulls, 2026-10-06

- Source: `C:/Users/kentb/OneDrive/Desktop/App Recordings/Finger Recruitment Pulls.mp4`. Kent requested this replacement in CC's Finger Foundation program `PR-2640`. The existing recruitment entry `EX-FIN-RECR-261005` is now named **Finger Recruitment Pulls** / **手指募集发力拉**; no duplicate library row was created. The separate RFD entry remains unchanged.
- Protected envelope: complete displayed 320x568 portrait frame (stored 568x320, -90-degree display matrix). Bake orientation, scale to 1080x1916 and center-pad at x=0/y=2 on a 1080x1920 charcoal canvas. Preserve working fingers/edge, wrist, elbow, shoulder, head, torso and supported lower-body setup through the pull, release and standing finish. The source's foreground box obscures some lower-leg detail; preserve all available source pixels. No crop, trim, tracking, blur, added overlay or audio processing.
- Source and final candidate reviewed at 20 full-duration and 20 dense beginning/end samples each, plus an enlarged one-second setup frame. Delivery retains source nominal 30000/1001 fps, H.264/yuv420p and original AAC packets, with fast-start and `comment=nx-opt`; source data tracks are omitted. Full decode, stream checks, AAC equality and duration continuity pass: 5.538333 to 5.549569 seconds, 2,261,302 bytes. SHA-256 `a55831d99e1f9b4af169f3f6613470c5775c487860795689aef0abe5c8c5f14e`. Exact recipe, hashes, probes and visual QA: `deliverables/cc-finger-recruitment-2026-10-06/`. The preliminary 30 fps working candidate is superseded by the source-rate `recruitment-2997-candidate.mp4` and was not published.
- All four recruitment rows in weeks 1-2 use the new label and bilingual setup/execution matching the supplied single-arm demonstration. Marked unilateral and instructed to complete the existing three single, three-second pulls on each hand, with 90-second rests and the existing effort target. Set-prescription rows are unchanged. The program remains an unassigned, coach-only draft; the other 20 program rows, separate RFD exercise and all CC assignments are preserved.
- Regional COS staging removed after hash-verified transfer. Both app workers and public-origin library/program reads pass; the video resolves in all four sessions. Origin/CDN byte ranges return 206, thumbnails return 200, and athlete access to the draft remains 403. Publication and verification receipts are in the same delivery folder. No application deployment needed. Original recording and August masters are untouched; observed inventory remains 93 landscape and 94 portrait MP4s, as recorded above.

## Separate library addition — Prone YTW, 2026-10-07

- Source: `C:/Users/kentb/OneDrive/Desktop/App Recordings/Prone YTW's.mp4`, matched to existing entry `EX-PRO-1218`. Full-duration inspection confirms sequential Y, T and W arm raises while prone. Preserve the complete 2838×1480 displayed frame, x=0/y=0, including both hands at all three positions, elbows, head, trunk, pelvis and feet. No new crop, trim, tracking, blur, overlays or audio processing; originals and August masters are unchanged.
- Delivery: scale the full frame to 1920×1002 and center on a 1920×1080 charcoal canvas. H.264/yuv420p, source nominal 30 fps, original AAC packets, fast-start and `comment=nx-opt`. Source duration 14.165313 seconds; delivery 14.166667 seconds, 4,909,278 bytes. SHA-256 `10ca866ad86281894359d383cb55ff3d8ee33562f84b39317d90bf71eb8719b3`.
- Source and candidate reviewed at 20 full-duration samples plus 20 dense beginning/end samples. Both arm-direction extremes and the Y→T→W transitions retain the complete source envelope. Full candidate decode, audio-packet equality, codec/pixel format, source frame rate, duration continuity and fast-start checks pass. Evidence and recipe: `deliverables/william-thursday-labels-2026-10-07/`.
- A regional COS connection reset before transfer completion; direct SSH transfer succeeded. The server checked the candidate hash before linking `/uploads/ex-d6231126cdd58dba8c637e87.mp4`. The existing library entry receives bilingual generic instructions and its missing muscle diagram. William's Thursday draft receives separate session instructions: 8 Y, 8 T and 8 W raises per set, every raise with a one-second top hold; two sets and 120-second rests. The session remains a private draft. Application changes in the same delivery add editable workout names, blocks and exercise tags; they do not alter video framing.

## Separate library addition - Lateral Lunge, 2026-10-08

- Source: `C:/Users/kentb/OneDrive/Desktop/App Recordings/Lateral Lunge.mp4`, matched to existing entry `EX-LAT-5700`. Bodyweight lateral lunges in both directions with a return to standing between repetitions. Protect the complete 2824x1490 source rectangle, x=0/y=0, including head, hands, trunk, pelvis, both knees, both complete shoes, floor contacts and full lateral travel.
- Delivery: scale the full frame to 1920x1014 and center-pad to 1920x1080 with charcoal. H.264/yuv420p, source nominal 30 fps, original AAC packets, fast-start and `comment=nx-opt`. No crop, trim, tracking, blur, added overlay or audio processing. Original recording and August masters remain untouched.
- Source and candidate each reviewed at 20 full-duration and 20 dense beginning/end samples, including deepest positions on both sides at approximately 1.2-1.7, 3.7-4.5 and 6.2-7.0 seconds and each return. All important landmarks retain visible safety space. Full decode, stream/frame-rate checks, AAC packet equality, duration continuity and fast-start pass. Duration 7.871979 to 7.900000 seconds; 3,286,471 bytes; SHA-256 `b4f50221a5572276c01a4bb332d2ab7d237f9e72ec4c122c3c0ef176d09aaa60`.
- Direct SSH transfer and uploaded storage hash verified. Published as `/uploads/ex-87ad2ed685b85718d0bd243e.mp4`. Only the existing library row's video and thumbnail links changed. Both workers and public-origin APIs resolve the video in the library and William's Thursday workout. Origin/CDN beginning and ending byte ranges return matching 206 responses; both thumbnails return 200. William's assignments, current templates, set prescriptions, coaching instructions and draft state are unchanged. All seven exercises in Thursday's session now have linked videos. No application deployment needed.
- Recipe, protected envelope, visual reviews, probes, hashes and publication/verification receipts: `deliverables/lateral-lunge-2026-10-08/`.

## Separate library additions — App Recordings audit, 2026-10-14

- Audited all 54 video files in `C:/Users/kentb/OneDrive/Desktop/App Recordings` against 789 live library rows. Visually resolved the unmatched clips and close existing matches; created 10 distinct exercises, linked 2 demos to the existing Lateral Band Walk and Leg Press, and filled the existing Lying Leg Raise's missing cues and anatomy. Full reconciliation, identity reasons, before snapshot and publication receipt: `deliverables/library-videos-2026-10-14/`. Pre-existing library aliases outside these targets were not merged or deleted.
- Every new delivery protects the complete displayed source rectangle, x=0/y=0. Preserve both shoes and contacts, full knee-drive/switch and kickback paths, wall hands, band and partner setup, supported box knees/shins, overhead pressing head/hand path, bench hand-flight and landing, and the seated machine/footplate. No crop, trim, tracking, blur, added graphics or audio processing. The lateral-walk source's own zoom omits the head near its finish; retain all available source pixels and the full lower-body motion. The banded hip-flexor source is tight at the supporting shoe; no further crop is used.

| Source / library ID | Protected source frame | Exact full-frame delivery filter |
| --- | --- | --- |
| `A-Switch Static Landing.mp4` / `EX-ASW-1065` | 2864×1430 | `scale=1920:958:flags=lanczos,setsar=1,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x111214` |
| `Band Resisted Wall Drill .mp4` / `EX-BAN-7394` | 2850×1510 | `scale=1920:1018:flags=lanczos,setsar=1,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x111214` |
| `Banded 3-way Glute Kickbacks.mp4` / `EX-BAN-1508` | 2852×1512 | `scale=1920:1018:flags=lanczos,setsar=1,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x111214` |
| `Elevated Plyometic Pushup.mp4` / `EX-ELE-7516` | 2852×1558 | `scale=1920:1048:flags=lanczos,setsar=1,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x111214` |
| `Knees Elevated Shoulder Pushes.mp4` / `EX-BOX-7623` | 2786×1444 | `scale=1920:996:flags=lanczos,setsar=1,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x111214` |
| `Lateral Step-down.mp4` / `EX-LAT-7613` | 2814×1616 | `scale=1880:1080:flags=lanczos,setsar=1,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x111214` |
| `Mini-Band Hip Flexor Raises - Wall.mp4` / `EX-MIN-7278` | 2856×1576 | `scale=1920:1060:flags=lanczos,setsar=1,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x111214` |
| `Mini-band Lateral Walks.mp4` / `EX-0507` | 2822×1584 | `scale=1920:1078:flags=lanczos,setsar=1,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x111214` |
| `Seated leg Press.mp4` / `EX-LEG-1993` | 2836×1564 | `scale=1920:1058:flags=lanczos,setsar=1,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x111214` |
| `Wall Drill - Singles.mp4` / `EX-WAL-7324` | 2846×1508 | `scale=1920:1018:flags=lanczos,setsar=1,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x111214` |
| `Wall Drill - Triples.mp4` / `EX-WAL-4936` | 2848×1526 | `scale=1920:1028:flags=lanczos,setsar=1,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x111214` |
| `Wall Knee Drive - Double.mp4` / `EX-WAL-1626` | 2864×1594 | `scale=1920:1068:flags=lanczos,setsar=1,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x111214` |

- All 12 sources and candidates were reviewed using 20 full-duration and 20 dense beginning/end samples each, including both directions, knee-up and ground-contact positions, held landings, lower/upper pressing extremes and machine returns. All candidates pass complete decode, H.264/yuv420p, original nominal 30 fps, copied AAC packet equality, duration continuity, fast-start and no subtitle/data streams. Deliveries are 1920×1080 with the minimum charcoal padding and `comment=nx-opt`. Exact commands, hashes, probes, sheets and protected envelopes are in `media-plan.json` and `approved-media.json` in the delivery folder.
- Reviewed structured anatomy highlights render in both views and languages. All 13 new/completed rows contain reviewed English/Chinese setup, execution, coaching focus, muscles felt and common-error text. Single/double/triple wall drills have explicit exchange-count rules. Instructions are generic library content, not new workout prescriptions.
- Regional COS staging was hash-verified on the Shanghai server and all 12 temporary staging objects removed. New rows were created through the real `/api/upsertExercise`; existing updates used before-snapshot guards, and reviewed bilingual details were completed in a guarded transaction with cache invalidation. Both app workers and the public-origin API return the correct 13 entries; all 12 videos pass origin/CDN beginning/end byte-range checks and thumbnail HTTP checks. Final library count is 799, with 786 unrelated pre-existing rows unchanged and no new name duplicates. All 54 original recording hashes remain unchanged. No application deployment or workout/prescription edits were needed.
- August delivery folders were not modified. Observed inventory remains 93 landscape and 94 portrait MP4s, consistent with the recorded October 6 exception. Publication, transfer cleanup and live verification receipts are in the same delivery folder.

## Separate library additions — Tuesday gym session, 2026-10-19

- Matched two new App Recordings to existing library entries: `Dumbbell Bench Prone Row.mp4` → `EX-DUM-9581` (Dumbbell Prone Bench Row), and `Dumbbell Wrist Curls.mp4` → `EX-DUM-6767`. The row is a low-incline, chest-supported neutral-grip row. Enlarged wrist-contact frames confirm palms-up wrist flexion with supported forearms, not reverse wrist curls.
- Protect the complete source rectangle at x=0/y=0 for each clip: row 2816×1474, wrist curl 2828×1478. This retains the entire elbow/hand/dumbbell travel, head, trunk, bench, feet/knees and support contacts. Both deliveries use `scale=1920:1004:flags=lanczos,setsar=1,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x111214`. No crop, trim, tracking, blur, new graphics or audio processing. Existing source playback controls remain source content.
- Source and candidate each reviewed at 20 full-duration and 20 dense beginning/end samples. Reviewed row hanging/top positions and wrist lowered/curled positions, with enlarged wrist contact checks. Both candidates pass complete decode, H.264/yuv420p, original nominal 30 fps, copied AAC packet equality, duration continuity, fast-start, `comment=nx-opt` and exclusion of data/subtitle tracks. Row duration 11.818646 → 11.818667 seconds, 6,519,581 bytes, SHA-256 `889e43d76e932fa3d8cc6c3f5a95ce57b9c41e22e51d53cde763f54ac8983f84`; wrist duration 10.837313 → 10.866667 seconds, 3,611,168 bytes, SHA-256 `693c1609b28ece52824e0d25e84ead8f4f8ca08378313f977948e66248eeedf8`.
- Regional COS staging, server pull and final upload storage were hash-verified; both temporary staging objects were deleted. Published row `/uploads/ex-cc39dc3b1ddd6af3aa0c4d71.mp4` and wrist curl `/uploads/ex-ea1016814363b5d9202dc251.mp4`, with thumbnails. Both app workers and public-origin library API return the links, bilingual cues and structured anatomy. Origin and media CDN return matching 206 ranges at the beginning/end and 200 thumbnails.
- Completed reusable English/Chinese setup/execution notes and anatomy for those two entries and the existing Dumbbell Shoulder Extensions (`EX-DUM-6295`); the extension demo was reviewed but not replaced. Structured anatomy uses supported individual-muscle keys. Rhomboids and middle trapezius are named in the row's muscle text; the current diagram has no separate keys for them. All three diagrams render in both languages/views. Library count remains 801, with 798 unrelated rows unchanged.
- The initial eight-exercise builder draft was saved to Tuesday's calendar during preparation. Updated the resulting published session `AW-462100` for `CL-6794` through the version-guarded assigned-session API, with English/Chinese instructions for all eight exercises. Retained ordering, labels, sets, reps, rest periods, unilateral settings and the prone row's separate 15-rep and 30-second-hold sets. Reusable library row notes omit that session-specific hold prescription. Existing coach drafts were left unchanged; no application deployment was needed. The save API normalizes empty session-level coach notes from null to an empty string.
- Exact recipes, protected envelopes, source/candidate probes and contact sheets, before snapshots, content, upload/cleanup receipts, anatomy review and live verification: `deliverables/jason-tuesday-gym-2026-10-20/`. Both original source hashes were rechecked unchanged. August masters were not touched.

## Separate library addition — Cable Mountain Climbers, 2026-10-20

- Source: `C:/Users/kentb/OneDrive/Desktop/App Recordings/Cable Mountain Climber.mp4`, matched to existing `EX-CAB-9210` (Cable Mountain Climbers). Full-duration review confirms alternating knee drives from a high plank with ankle cuffs and cables behind the feet. Protect the complete 568×320 displayed source at x=0/y=0, including head, both hands/floor contacts, trunk, both knees, ankle cuffs, cable travel and both shoes. Retain every available source pixel; the off-screen cable anchors cannot be recovered by exporting wider.
- Delivery: scale the entire frame to 1916×1080 and center-pad to 1920×1080 with charcoal, using `scale=1916:1080:flags=lanczos,setsar=1,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x111214`. H.264/yuv420p, original nominal 30 fps, original AAC packets copied, fast-start, `comment=nx-opt`. Omit the source's metadata/data tracks. No crop, trim, tracking, blur, new overlays or audio processing; original file and August masters remain untouched.
- Source and candidate each reviewed with 20 full-duration and 20 dense beginning/end samples, including both alternating knee-up and extended-leg extremes. Complete decode, frame rate, dimensions, AAC packet equality, duration continuity and fast-start pass. Duration remains 15.300000 seconds; delivery 7,098,517 bytes, SHA-256 `845cd2eb2a4e084e7250ccdae031b950e96f9f5de072f497f7ac2c5df40717a1`. Original source hash rechecked unchanged: `cfd3e2540b2804950cf5bcc09175e890554a729de700ac51fa45dd4f0b226b42`.
- Regional COS staging and final storage were hash-verified; the temporary staging object was removed. Linked `/uploads/ex-9a75cfc9392672c23f8f07b9.mp4` with a generated thumbnail, using a before-snapshot-guarded update of only the existing exercise's video and thumbnail fields. No duplicate exercise, instruction changes or workout prescription edits. Evidence, exact commands, before snapshot, visual review, transfer/publication and live verification receipts: `deliverables/cable-mountain-climber-2026-10-20/`.
- Live verification passes on both app workers and the public origin: the library and athlete workout for `AW-462100` resolve the new video. The full assigned session and all assignment rows are unchanged; library count remains 801 with 800 unrelated rows unchanged. Origin/CDN beginning/end byte ranges match the approved file and both thumbnails return 200. No application deployment needed.

## Separate library addition — Pogos to Box Jump, 2026-10-21

- Source: `C:/Users/kentb/OneDrive/Desktop/App Recordings/Pogos To Box Jump.mp4`, linked to existing `EX-POG-1715` (Pogos to Box Jump). Review confirms small ankle pogos transitioning into a two-foot box jump, held landing, standing finish and step-down, followed by a front-angle demonstration. Preserve the entire 2852×1540 source at x=0/y=0, including both camera angles, airborne head/hands, both shoes and floor contacts, full box top, landings and step-down travel.
- Full-frame recipe: `scale=1920:1036:flags=lanczos,setsar=1,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x111214`. No crop, trim, tracking, blur, new graphics or audio processing. H.264/yuv420p, original nominal 30 fps, original AAC packet copy, fast-start, `comment=nx-opt`; no subtitle/data streams. The original and August masters remain untouched.
- Source and candidate each reviewed with 20 full-duration and 20 dense beginning/end samples. Reviewed pogo floor contacts, jump flight, full-foot box landings and step-downs in both angles. Complete decode, codec/pixel format, dimensions, original frame rate, AAC packet equality, fast-start and duration continuity pass: 13.055979 → 13.066667 seconds; 4,784,417 bytes; SHA-256 `540c2d9349b2269499afdaa17a1a7a0521c6220c97fe88df6dbe96733980e4a3`. Original source hash rechecked unchanged: `5f214f96ba7327bf2f267f06574c4b19b7acee9e24cece7ec0ef97757c1aa1e2`.
- Regional COS staging and final upload bytes were hash-verified, and the temporary staging object was deleted. Published `/uploads/ex-980ea7fe8b735283f9589953.mp4` with a generated thumbnail. Added generic English/Chinese setup/execution cues and structured calf, quadriceps and glute anatomy to the existing exercise. Anatomy checked in both views/languages. Both app workers and public-origin library API resolve the video, cues and anatomy; origin/CDN beginning/end ranges match the candidate and thumbnails return 200. Library count remains 803, with 802 unrelated entries unchanged.
- Updated the nine exercise instructions in `Home Program 1`, assigned draft `AW-961e4a31-d5c9-4777-96f6-f9b0bd4fe9e7` for `CL-6794`. Instructions incorporate the coach's existing tips in clear English/Chinese: bodyweight ankle holds; gentle outward shoulder tension and shoulder-blade control in pulls; one good-technique pull-up rep set followed by two 20-second top holds with assistance as needed; kneeling 30-second push-up holds; and six feet-supported 30-second hangboard holds alternating 20–25 mm edges and ball holds, with 20-second rests. Preserved all original ordering, labels, tracking metadata, sets, reps, work times, rests and draft status. No application deployment was needed.
- Full before snapshots, original tips, replacement instructions, metadata prefixes, recipes, probes, contact sheets, anatomy review, guarded upload/session scripts and verification receipts: `deliverables/jason-home-program-2026-10-21/`.

## Separate library addition — Mini-Band Shoulder Wall Walks, 2026-10-26

- Source: `C:/Users/kentb/OneDrive/Desktop/App Recordings/Mini Band Shoulder Walks.mp4`, matched to existing `EX-MIN-8974`. Demonstration shows alternating small hand steps up and down the wall, with the band around the wrists and gentle outward shoulder rotation. One complete up-and-down sequence counts as one repetition.
- Protected motion envelope: the complete 2848×1526 source rectangle, x=0/y=0. Preserve both fists/wrists, band, elbows, overhead reach, shoulder blades and trunk at every step and reversal. Lower legs are outside the supplied recording; no additional crop is used. Delivery filter: `scale=1920:1028:flags=lanczos,setsar=1,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x111214`. No crop, trim, tracking, blur, new graphics or audio processing. Original recording and August masters remain untouched.
- Source and candidate each reviewed at 20 full-duration and 20 dense beginning/end samples, including alternating-hand overhead extremes and the return. Complete decode, H.264/yuv420p, source nominal 30 fps, copied AAC packet equality, fast-start and absence of subtitle/data streams pass. Duration 9.642646 to 9.666667 seconds; 1,461,834 bytes; SHA-256 `fd4c30c60ee6ce5604fd4ff81513c8441c102ce347e3f72ff9c1c53705f2d04e`. Source SHA-256 `f5a18d9a68435c801f802c9d01f9f3517cd5e36b50683c4049ea1b92ea574757`.
- Regional COS staging and final upload bytes were hash-verified; staging removed. Published `/uploads/ex-d83c5a63885b82ec6bb85821.mp4` with a thumbnail and reusable English/Chinese setup/execution. Both app workers and the public-origin API resolve it in the library and 鲈鱼's eight-exercise `Climbing Warmup 1` draft, `AW-b5311a73-3980-4020-ad67-f80b04c8bad8` for `CL-6795`. Origin/CDN beginning/end byte ranges match the candidate and thumbnails return 200.
- Added bilingual session setup/execution for all eight exercises, incorporating the coach's wall-walk, extension-hold and walk-out counting rules. Prescriptions, metadata, exercise order, other assignments and unrelated library rows are preserved. Session remains private; athlete endpoint returns 403. Also restored only the missing Chinese mirror of existing shoulder-press video feedback `FV-160862`; original English, review state and other feedback are unchanged. No new message or notification was sent and no software deployment was needed.
- Evidence, exact render command, protected envelope, contact sheets, before snapshots, content, guarded publication/session scripts and live verification: `deliverables/luyu-warmup-2026-10-26/`.

## Separate library additions - hip switches, chest press and side bends, 2026-10-28
- Sources in `C:/Users/kentb/OneDrive/Desktop/App Recordings` match the three existing exercise entries; no duplicates created. Hip switches show the confirmed low frontal-plane transfer with the bar between the legs, not a standing pivot drill. Side bends show a dumbbell in the lower hand on a 45-degree bench; chest press shows the seated machine press.
- Each protects the complete displayed source frame at x=0/y=0. Preserve all available head/hand/implement motion, hip and knee positions, foot contacts, bench pads and machine supports. The hip-switch source is tight at the crown and outer shoe, and the side-bend source is tight at the left shoe; retain all source pixels. No crop, trim, tracking, blur, added graphics or audio processing.

| Source / library ID | Full displayed frame | Full-frame delivery filter |
| --- | --- | --- |
| `Landmine Hip Switches.mp4` / `EX-LAN-8890` | 480x480 | `scale=1080:1080:flags=lanczos,setsar=1,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x111214` |
| `Machine Chest Press.mp4` / `EX-0253` | 2840x1476 | `scale=1920:998:flags=lanczos,setsar=1,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x111214` |
| `45-Degree Side Bends.mp4` / `EX-DEG-9202` | 2840x1548 | `scale=1920:1046:flags=lanczos,setsar=1,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x111214` |

- Source and candidate each reviewed at 20 full-duration and 20 dense beginning/end samples, including both hip-shift directions, press extended/lowered extremes and side-bend/return positions. H.264/yuv420p, original nominal 30 fps, original AAC packet hashes, full decode, duration continuity, fast-start and no subtitle/data streams pass. Hip-switch display rotation is baked in; originals are untouched.
- `EX-LAN-8890`: `https://trainnolimit.cn/uploads/ex-e51ff7db21759b65e28c945a.mp4`; source/candidate durations 9.166667 -> 9.166667 seconds; 3924922 bytes; SHA-256 `48dee37216d0c8600cb853ec826bbbeca3f1aa0ee9efcf9d9de5b42c1db169b5`.
- `EX-0253`: `https://trainnolimit.cn/uploads/ex-c35543f65a928a66e38e67c2.mp4`; source/candidate durations 12.074646 -> 12.100000 seconds; 4340571 bytes; SHA-256 `c9ade0dc29d0a6d6c9091fe5a277871a8293b8df35829bc9d8850e96ca4d09f0`.
- `EX-DEG-9202`: `https://trainnolimit.cn/uploads/ex-e1c76bc814cecfda5c8da09d.mp4`; source/candidate durations 14.719979 -> 14.733333 seconds; 4666709 bytes; SHA-256 `d82e1bbbcb7e3966d553d0d0817d56bbfaf6a238bc9a967f8fbc598b4d446907`.
- Three uploaded files were hash-verified through temporary regional COS staging and final storage; staging objects removed. All three receive reusable English/Chinese setup/execution and muscle text. Diagram highlights use supported keys: hip adductor longus/magnus and gluteus medius; chest, anterior deltoid and triceps; external obliques for side bends. Internal obliques and quadratus lumborum are named in side-bend muscle text; the diagram has no separate deep-muscle keys. Both views and languages reviewed. The hip-switch movement pattern is corrected from Horizontal Push to Squat.
- Existing Strength 1 revision `AW-424717` for `CL-6796` now resolves all nine videos through the library links. Its instructions, prescriptions, order and publication state are preserved; no workout was published. Library count remains 807, with 804 unrelated rows unchanged. No application deployment or mini-program upload is needed for these library data changes. Original source hashes rechecked unchanged; August masters untouched, observed inventory 93 landscape and 94 portrait.
- Exact render commands, protected envelopes, full/edge review sheets, probes, audio checks, anatomy screenshots, before snapshots, publication receipts and live origin/CDN verification: `deliverables/strength-demo-additions-2026-10-28/`.

## Separate library additions — Wall climbing warmup, 2026-10-28

- Sources in `C:/Users/kentb/OneDrive/Desktop/App Recordings`: `Wall Hip Switches.mp4` → `EX-WAL-6997`; `Wall Diagonal Reaches.mp4` → `EX-WAL-9920`; `Wall Curtsy Squats.mp4` → `EX-WAL-8405`. These match the three existing entries in Chen Yujie's nine-exercise `Climbing Warmup 2`, assignment `AW-636293` for `CL-6796`. No duplicates created.
- All three protect the complete displayed 1280×720 source at x=0/y=0. Full-duration review includes both directions, low hip-transfer positions, raised supporting heel and highest diagonal hand/free-leg reach, and deepest curtsy/rear-leg reach. All hands, head, hips, knees, both complete feet and floor/wall contacts retain visible space. Full-frame delivery filter: `scale=1920:1080:flags=lanczos,setsar=1,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x111214`. The aspect ratio already fits, so no padding is visible. No crop, trim, tracking, blur, added graphics or audio processing.
- Source and candidate each reviewed with 20 full-duration and 20 dense beginning/end samples, including both movement directions; the diagonal reach also received a full-size contact check. Candidates pass full decode, H.264/yuv420p, original nominal 30 fps, original AAC packet equality, fast-start and no subtitle/data streams. Durations: hip switches 9.866667 → 9.866667 seconds; diagonal reaches 15.500000 → 15.510000; curtsy squats 18.200000 → 18.200000. All original source hashes rechecked unchanged; August masters untouched.
- Published videos: hip switches `/uploads/ex-56d660b00ca8744a7871f9b5.mp4`; diagonal reaches `/uploads/ex-c044e7c22ec223e66dcf8be0.mp4`; curtsy squat `/uploads/ex-51d8ab6db9cf53efbf9ad98f.mp4`. Transfer and final-storage SHA-256 checks pass; all three temporary regional COS staging objects removed.
- Completed English/Chinese library setup, execution, coaching focus, muscle text and diagram highlights for all nine exercises. Reused reviewed William/Jason side-plank, Chen Cong band-raise, Luyu shoulder-extension and Jason scapular-pullup/assisted-hold cues. Wall hip switches explicitly stay low in one plane without bobbing; diagonal reaches rise onto the supporting calf with the same-side hand reaching as high diagonally as possible, light wall support and body close; curtsy squats keep the chest facing and close to the wall while the free leg reaches behind. Corrected the three wall entries' unrelated Horizontal Push classification. Supraspinatus is named in muscle text; the diagram has no separate supraspinatus or lateral-deltoid region, so only its available anterior-deltoid region is highlighted for that raise. Both anatomy views and languages render for all nine entries.
- Updated all nine bilingual instructions through the version-guarded assigned-session API. Preserved the already-published state, ordering, all sets/reps/rests/metadata and the existing 30-second side-plank hold per side, three 10-second shoulder-extension holds, and 15-second top pull-up hold. Generic library pull-up instructions remain dynamic; this assignment's notes describe its hold. The save API normalizes an empty session-level coach note from null to an empty string. No client message, notification, app deployment or mini-program upload.
- Evidence: `deliverables/wall-warmup-2026-10-28/`, including full/edge source/candidate sheets, exact commands, probes/hashes, anatomy screenshots, before snapshots, reused-note sources, guarded scripts, publication/session receipts and live origin/CDN checks.
- Follow-up shoulder cues: Kent added Kneeling Push-Up `EX-KNE-5869` as a tenth exercise, with `MAX` repetitions and 120-second rest. Added bilingual setup/execution and explicit gentle shoulder external-rotation and scapular-depression cues to this entry, Scapular Pull-Up `EX-0297` and Pull-Up `EX-0086`, in both the library and this assignment. Push-ups use the outward-floor-twist and back-pocket cues while permitting natural shoulder-blade movement; pulling uses the outward-bar-bend and back-pocket cues. The 15-second pull-up hold, all prescriptions, the seven other exercise notes, publication state, other assignments, videos and anatomy are unchanged. Both workers and public-origin coach/athlete reads pass. Snapshot, guarded content/API scripts and verification receipt: `deliverables/wall-warmup-cues-2026-10-28/`. No footage or application code changed.

## App Recordings audit and bent-knee soleus addition — 2026-10-29

- Audited all 66 MP4s in `C:/Users/kentb/OneDrive/Desktop/App Recordings` against 810 live library rows. The 65 previously handled sources retain their recorded source hashes and existing linked exercise identities. The only unattached source was `Bent Knee Soleus Raises.mp4`; existing exercise `EX-KNE-3205` (`Knees Bent Soleus Raises`) already exists, so it was completed without creating a duplicate. All 66 final library links resolve in both workers and the public-origin API, and all 66 origin video-range requests return 206.
- The soleus source shows bilateral heel raises in a supported partial squat. Protect the full 2850×1564 source at x=0/y=0, preserving head, both hands/rack contacts, hips, bent knees, both complete feet and heel-up/down extremes. Candidate filter: `scale=1920:1054:flags=lanczos,setsar=1,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x111214`. No crop, trim, tracking, blur, added graphics or audio processing. Source/candidate each reviewed at 20 full-duration plus 20 dense beginning/end samples; source is under ten seconds, so samples densely cover its full duration.
- Full decode, H.264/yuv420p, original nominal 30 fps, original AAC packet equality, fast-start and no subtitle/data streams pass. Source duration 8.746646 → candidate 8.766016 seconds; 2,712,709 bytes; SHA-256 `63bf8e97a8861b0b061bd4d30a6f73ef57521a4ee3f1f94eb22a77c9f95478d6`. Original source hash rechecked unchanged. August masters untouched.
- Published `/uploads/ex-f1a702d8c7bc160278fd9698.mp4` with a thumbnail and bilingual setup, execution, coaching focus and muscle text. The supported soleus diagram region renders in both views/languages. Regional COS staging and final-storage hashes match, staging was removed, origin/CDN beginning/end ranges match and thumbnails return 200. Library count stays 810, with 809 unrelated rows unchanged. Zhao Yanjun's October 27 assignment is unchanged and now resolves the library demo. Program progression was reviewed for recommendations only; no assignments or prescriptions were edited.
- Evidence and reproducible scripts: `deliverables/library-audit-yanjun-2026-10-29/`, including before snapshot, 66-file source-hash audit, final mapping, source/candidate contact sheets, probes, recipe, anatomy screenshots, publication and verification receipts. No application deployment or new spending.

## Separate library additions — Strength 2, 2026-10-30

- Four new App Recordings matched the existing entries in Chen Yujie's eight-exercise Strength 2, assignment `AW-181837` for `CL-6796`. No duplicate exercises created. External rotation is seated with the elbow supported on the raised knee; hammer curls alternate arms; seated curls use the hamstring machine; power tower uses forearm/back supports.
- Protect the complete displayed source rectangle at x=0/y=0 in every clip. Preserve external-rotation elbow/knee contact and complete dumbbell arc; both hammer-curl directions and forearm/upper-arm positions; both knee-flexion extremes, rollers, thigh pad and seated support; and power-tower head, forearms, hands, back support, raised knees and lowered shoes. The external-rotation floor-side shoe meets its existing lower source boundary, and the hammer-curl recording omits the lower legs. Keep all available pixels; no new crop, trim, tracking, blur, graphics or audio processing.

| Source / existing library ID | Full displayed frame | Exact delivery filter |
| --- | --- | --- |
| `Dumbbell External Rotations.mp4` / `EX-DUM-2559` | 2802×1476 | `scale=1920:1012:flags=lanczos,setsar=1,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x111214` |
| `Seated Hamstring Curls.mp4` / `EX-SEA-4424` | 568×320 | `scale=1916:1080:flags=lanczos,setsar=1,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x111214` |
| `Dumbbell Hammer Curls.mp4` / `EX-DUM-6707` | 2852×1572 | `scale=1920:1058:flags=lanczos,setsar=1,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x111214` |
| `Power Tower Knee Raises.mp4` / `EX-POW-4168` | 2846×1448 | `scale=1920:976:flags=lanczos,setsar=1,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x111214` |

- Each source and candidate reviewed at 20 full-duration samples plus 20 dense beginning/end samples. H.264/yuv420p, source nominal 30 fps, unchanged AAC packets, complete decode, duration continuity, no subtitle/data streams and fast-start pass. `comment=nx-opt`; original source hashes rechecked unchanged. August masters untouched.
- Deliveries: external rotation `/uploads/ex-597561568172a624e87743a3.mp4`, 2,223,752 bytes, SHA-256 `e79050fdfe42eeb9fc97e080a1f6714d582754585b53835c1ae63912e6c7b204`; hamstring curl `/uploads/ex-b32f0b02ce7fd5876933218b.mp4`, 2,787,257 bytes, SHA-256 `33e0e28399c3b3623deb79af91e6950426b49696473df8cd2fbaeed86b7a3bcb`; hammer curl `/uploads/ex-ec92c34923a6de9300622010.mp4`, 4,533,706 bytes, SHA-256 `8c54dd138098ee6b725d5526b8d1c79866d2a4636b5ce4acfb03bd1b634355f4`; knee raise `/uploads/ex-c083150abf63293838637f2b.mp4`, 1,314,759 bytes, SHA-256 `dcdd56f5ea6b11bec881107fa0bc61c743aea361a2bf5badfff22e078cbde8ba`.
- Added reusable English/Chinese setup/execution to those four library entries and the existing pronated pulldown. Reused reviewed row, shoulder-extension and wrist-curl library instructions for the assignment. All eight session entries now have bilingual instructions. The power-tower entry already specifies `Fields: Time` and two 30-second sets, so its session instructions describe two 30-second holds; generic library cues cover dynamic repetitions and a timed-hold option. All prescription metadata, ordering, labels, original template history, other assignments and the existing published state were preserved through the version-guarded assigned-session API.
- Transfer and final-storage hashes pass; four temporary regional COS staging objects removed. Both workers and public-origin coach/athlete views resolve all eight videos and bilingual instructions. New-video origin/CDN beginning/end byte ranges match and thumbnails return 200. Library count remains 815, with 810 unrelated entries unchanged. No app deployment or new spending.
- Exact commands, protected envelopes, source/candidate contact sheets, technical probes, audio checks, original-content snapshots, guarded scripts and publication/verification receipts: `deliverables/alt-strength2-2026-10-30/`.

## Separate library additions — Yanjun Saturday strength, 2026-10-30

- Yanjun's October 31 `Strength 1` is private draft `AW-74a8601e-3136-4846-93f1-fc8ad2b120e8` for `CL-6785`. Added English/Chinese setup, execution and coaching guidance to all eight exercises, retaining every original prescription, label, ordering and draft state. Session instructions retain the coach's 20/15/10 pogo sets with gradually increasing height while preserving bounce, shoulder external-rotation and scapular-depression cues, two 20-second top pull-up holds, empty-bar push-press warmup with coached 2.5–5 kg increments, and 2.5 kg starting load for landmine 180s. Other assignments and original template history are unchanged.
- Three new App Recordings were reviewed. `Band Assisted Pogos.mp4` matches existing `EX-BAN-4814`; `Single-Arm Landmine Push Press.mp4` matches `EX-LM-USHP-2946`. `Protracted L-Sit Isometric.mp4` demonstrates a straight-arm support hold between two boxes with light foot support, rather than a free unsupported L-sit. Added distinct library entry `EX-PRO-LSIT-261030`, `Protracted L-Sit Isometric` / `肩胛前伸L坐等长保持（双脚支撑）`. Kent explicitly requested library only; the Saturday exercise selection remains eight, and the generic `L-Sit` entry `EX-LSI-8833` is unchanged.
- Protect the complete displayed source frame at x=0/y=0 for each. Preserve pogo floor/foot contacts and flight, hands/band and overhead support; the landmine dip, feet, knee/hip position, pressing hand and full bar/plate arc; both box contacts, elbows, shoulder protraction, hips and feet throughout the support hold and camera movement. The pogo recording initially cuts off the head/hands and omits the anchor; the push-press hand approaches the upper boundary, and its shoe meets the lower boundary. Keep all available source pixels. No crop, trim, tracking, blur, new graphics or audio processing; existing source playback controls remain.

| Source / ID | Full displayed frame | Exact delivery filter | Retained source frame rate |
| --- | --- | --- | --- |
| `Band Assisted Pogos.mp4` / `EX-BAN-4814` | 320×568, display rotation baked | `scale=1080:1916:flags=lanczos,setsar=1,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=0x111214` | 600/19; both source rate fields agree, 309 frames and 9.785 s retained |
| `Single-Arm Landmine Push Press.mp4` / `EX-LM-USHP-2946` | 2816×1444 | `scale=1920:984:flags=lanczos,setsar=1,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x111214` | 30/1 |
| `Protracted L-Sit Isometric.mp4` / `EX-PRO-LSIT-261030` | 568×320 | `scale=1916:1080:flags=lanczos,setsar=1,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x111214` | 30/1 |

- Every source and candidate reviewed at 20 full-duration samples plus 20 dense beginning/end samples. Complete decode, H.264/yuv420p, copied AAC packet hashes, duration continuity, no subtitle/data streams, source frame rate and fast-start pass; `comment=nx-opt`. Original sources rehashed unchanged, August masters untouched. Pogo video/container duration stays 9.785 s; push-press container 6.847979→6.900000 s; supported L-sit container 5.633333→5.640998 s.
- Published videos: pogos `/uploads/ex-9ed477955f2b4d6a0231da40.mp4`, 5,414,810 bytes, SHA-256 `d941d563954227f34bbd7b6507867a17cf1ecd495178c7545837ac9c88a74969`; push press `/uploads/ex-a140fa16203a4e05e60b4259.mp4`, 2,013,606 bytes, SHA-256 `926802203b3260197ff3f711793a8e8ea440c447dc514309ce7a7ee5c862ac75`; supported L-sit `/uploads/ex-733ce99cc1b6566e3d96ae8a.mp4`, 3,196,709 bytes, SHA-256 `b02ef72b58f6352a9780277a8534ffdecda8c04bd4a4794d39319f019e6205f9`.
- Completed five bilingual library entries with setup, execution, coaching focus, muscle text and structured anatomy: the three supplied exercises, Barbell Split Squat and Landmine 180s. Reused reviewed box-jump, scapular-pullup and hip-switch cues for the assignment. Reviewed existing split-squat and landmine-180 demos to match technique. Both anatomy views and languages render for all five completed entries; muscle labels and highlights were checked. Session-specific loads, rep progressions and timed pull-up doses are kept in session instructions rather than generic library cues.
- Guarded publication used the real exercise creation API for the new supported L-sit, snapshot-guarded transactions for existing entries, and the version-guarded assigned-session API with `action=draft`. Regional COS transfer and final-storage hashes pass; three staging objects removed. Both API workers and public origin resolve all eight workout videos, bilingual notes and five anatomy sets. Athlete reads of Saturday's draft return 403 with and without coach headers. All three videos return matching origin/CDN beginning/end byte ranges and thumbnails return 200. Final library count 817, with 812 unrelated entries unchanged. No notification, app deployment or new spending.
- Evidence, recipes, original snapshots, protected envelopes, technical probes, full/edge contact sheets, anatomy screenshots, guarded scripts and verification receipts: `deliverables/yanjun-saturday-2026-10-30/`.
