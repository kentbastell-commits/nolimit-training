# Deployment — 17 September 2026

The web app and shared API are deployed to the Shanghai production server at **trainnolimit.cn**, with **trainnolimit.com** verified through its existing proxy. Application release: `4c5c9f8690861b42cc0e6dd9981efee5b13037a7`. The existing launch gate remains in place.

The release includes the original launch reliability fixes, DeepSeek-first translation coverage, and all ten follow-up assessment/UI fixes. [Changes and regression evidence](tour-fixes-2026-09-17.md).

## Verified

- Fresh local deployment gate: TypeScript, production build and **866 tests across 92 files** passed. [Test results](../deliverables/deploy-2026-09-17/tests.json).
- The same commit built successfully in a separate worktree on the production server before cutover. Existing hashed assets were retained; new assets were copied before publishing HTML entry points.
- Migrations **0021, 0022 and 0023** applied through Drizzle. Verified all **20 added columns** and the workout-history index directly in production, plus migration journal entries.
- Both API processes restarted one at a time, passed their health checks, and retained stable restart counters afterward. Both watchdog cron jobs remain configured.
- Both public domains returned HTTP 200 for the website, form/test templates, scoped assessment responses and workout history. Both rejected an assessment without an assignment with the new HTTP 400 response. The probe wrote no customer data. [Server verification](../deliverables/deploy-2026-09-17/server-verification.json).
- Browser verification passed the mobile storefront and desktop coach review filters without uncaught errors. Chromium used the Shanghai network route because direct access from the local machine timed out. [Browser results](../deliverables/deploy-2026-09-17/live-checks.json).
- No pending legacy assignments matched the intake/onboarding template check while lacking the new intake marker.

The production database backup and previous web build are at `/opt/backups/pg/release-20260917-2210/`. The database archive passed `pg_restore --list`. Prior application commit: `47cf27b576696108ebde8c16a33bb267eed8d177`. [Deployment log](../deliverables/deploy-2026-09-17/server-deploy.log).

## Miniprogram

Production build **2026.9.17** was uploaded successfully through WeChat DevTools from local commit `41cd2c76cb9d7dd109ea929f6077ec4aff0e2a0e`. TypeScript, the WeChat build and all 14 reliability checks passed. The upload used the frozen verified [build archive](../deliverables/deploy-2026-09-17/miniprogram-2026.9.17.zip), rather than the mutable working build containing later concurrent login changes.

**Upload confirmed:** DevTools returned `√ upload` and exit status 0 for version **2026.9.17**, AppID `wx1b7faa7c68731fdf`, with a package size of **979,237 bytes**. The old DevTools connection stalled at “preparing”; the upload completed after DevTools restarted, using the frozen build in a separate project directory. [Recorded CLI result](../deliverables/deploy-2026-09-17/mini-devtools-upload-result.json).

Correction after checking the original upload-script commit (`8fd0230`, 3 August): CI was explicitly parked on the code-upload allowlist, while DevTools remained the working release route. The CI rejection of **153.231.65.6** did not establish an IP change. No allowlist change was needed for the successful DevTools upload.

The uploaded development version must still be selected as the trial version in WeChat Version Management for trial users to receive it. Trial promotion, WeChat review and public release have not been confirmed.

## Existing translations

The new translation fields are live. The bounded maintenance job completed successfully using the deployed DeepSeek-first/Tencent-fallback implementation, preserving originals and existing translated copy. It filled **3,059 fields across 2,032 records**, with **zero unavailable translations**. A fresh read-only inventory across all 19 content areas found **zero rows with missing mirrors**.

Job: `nolimit-translation-fill-20260917.service` finished with exit status 0. [Backfill results](../deliverables/deploy-2026-09-17/translation-backfill.log), [final inventory](../deliverables/deploy-2026-09-17/translation-final-inventory.jsonl). Coverage verification does not replace native-speaker editorial review of every generated sentence.

Native WeChat device acceptance and a sustained production-scale load test remain separate launch checks. This deployment does not establish a supported concurrent-user capacity.

Learnings filed in the repository deployment skill: check the actual previous successful method before changing upload paths; CI rejection does not prove an IP change. Distinguish upload success from WeChat public release.
