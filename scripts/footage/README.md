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

## Credentials

`COS_SECRET_ID` / `COS_SECRET_KEY` live in `.env.local` (git-ignored), installed
by `scripts/install-cos-key.ps1`. The CAM sub-user holds **QcloudCOSFullAccess
only** — never account-wide `QCloudResourceFullAccess`.

Bucket naming uses the **APPID** (`1454208796`), not the account UIN that the
COS list-buckets API returns as `<Owner><ID>` — a bucket name built from the
UIN returns `AccessDenied`, which looks exactly like a permissions problem.
