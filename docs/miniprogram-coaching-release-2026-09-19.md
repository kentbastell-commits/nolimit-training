# Coaching journey release — 19 September 2026

This implements the first batch from [the experience review](miniprogram-experience-review-2026-09-19.md). The mini program now prioritizes current coaching clients and qualified enquiries.

- Coached navigation is Today / Training / Coach / Me. Digital-only clients see Support. New prospects see an online coaching introduction and enquiry, with in-person/team services secondary.
- Confirmed coaching payments upgrade an existing prospect/digital account without replacing its training history or purchased-program reference. Coach-verified and WeChat-confirmed payments share one transaction. Concurrent confirmations cannot duplicate intake. Resaving an old paid order cannot reactivate a paused client.
- New online clients receive a dedicated bilingual coaching intake about sport, goals, experience, schedule and equipment. Existing active coached clients are not restarted. In-person orders do not receive the online questionnaire. No bulk intake was assigned to existing production clients.
- Today uses server records to distinguish payment awaiting confirmation, intake required, intake received/plan preparation, no plan scheduled, a future first session, active training and no upcoming sessions. Required intake opens its exact assigned form. Refresh errors retain previously loaded training and expose retry.
- Coach groups messages, training feedback and the assigned coach's contact QR. The placeholder recommendation card is gone. Me groups training records and assessments, keeps referrals compact, and changes language without leaving the screen.
- Chinese-only training names/instructions remain readable in English mode, and English-only content remains readable in Chinese mode. Existing workout drafts and the save queue retain their behavior.
- Online enquiries use the existing enquiry queue, with the service recorded in the enquiry text. The coach interface labels it Training enquiries. Existing public mini builds remain compatible with the additive profile response.

## Verification

- Web/server: forced TypeScript build and production build passed. Full Vitest run: **887 tests passed**, including 8 database tests for the coaching handoff. Machine-readable result: `deliverables/mini-ux-2026-09-19/web-tests.json`.
- Mini program: TypeScript and production build passed. Assessment, save/reliability and coaching-journey scripts: **19 tests passed**.
- Native WeChat DevTools: **17 screen checks passed** across English and Chinese, covering Me, required intake and its exact form, Coach, messages, payment awaiting confirmation, plan preparation, no scheduled plan, active training, a future first session, digital support, guest entry and online enquiry. API responses were synthetic; no enquiries, messages, forms or payments were submitted. Simulator storage and language were restored. Result: `deliverables/mini-ux-2026-09-19/native-checks.json`.
- The final scheduled-start check initially saw stale DevTools output. Clearing only the compile cache and recompiling resolved it; the full 17-screen walkthrough then passed against the current build.
- Both production domains returned HTTP 200, and the live profile endpoint included the new journey data. Both PM2 instances were online after one restart each; the two watchdog cron entries remained present. Result: `deliverables/mini-ux-2026-09-19/live-checks.json`.
- These checks do not replace real-device checks on iOS/Android or an actual payment rehearsal.

Representative synthetic-client screenshots: [Me](../deliverables/mini-ux-2026-09-19/next-me-en.png), [intake](../deliverables/mini-ux-2026-09-19/next-intake-en.png), [future first session](../deliverables/mini-ux-2026-09-19/next-scheduled-start-en.png), [Coach](../deliverables/mini-ux-2026-09-19/next-coach-zh.png), and [new enquiry entry](../deliverables/mini-ux-2026-09-19/next-guest-zh.png). Evidence files are local workspace artifacts.

## Deliberate remaining work

This batch does not add the full service/payment recovery page, renewal management, a multi-program ownership library, exact source-item feedback links, reliable unread counts, kg/lb conversion or booking. Those remain the second and third batches of the review. Digital products retain their existing delivery paths but are no longer the main acquisition destination. Do not describe the entire acceptance matrix as complete or the development upload as publicly released.

## Release status

- **Backend/web live:** `0b53ca73cf5c2cda058652aa33ee9b23c88cb185`, deployed to Shanghai and verified through both `trainnolimit.cn` and `trainnolimit.com`. This includes the preceding `8f6eb61` correction to Claude's WeChat contact QR. The additive profile response remains compatible with the currently published mini program.
- **Mini development upload complete:** version **2026.9.19.2**, source `19f46be2991beb9d7213ec60405539a9815f25ed`, based on `ed16a3b`. DevTools returned `√ upload` and exit code 0. Uploaded package: **933,833 bytes (911.9 KB)**.
- The upload used a frozen copy of the verified production build at `deliverables/mini-ux-2026-09-19/weapp-release-2026.9.19.2`, pointing to `https://trainnolimit.cn`. File hashes and source revision are recorded in `mini-release-manifest.json`; CLI evidence is in `mini-upload.log`. The mini repository has no remote configured, so its committed source is also preserved in the verified `mini-source.bundle`.
- **Trial promotion, WeChat review and public release are not complete.** In WeChat Version Management, select **2026.9.19.2** as the trial version, check the coaching and enquiry flows on real phones, then submit the candidate for review. Do not use the separate `qa-mini` fixture copy or its earlier QA preview QR for release.
- The remaining acceptance checks include real payment confirmation and reopening, parent/athlete account recovery, weak-network workout saves and iOS/Android layout. The broader remaining features are listed above and in the original review.
