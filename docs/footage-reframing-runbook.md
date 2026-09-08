# Exercise footage reframing runbook

Last verified: 2026-08-19

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
