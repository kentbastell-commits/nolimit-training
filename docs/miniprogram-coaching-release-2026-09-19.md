# Coaching journey release — 19 September 2026

This implements the first batch from [the experience review](miniprogram-experience-review-2026-09-19.md). The mini program now prioritizes current coaching clients and qualified enquiries.

- Coached navigation is Today / Training / Coach / Me. Digital-only clients see Support. New prospects see an online coaching introduction and enquiry, with in-person/team services secondary.
- Confirmed coaching payments upgrade an existing prospect/digital account without replacing its training history or purchased-program reference. Coach-verified and WeChat-confirmed payments share one transaction. Concurrent confirmations cannot duplicate intake. Resaving an old paid order cannot reactivate a paused client.
- New online clients receive a dedicated bilingual coaching intake about sport, goals, experience, schedule and equipment. Existing active coached clients are not restarted. In-person orders do not receive the online questionnaire. No bulk intake was assigned to existing production clients.
- Today uses server records to distinguish payment awaiting confirmation, intake required, intake received/plan preparation, no plan scheduled, active training and no upcoming sessions. Required intake opens its exact assigned form. Refresh errors retain previously loaded training and expose retry.
- Coach groups messages, training feedback and the assigned coach's contact QR. The placeholder recommendation card is gone. Me groups training records and assessments, keeps referrals compact, and changes language without leaving the screen.
- Chinese-only training names/instructions remain readable in English mode, and English-only content remains readable in Chinese mode. Existing workout drafts and the save queue retain their behavior.
- Online enquiries use the existing enquiry queue, with the service recorded in the enquiry text. The coach interface labels it Training enquiries. Existing public mini builds remain compatible with the additive profile response.

## Verification

- Web/server: forced TypeScript build and production build passed. Full Vitest run: **887 tests passed**, including 8 database tests for the coaching handoff. Machine-readable result: `deliverables/mini-ux-2026-09-19/web-tests.json`.
- Mini program: TypeScript and production build passed. Assessment, save/reliability and coaching-journey scripts: **19 tests passed**.
- Native simulator walkthrough and upload receipts are recorded below when complete. These do not replace real-device checks on iOS/Android or an actual payment rehearsal.

## Deliberate remaining work

This batch does not add the full service/payment recovery page, renewal management, a multi-program ownership library, exact source-item feedback links, reliable unread counts, kg/lb conversion or booking. Those remain the second and third batches of the review. Digital products retain their existing delivery paths but are no longer the main acquisition destination. Do not describe the entire acceptance matrix as complete or the development upload as publicly released.

## Release status

Server and mini release references will be recorded after verification. The latest pre-release server baseline is `8f6eb61`, including Claude's corrected WeChat contact QR. Mini baseline is `ed16a3b`.
