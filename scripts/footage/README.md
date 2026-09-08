# Footage workflow — card → archive → proxies

The two-tier setup for Osmo Pocket 3 (or any camera) footage:

| Tier | Where | What goes there | Why |
|---|---|---|---|
| **Archive** | Tencent COS `nxlimit-footage-1454208796` (ap-guangzhou, **private**) | every original MP4 + WAV, forever | cheap (¥0.1/GB/mo), never deleted, not in anyone's way |
| **Working** | Feishu 公司共享资料 → 02 Content | small `_preview.mp4` proxies (and later, the selects/finals) | Yumei browses + previews on her phone, links into the content calendar |

Yumei picks takes from the proxies by filename, then pulls only those originals
from COS. Nobody downloads 50 GB to find 2 GB of usable clips.

## Run after a shoot

```bash
# 1. every original -> COS (resumable; re-run after an interruption)
node --env-file=.env.local scripts/footage/archive-to-cos.mjs

# 2. prove the archive is byte-exact before the card gets formatted
node --env-file=.env.local scripts/footage/verify-archive.mjs

# 3. small previews -> Feishu for review
node --env-file=.env.local scripts/footage/proxies-to-feishu.mjs
```

Edit `SRC` and `CUTOFF` at the top of each script for the card path and date
window. Both uploaders skip what is already uploaded, so re-running is always
safe.

## Endpoint choice: speed vs a real bill

Measured from Thailand, 2 MB test object:

- `...cos.**ap-guangzhou**.myqcloud.com` → **0.03 MB/s** (51 GB ≈ 3 weeks;
  8 MB multipart parts time out entirely)
- `...cos.**accelerate**.myqcloud.com` → **1.9 MB/s single-stream, 25-28 MB/s
  with 8 parallel parts** (51 GB in ~30 min)

COS regional endpoints are domestic infrastructure, effectively unusable from
outside mainland China. Acceleration routes to a nearby edge then over
Tencent's backbone — same bucket, same data, only the hostname differs.

**It is billed per GB.** The first 52 GB archive cost **¥65**, essentially all
of it acceleration (~¥1.25/GB); storage was covered by the free 1 TB package.
So:

- **Inside China → regional** (the script's default). Fast and no per-GB fee.
- **Outside China → `--accelerate`**, and accept the cost, or wait until back
  in China. 52 GB ≈ ¥65.

Enabling acceleration on the bucket is free; only USING the accelerate
hostname bills — so the setting can stay on permanently.

Never "fix" a slow upload by lowering concurrency; check the endpoint first.

## Sorting the iCloud phone library BEFORE downloading (2026-09-08)

iCloud for Windows keeps the whole Photos library at
`C:\Users\kentb\iCloudPhotos\Photos` as cloud-only placeholders (9,273 videos,
1.46 TB, nothing on disk). The Windows shell still returns a real frame
thumbnail plus duration/resolution/date for a placeholder WITHOUT
downloading it, so the review happens first and only the picks get pulled:

```powershell
# 1. thumbnails + manifest for camera clips > 5s (≈1.5s per uncached thumb —
#    run several date shards in parallel, ~85 thumbs/min total)
powershell -ExecutionPolicy Bypass -File scripts/footage/icloud-contact-sheet.ps1 -From 2026-05-01 -To 2026-09-09 -MinSeconds 6 -CameraOnly
# 2. numbered 6x5 contact sheets (+ sheet-NNN.json index→file map)
powershell -ExecutionPolicy Bypass -File scripts/footage/icloud-compose-sheets.ps1 -Dir "C:\Users\kentb\Videos\icloud-review\2026-05-01_2026-09-09" -MinSeconds 6 -CameraOnly
# 3. review: a person (or model) writes sheet-NNN.keep.txt per sheet (kept file names);
#    or open review.html from step 1 and tick clips by hand
# 4. merge every keep list newest-first, then download only those into ONE flat folder,
#    stopping at a 15 GB free-disk floor (re-run to resume; MIN_FREE_GB=n to change)
node scripts/footage/icloud-merge-selection.mjs
node scripts/footage/icloud-fetch-selected.mjs "C:\Users\kentb\Videos\icloud-review\selected-all.txt" --dest C:\Users\kentb\Videos\workout-videos
```

Facts that shaped this: copying a placeholder is the download (the cloud
filter hydrates it; `attrib +U -P` releases the original again so disk is
paid once); iCloud download speed depends entirely on the network route —
0.23 MB/s at home through the Clash tunnel vs. fast at the office — so run
step 4 where iCloud is quick; the full 2021-2026 review kept 1,898 of 6,935
camera clips (510 GB), far more than the laptop's free disk, so the fetch
is newest-first and the rest waits for an external drive or a COS archive
pass (`proxy-phone-videos.mjs` on the folder in batches).

## Checking a clip without downloading it

`ffprobe` reads just the header over a `stream-link.mjs` signed URL — so
resolution/duration/rotation questions about archived footage never need a
download. Found this way 2026-08-17: a whole shoot recorded **3072×3072
square** because the Pocket 3's aspect-ratio setting was on 1:1 (square maxes
at 3K; 16:9 records 4K). The upload pipeline preserves whatever the camera
recorded — check a COS original with ffprobe before suspecting the pipeline.
Pre-shoot camera check: ratio 16:9, 4K, framerate. Square footage crops to
3072×1728 landscape or 9:16 vertical in post, so it's recoverable.

## Reframing the square 2026-08-08 shoot (16:9 + 9:16)

The current approved per-format workflow, output folders, exceptions, and QA
rules are in `docs/footage-reframing-runbook.md`. Read that file before running
the older shared batch command below. In particular, its generic 16:9 crop has
been superseded by `framing-decisions-16x9.mjs` and
`local-render-16x9.mjs`; do not use `edited\16x9` as the final library.

Local pipeline, built 2026-08-17 (Kent-approved framing):

```bash
node --env-file=.env.local scripts/footage/download-originals.mjs   # COS -> C:\Users\kentb\Videos\nolimit-footage (one-time ~¥65 via accelerate)
node scripts/footage/extract-analysis-frames.mjs                    # gridded contact sheets per clip
# ...measure every clip from the sheets -> analysis/measurements.json (headTop, xLeft, xRight as 0..1)
node scripts/footage/batch-crop.mjs                                 # both formats, resumable, GPU
```

Crop rules (generalized from the edits Kent approved; keep unless he re-approves):
16:9 = full width, window top 50px above the clip's highest head position.
9:16 = floor-anchored, 420px headroom, never tighter than 75% of frame height
("too zoomed" feedback), widened to cover lying/floor exercises, person-centered
— center on the PERSON, not the machine, and never trust one sampled frame:
jump clips get airborne allowance, and two clips (RFE split squat, ballistic
back ext) needed remeasuring because the sampled frames caught mirrors/empty
moments. Always end with a contact-sheet review of the OUTPUTS.

Encoder traps (all hit 2026-08-17): the Pocket 3 records 10-bit HEVC, so
`h264_nvenc` fails with a misleading "No capable devices" until you add
`-pix_fmt yuv420p` (hevc_nvenc works without it). Add `-hwaccel cuda` — CPU
decode of 3K 10-bit HEVC is the real bottleneck (~3x speedup; CPU-only x264
was on pace for 8+ hours, GPU did 188 encodes in ~40 min). And NVENC `-cq`
without `-maxrate` balloons long clips to 500MB+ at ~30Mbps — pointless weight
for 1080p delivery; cap at `-maxrate 8M` (the upload endpoint's real limit is
500MB, but 8Mbps keeps pages fast and the media-CDN daily cap unbothered).

## Credentials

`COS_SECRET_ID` / `COS_SECRET_KEY` live in `.env.local` (git-ignored), installed
by `scripts/install-cos-key.ps1`. The CAM sub-user holds **QcloudCOSFullAccess
only** — never account-wide `QCloudResourceFullAccess`.

Bucket naming uses the **APPID** (`1454208796`), not the account UIN that the
COS list-buckets API returns as `<Owner><ID>` — a bucket name built from the
UIN returns `AccessDenied`, which looks exactly like a permissions problem.

## Renaming rule (learned 2026-08-15)

When reviewing proxies in Feishu, KEEP the DJI clip id in the name —
`Barbell RDL__0214.mp4`, not `Barbell RDL.mp4`. Mario's first review pass
dropped the ids, which severed the only link back to the COS originals; the
mapping had to be rebuilt by probing VIDEO DURATIONS on both sides (a proxy
and its original are twin recordings, so durations agree to ~50ms) plus a
global one-to-one assignment to break ties. It worked (94/94 within 48ms),
but it is an hour of recovery for a naming convention.

The COS archive now carries review names in the same form:
`footage/<date>/<Name>__<clipId>.MP4` — the id suffix is what keeps every
future rename reversible.
