# NX LIMIT product and launch audit — 11 September 2026

Implementation update: see [the first fix batch and its measured results](./launch-fixes-2026-09-11.md). The findings below describe the original audited state.

**Verdict: I would not approve an unrestricted public launch yet.** The product has a strong coaching feature set and a recognizable visual identity. The remaining problems include a reproducible Chinese-language crash, unreliable retry behavior, incorrect purchased-program scheduling, and a database access pattern that degrades sharply with realistic training history. These require a focused reliability and customer-journey sprint before cosmetic refinement can deliver a five-star experience.

This audit excludes login and security findings, as requested. It assesses the web platform, athlete portal, coaching tools, shared backend, and separate WeChat miniprogram. Company Operations received source/test review; its authenticated live workflows were not exercised.

**Evidence and limits**

| Area | What was actually checked |
|---|---|
| Web version | Local `bd069b9`; live Shanghai server `2af558d`. Their only tracked difference was `CLAUDE.md`, so the application code matched. |
| Miniprogram version | `036bdab` plus the existing uncommitted source/style changes in the workspace. The audit covers that working tree, not a verified published WeChat release. |
| Automated checks | All **799 tests across 83 files passed**, including real local PostgreSQL handler tests. Web forced TypeScript build and production Vite build passed. Miniprogram TypeScript and production WeChat build passed. |
| Web runtime | **32 route/viewport captures**, covering 16 routes at 390 and 1440 CSS pixels, plus deeper calendar, workout, program, profile, store and language-toggle interactions. Native Safari was not tested. |
| Failure probes | Executed the real repository functions against a separate local database. Tested duplicate workout submission, a failure between save stages, program scheduling, assigned test days, concurrent fulfillment, and order-ID collision. |
| Miniprogram logic | Executed the current queue source with mocked device storage/network boundaries. Reproduced queue overwrite and silent storage-write failure. Other miniprogram findings are source-confirmed and require native-device acceptance tests. |
| Traffic | Isolated local HTTP tests with **1,000 synthetic athletes and 240,000 logged sets**. Production received ordinary read-only inspection, not a stress test. |
| Production operations | Read-only SSH inspection: 4 CPU cores, 7.6 GB RAM, two app processes, PostgreSQL settings, nginx, current backups and watchdog output. |

The in-app browser tool failed during connection setup, so web inspection used headless Chromium through the installed Playwright tools. WeChat DevTools automation remained at “preparing” after two attempts; no fresh native miniprogram screenshots or real-device payment, keyboard, background-resume, or video-playback certification is claimed. Earlier screenshots were not treated as current evidence. Production purchases, workout saves and outgoing messages were not performed. Exercise footage was not edited or reframed.

The existing automated suite is useful, but its green result does **not** establish launch readiness: several failures below occur between otherwise individually tested features. React error boundaries also catch failures that do not appear as an uncaught browser `pageerror`; the Chinese crash demonstrates why checking only uncaught exceptions misses product failures.

**The release priorities**

P0 means a core customer route fails outright. P1 means data correctness, delivery, payment recovery or realistic load is sufficiently weak to hold public launch. P2 means an important usability, retention or operational improvement. Evidence labels distinguish a reproduced failure from a source-confirmed defect or a proposed product improvement.

| ID | Priority | Finding | Evidence |
|---|---|---|---|
| 01 | P0 | Switching the public web app to Chinese crashes it | Live and local runtime |
| 02 | P1 | Workout retries duplicate sets; partial saves are not atomic | Real PostgreSQL fault/retry probes |
| 03 | P1 | Cold athlete-history requests scan everybody’s logs and overwhelm a process | Local load test + source |
| 04 | P1 | Random four-digit order IDs eventually make normal checkout fail | Forced collision against real repository |
| 05 | P1 | Purchased programs start a day early in China time | Real PostgreSQL scheduling probe |
| 06 | P1 | Purchased-program test days become ordinary workouts | Real PostgreSQL fulfillment probe |
| 07 | P1 | Concurrent program activation can duplicate a calendar | Controlled concurrent-read interleaving |
| 08 | P1 | Miniprogram queue can discard a new save during an older flush | Current queue source executed with boundary mocks |
| 09 | P1 | Miniprogram can claim an offline save when storage rejected it | Current queue source + caller inspection |
| 10 | P1 | Coaching intake can fail while the UI reports completion | Both clients’ source |
| 11 | P1 | Native-payment checkout still asks customers to say they already paid | Live checkout + source |
| 12 | P1 | A coached athlete buying a digital product loses coached UI locally | Miniprogram source |
| 13 | P1 | Training truth differs between clients; completed mini workouts overstate completion | Both clients’ source |
| 14 | P2 | Customer order recovery and owned-program management are incomplete | Route/state review + web runtime |
| 15 | P2 | Bundle descriptions and scheduling do not express a consistent product | Live catalog + both clients’ source |
| 16 | P2 | Miniprogram inbox mistakes network failure for an empty inbox | Source |
| 17 | P2 | Wellness reminders remain disabled | Source |
| 18 | P2 | Checkout and several mobile surfaces need a usability/accessibility pass | Runtime measurements + keyboard check |
| 19 | P2 | Monitoring and restart behavior do not establish resilience under failure | Production configuration + source |
| 20 | P2 | The homepage/progress model needs clearer priorities and an explicit active plan | Runtime + miniprogram source |

**01 — Chinese-language switching crashes the public web app**

Open the landing page in a fresh browser, then press the EN/中文 language control. It renders “Something went wrong” instead of the Chinese page. Navigating to the store with that preference also produced the fallback. The same interaction failed in the freshly built local production app. The console reports React error 185, which React documents as a [maximum-update-depth error](https://react.dev/errors/185).

The opposing language synchronization effects in [App.tsx](C:/Users/kentb/nolimit-training/src/App.tsx:482) are the primary suspect: one updates global language from `storeLang`, while another updates `storeLang` from global language. The crash is confirmed; the exact correction should be verified with the development build. This is the first fix for a China-first launch.

Acceptance: switch EN → 中文 → EN repeatedly on landing and store; reload each language; follow landing → store → coaching → back; enter from a stored Chinese preference. Assert the actual page remains visible and no error boundary appears. Capture console errors as well as uncaught exceptions. [Screenshot](C:/Users/kentb/nolimit-training/deliverables/audit-2026-09-11/local-zh-crash.png), [console evidence](C:/Users/kentb/nolimit-training/deliverables/audit-2026-09-11/zh-crash.log).

**02 — A workout save is neither atomic nor safe to retry**

Submitting the same one-set payload twice succeeded twice. The database contained two sets and 1,000 kg of calculated reps × weight instead of one set and 500 kg. Injecting a failure while updating the assigned workout left a log row committed but the workout still “Scheduled”; retrying then produced another row. This corrupts volume, history and any downstream interpretation of training.

[workoutLogs.ts](C:/Users/kentb/nolimit-training/server/db/pg/workoutLogs.ts:73) inserts logs, updates completion, and creates exercise results in separate operations. The web [Retry path](C:/Users/kentb/nolimit-training/src/App.tsx:7673) resends the payload. A client-side completion check cannot make concurrent or interrupted writes safe.

Use a stable submission ID, a database uniqueness constraint and one transaction for the core save. Return the previous successful result when the same submission arrives again. Keep translation/notifications outside that transaction. Preserve explicit “saved on this device / syncing / saved to server / needs attention” states; optimistic celebration must not imply server confirmation.

Acceptance: double tap, concurrent submission, response lost after commit, failure at each write stage, reload during sync. Exactly one logical submission must exist, with all core rows committed together. [Probe results](C:/Users/kentb/nolimit-training/deliverables/audit-2026-09-11/save-probes.json).

**03 — Database access scales with everybody’s history, not the requesting athlete**

[getWorkoutHistory](C:/Users/kentb/nolimit-training/server/db/repositories/workoutHistory.ts:18) calls `pg.listAllLogs()` for each uncached client, then filters in JavaScript. [listAllLogs](C:/Users/kentb/nolimit-training/server/db/pg/workoutLogs.ts:18) performs an unrestricted table read. Two different athletes opening uncached history therefore each fetch the entire table. Several other repositories use similar full-table caches, including workouts and exercise results. Every successful workout save broadly invalidates history/result/workout caches, making frequent cold reads a normal operating condition.

The isolated dataset represented 1,000 athletes × 12 sessions × 20 logged sets: 240,000 rows. Each requested athlete had 240 rows, yet a cold request fetched all 240,000.

| Local HTTP scenario | Result |
|---|---|
| One cold athlete-history request | 1.34 seconds; process RSS rose from approximately 169 to 371 MB |
| 100 simultaneous requests for that warmed athlete | p95 256 ms; all HTTP 200 |
| 10 distinct cold athlete histories | approximately 12.3 seconds; one HTTP 500; sampled peak RSS approximately 1,304 MB |
| Repeat 10-cold-client test | all HTTP 200, but slowest responses approximately 14 seconds |
| 100 requests after explicitly warming all ten keys | p95 231 ms; all HTTP 200 |

The intermittent 500’s exact cause was not captured in the first trial; it did not recur in the repeat. The cold-read latency and memory growth did recur. These are local Windows/single-process measurements with other workstation activity, not a supported-user count for the Linux production server. The first “mixed warm” run followed one failed cold request and was not fully warm; its 11.8-second result is not used as the warm comparison above. [Initial results](C:/Users/kentb/nolimit-training/deliverables/audit-2026-09-11/load-results.json), [explicit warm/cold repeat](C:/Users/kentb/nolimit-training/deliverables/audit-2026-09-11/load-recheck.json).

Move athlete, exercise and date filtering into SQL and paginate history. Existing client/date indexes can then help. Aggregate charts in SQL, coalesce simultaneous cache misses, and invalidate only affected athlete data where possible. Pools limit database connections; they do not bound how many rows the application materializes or prevent duplicate cold work. See the [node-postgres pooling guidance](https://node-postgres.com/features/pooling).

The frontend amplifies this: a live landing-page capture requested clients, all workouts and analytics in addition to public programs/coaches/reviews; analytics was requested twice. The athlete home also loaded the full exercise library and several secondary datasets before those tools were opened. Review the startup effects in [App.tsx](C:/Users/kentb/nolimit-training/src/App.tsx:2503). Load public and athlete routes’ actual needs first; defer secondary tools. The entry JavaScript is 575 KB minified/177 KB gzip, plus 302 KB/52 KB gzip of entry CSS, before other chunks. This is a route-loading improvement opportunity, not proof that bundle size alone causes crashes.

Acceptance: repeat the cold/warm test after filtering, then the mixed-user test described below. One athlete’s request should not fetch other athletes’ historical rows.

**04 — Order IDs have only 9,000 possible values**

[makeShortId](C:/Users/kentb/nolimit-training/server/db/pg/fulfillment.ts:326) creates `ORD-1000` through `ORD-9999`. Digital and coaching order inserts do not retry a collision. Forcing the generator to choose an existing synthetic order ID caused the real checkout repository to return HTTP 500. The existing client-code collision check does not protect order IDs.

This becomes ordinary reliability trouble as order count grows. With 1,000 distinct occupied IDs in that range, a uniformly generated next ID has a 1,000/9,000 collision chance; bundles can create multiple orders. Use a database sequence or sufficiently large unique internal ID, with a separate friendly display reference.

Acceptance: the collision probe succeeds through safe regeneration or a different ID strategy, and concurrent checkout does not fail or create duplicate logical orders. [Evidence](C:/Users/kentb/nolimit-training/deliverables/audit-2026-09-11/order-id-probe.json).

**05–07 — Program delivery needs one consistent scheduling and fulfillment engine**

**Wrong start date:** choosing Monday, 14 September 2026 produced Sunday, 13 September for the first workout under `Asia/Shanghai`. [addDays](C:/Users/kentb/nolimit-training/server/db/pg/fulfillment.ts:47) constructs local midnight then formats it through UTC `toISOString()`. Production was verified to run in `Asia/Shanghai`. Use the established China-date helpers end to end, including access windows and dashboard date comparisons.

**Test days lost:** a template containing one strength session and one test day produced two `assigned_workouts` and **zero `assigned_tests`**. The auto-load session map [drops `testTemplateId`](C:/Users/kentb/nolimit-training/server/db/pg/fulfillment.ts:176), even though the coach assignment path supports that distinction. Test-day preservation is a functional feature, not an optional migration cleanup. The live database currently had no placed test-day template rows; this is a verified latent defect rather than a claim that current customers already lost test assignments.

**Concurrent duplication:** when two actual reads both observed the same Pending order before either inserted sessions, both activations reported success and produced four workout rows instead of two. The probe held the real reads at a barrier to make that valid race deterministic; it did not fabricate query results. Sequential retry tests already pass, but do not cover this interleaving.

Use one shared fulfillment path for coaching assignment and digital activation, with explicit calendar rules, test-day support and a transactional claim/lock on the order. Current auto-load also spaces sessions by `(day - 1) × 2`: four/five-day plans and sequential bundles need a deliberate policy rather than a universal every-other-day rule.

Acceptance: exact start dates under China and UTC process timezones; plans with 1–7 sessions/week; mixed tests/workouts; bundled sequential phases versus parallel add-ons; concurrent activation; failure before the fulfillment-status update. Retrying must yield the same calendar. [Scheduling and concurrency results](C:/Users/kentb/nolimit-training/deliverables/audit-2026-09-11/fulfillment-probes.json).

**08–09 — Miniprogram offline saves can lose their place in the queue**

The queue reads a snapshot, awaits network requests, then replaces storage with `remaining`. In a deterministic probe, workout A was flushing when B was enqueued. Before completion the queue contained A and B; after A completed it contained nothing. B had been overwritten. The implementation also has no shared in-flight flush guard. See [saveQueue.ts](C:/Users/kentb/nolimit-miniprogram/src/services/saveQueue.ts:72).

When device storage threw, `enqueueSave` returned normally and the queue remained empty. The [workout caller](C:/Users/kentb/nolimit-miniprogram/src/pages/workout/index.tsx:1183) nevertheless sets queued state, displays its offline-save message, and navigates away. A draft may survive, but that does not establish a pending upload. Drafts expire after 48 hours while queued submissions expire after seven days, so retained-draft comments are not a durable recovery guarantee.

Serialize flushing, acknowledge/remove only the submitted operation IDs from the latest queue, and return an explicit persistence result. Retain unresolved operations until acknowledged or explicitly discarded. Expose pending/failed saves on Home and Calendar; flush on a suitable app foreground/network-recovery event without blocking navigation behind a serial queue.

Acceptance: enqueue during flush; two flush callers; storage full; restart; response lost after commit; seven-day absence; retryable 5xx versus permanent rejection. No “saved” claim without a durable copy and a visible recovery path. [Queue evidence](C:/Users/kentb/nolimit-training/deliverables/audit-2026-09-11/mini-queue-probes.json).

**10 — Failed intake can look completed**

The web coaching flow’s [finish function](C:/Users/kentb/nolimit-training/src/CoachingFlowPage.tsx:212) does not check the HTTP response, swallows network errors and always advances to Done. The [miniprogram coaching intake](C:/Users/kentb/nolimit-miniprogram/src/pages/store/coaching/index.tsx:118) likewise advances in `finally` after a failure. Optional questions do not justify silently discarding answers the customer chose to submit.

Keep a draft, distinguish “skip questionnaire” from “submit,” and show a retry when submission fails. Payment/order success can remain acknowledged while the intake is explicitly pending. Acceptance: reject the intake request after entering answers; the UI must retain them and must not label their submission complete.

**11 — Live checkout gives contradictory payment instructions**

With WeChat Pay enabled, checkout explains “Submit — a WeChat Pay QR appears.” Its action still says **“I’ve paid — submit my order”**, with a hint saying tapping confirms payment and a coach must verify the reference. These describe two different payment workflows on the same screen. See [StorePage.tsx](C:/Users/kentb/nolimit-training/src/StorePage.tsx:1873) and [captured checkout state](C:/Users/kentb/nolimit-training/deliverables/audit-2026-09-11/checkout-ux.json).

Use “Continue to WeChat Pay” before native payment; “I’ve transferred payment” only for the manual-transfer fallback. Display backend-confirmed payment separately from a successful native payment-sheet callback. In the miniprogram, `payNow` currently sets local `paid` immediately after `requestPayment`; it has no status-confirmation loop equivalent to the web QR path. Its error catch also labels all payment failures as cancellation. Coaching checkout on both clients still uses the static/manual QR workflow, unlike digital checkout.

Acceptance: successful native payment, user cancellation, creation failure, delayed notification, manual transfer and return after closing WeChat all show truthful, distinct states. This audit did not initiate a real payment.

**12–13 — Existing-customer and training-record parity need correction**

**Coached customer buys a digital product:** the miniprogram [purchase success branch](C:/Users/kentb/nolimit-miniprogram/src/pages/store/program/index.tsx:289) unconditionally stores `Digital Program` as the local client type. The server retains the existing customer’s coached type. App/profile refresh only repairs type when the stored value is missing, so this nonempty wrong value persists and hides wellness/workload/coaching UI. Set type from the authoritative returned/refetched profile, and always reconcile entitlement changes. Test an existing coached athlete buying an add-on and returning Home.

**Same logging gesture yields different data:** checking a strength set with blank actual reps causes the web [save path](C:/Users/kentb/nolimit-training/src/App.tsx:7764) to substitute prescribed reps. The miniprogram [save mapper](C:/Users/kentb/nolimit-miniprogram/src/pages/workout/index.tsx:1107) leaves them unspecified. Both show hints that can look like entered values. Decide one explicit logging contract and apply it to both clients; do not silently infer performance in one and omit it in the other. Test weight-only entry, tick-only completion, reps/time/distance, unilateral sets, skips and swaps against the resulting database records.

**Completed miniprogram workouts do not reconstruct the submitted set record:** they rebuild current prescription rows, skip draft restoration and use `alreadyDone ? totalSets : doneSets` for progress. A session deliberately finished with skipped sets will appear fully completed, with disabled blank actual fields instead of the historical submission. See [loading](C:/Users/kentb/nolimit-miniprogram/src/pages/workout/index.tsx:489) and [progress](C:/Users/kentb/nolimit-miniprogram/src/pages/workout/index.tsx:810). Load the saved submission by assigned workout and preserve completed/skipped sets, actual values and swaps. A coach editing a prescription later must not rewrite what an athlete sees as their past performance.

**14–17 — Product gaps that will generate avoidable support requests**

| Gap | Current behavior | Recommended launch behavior |
|---|---|---|
| Recover an unfinished purchase | Miniprogram checkout keeps `orderId`/payment state in component state. Its route list has no customer Orders screen. Web checkout also keeps its active order in React state. | An order history/status view with Resume payment, payment confirmation, program access and Contact support. Restore an existing pending order after interruption. |
| Manage owned programs in the mini | Profile has one `purchasedProgramId`; “My program” opens the store product page. The web has a real multi-program library and restart/scheduling tools. | A purchased-program library that clearly separates Owned, Active, Not started, Completed and Expired. Do not send an owner back into a purchase CTA as the primary management route. |
| Understand a bundle | The live “Climbing Season 1 – Complete (1–4)” category row displayed **“1 weeks - 1x/week”**. Web `formatDuration` uses the wrapper’s metadata; mini `displayDurationWeeks` sums members. Fulfillment loops pending programs using the same start date. | One bundle definition shared by catalog and delivery: included phases, total duration, expected weekly load, sequential/parallel scheduling, access duration and price. Validate it before publishing. |
| Know whether the inbox loaded | Mini inbox catches each of its three source failures as an empty list, then displays the ordinary empty state even if all three fail. | Preserve available messages, identify partial failure, and show Retry when nothing loaded. [Source](C:/Users/kentb/nolimit-miniprogram/src/pages/inbox/index.tsx:48). |
| Receive wellness reminders | `WELLNESS_TEMPLATE_ID` remains empty; requesting a reminder returns immediately. | Configure and verify reminders if they are part of the promised coaching service. Otherwise describe them as unavailable. This is a retention gap, not a core training blocker. [Source](C:/Users/kentb/nolimit-miniprogram/src/services/wxSubscribe.ts:13). |

These gaps matter more to a five-star launch than adding more graphs, badges or training tools. A customer should always know what they own, what to do next, what was saved and how to recover.

**18–20 — Visual quality, usability and operational finish**

The strongest visual surfaces are the coach roster, athlete calendar and focused workout flow. The restrained dark/gold treatment has a clear identity. The interface should be refined around those strengths.

| Surface | Observed issue / product judgment | Change |
|---|---|---|
| Mobile landing | At a 390 px viewport, the right edge of the navigation CTA reached 397 px, creating horizontal overflow. | Make logo/actions adapt at 320–430 px. Keep all navigation inside the viewport. |
| Mobile checkout | Approximately the top 290 px are a large brand panel. On the 844 px capture, the first form field only begins near the bottom. The direct product CTA lands on “Step 3 of 3.” | Use a compact order header, visible total, clear Checkout title and immediate customer fields. Keep the next action reachable above the keyboard. [Capture](C:/Users/kentb/nolimit-training/deliverables/audit-2026-09-11/ux-checkout-en.png). |
| Checkout keyboard access | No dialog semantics were present. Focus remained on body on opening; tabbing eventually reached underlying Programs/Coaching links while the overlay remained open. | Add an accessible dialog label, initial focus, contained keyboard navigation, Escape handling and focus restoration. [Keyboard trace](C:/Users/kentb/nolimit-training/deliverables/audit-2026-09-11/checkout-keyboard.json). |
| Workout introduction | The “Got it” control is a thin native-looking button inside an otherwise styled modal. Help still claims reps are prefilled while current actual inputs start blank. | Match the product’s action styling and explain the final logging contract from issue 13. [Capture](C:/Users/kentb/nolimit-training/deliverables/audit-2026-09-11/flow-workout-logging.png). |
| Coach mobile program lists | Many repeated eye/edit/copy/delete actions compete with Open. | Keep Open primary; group secondary actions in one clearly labeled menu. Preserve clear confirmation/undo behavior for destructive actions. |
| Small text and controls | Some coach filter controls measured 29–32 px high. Pale secondary labels and small gold captions deserve a measured contrast pass. | Use a comfortable ~44 px touch target as a product target, with exceptions for genuinely secondary desktop controls. Do not label every sub-44px element a standards failure. |
| Athlete home | On the reviewed coached account, a large wellness panel, secondary tabs, coach reply and Jump Lab precede the next session. | Make Today’s session and its readiness state the first coherent task. Keep the check-in obvious but compact; prioritize unread coach feedback; move optional tools lower. This is a design recommendation to validate with athletes. |
| Miniprogram progress | The “active” progress program is chosen by whichever program has the most assigned workouts, including historical ones. | Store/select an explicit active program. A completed long plan should not displace a newly started shorter plan. [Source](C:/Users/kentb/nolimit-miniprogram/src/pages/home/index.tsx:136). |
| Language continuity | Public marketing/intake, the coaching flow and client preferences use separate state conventions; coaching starts with `useState("en")`. The crash fallback is English only. | Preserve the chosen language through the whole journey, including failures and payment recovery. For first use in China, choose the initial language deliberately from the app/device context. |

Use measured text contrast of at least 4.5:1 for normal text and 3:1 for large text where applicable, following [W3C contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). The [WCAG 2.2 minimum-target guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) has exceptions and a 24 CSS-pixel minimum/spacing model; a 44 px touch goal is a usability recommendation here, not a claim about that minimum. A formal accessibility audit was not run. The initial image-completion scan also included lazy-loaded images, so it was not used to assert broken-media defects.

Production is not presently short of RAM: the snapshot showed approximately 6.4 GB available, 27 GB disk free, and app processes around 161/174 MB. Both were up for roughly 24 hours. Historical restart counters were not treated as proof of crashes; they also include deployments. Current watchdog lines were healthy. Backups existed through 11 September; their existence does not prove a current restore succeeds.

The remaining resilience gap is architectural/operational. Both app processes and the database are on one host. The pool is capped at 20 per production process, with PostgreSQL `max_connections=100`, but `statement_timeout=0`; there is no SQL execution deadline in the pool setup. The Express server has no graceful shutdown/drain handler. Two app processes help with an individual process failure but do not guarantee that an interrupted save finishes or that a host failure is survivable. The watchdog primarily checks `/`, cached `/api/programs`, and one named PM2 app; it does not establish the health of both workers or a fresh database read/write path. [Server](C:/Users/kentb/nolimit-training/server/index.ts:398), [pool](C:/Users/kentb/nolimit-training/server/db/client.ts:9), [watchdog](C:/Users/kentb/nolimit-training/scripts/healthCheck.mjs:241).

Add per-worker liveness/readiness, bounded database/request time, request latency and error-rate metrics, event-loop/memory/pool-wait monitoring, and graceful connection draining before restart. Include payment-confirmed-but-not-fulfilled and old pending workout saves in operational alerts. Rehearse off-host restore and rollback. More RAM alone will not fix the unrestricted history reads or duplicated writes.

**Feature coverage and parity**

| Customer/operator job | Web | Miniprogram | Audit judgment |
|---|---|---|---|
| Discover programs/coaching | Rich landing, catalog, program details and sample preview | Native store/category/list/detail and sharing | Good breadth; Chinese crash, bundle metadata and continuity need attention |
| Buy a digital program/add-ons | Native/QR payment panel plus manual fallback | Native payment sheet plus manual fallback | Needs truthful payment states, recovery and existing-customer regression tests |
| Buy coaching | Multi-step qualifier/payment/intake | Term/form/payment/intake | Intakes must not disappear; manual payment operation needs clear timing/support |
| Receive a program | Auto-load plus portal scheduler | Onboarding/start-date activation | Shared fulfillment defects are release blockers |
| Train and log | Focus player, timers, swaps, history, uploads | Native player, local drafts, cached prescriptions, queue, uploads | Strong feature set; save correctness and completed-history fidelity are blockers |
| Reschedule/manage training | Calendar and per-program scheduling/restart | Calendar move/replan | Native physical interaction still needs device QA; one shared scheduling policy required |
| Review progress | Records, metrics, workload, charts, Jump Lab | History, Numbers, workload | Explicit active plan and logging parity required; Jump Lab being web-only is a reasonable deliberate scope choice |
| Talk to coach | Feedback, check-in replies, messages/video review | Inbox, messages, video feedback | Fix false-empty inbox; clarify acknowledgement versus actual coach response |
| Manage owned purchases | Multi-program library | One profile link plus current calendar | Mini ownership/order-management gap |
| Coach roster/programming | Clients, teams, builder, exercises, tests, assignments | Athlete-oriented; no coach console expected | Broad web capability; simplify mobile controls and verify large rosters |
| Review/coaching operations | Review queue, wellness, submissions, orders/revenue | Customer-facing endpoints shared | Unit tests pass; production write journeys were not exercised |
| Company Operations | Feishu-backed modules, dashboard/action/error tests | Not applicable | Source and automated coverage only; authenticated live UI and external dependency outage testing remain open |

**The path to a five-star launch**

1. **Make core results correct.** Fix 01–13, starting with Chinese rendering, transactional/idempotent saves, SQL filtering and fulfillment. Bring these changes together with tests of the actual composed user journeys.
2. **Complete the recovery experience.** Give customers an order/resume-payment view, an owned-program library in the mini, a visible pending-save state, retained intake drafts and useful failure messages. A temporary network problem should require no detective work from the athlete.
3. **Apply one focused design pass.** Compact mobile checkout, make Today’s training the clear primary task, align words/units/payment states between platforms, and check keyboard, touch, contrast and language continuity. Validate with a new digital buyer, a coached athlete and a coach using real phones.
4. **Run a release rehearsal against representative infrastructure.** Restore a fresh synthetic dataset, run mixed reads/writes, interrupt connections and restart one worker during activity. Record measured results before widening access.

The launch traffic assumption is **1,000 registered athletes and bursts of 100 simultaneously active users**, pending a different business target. A registered-user count alone is not a capacity metric; actual request mix, accumulated history, media transfer and cache churn determine load.

| Required release exercise | Suggested acceptance target — to agree and then measure |
|---|---|
| 100 active-user mixed workload for 30 minutes, with 1,000 athletes and at least 240,000 logs | No process crash or data loss; no unbounded memory/pool queue growth; API 5xx below 0.1% and no failed business operations left unrecovered |
| Cache invalidation during that run | Include frequent workout saves and different athletes opening history. Target ordinary API p95 under 1 second and critical-save p95 under 1.5 seconds; tune targets against the real network separately |
| Short burst to 2× expected concurrency | Bounded degradation/retry, not blank screens or duplicate records |
| Phone purchase → payment confirmation → intake → first workout | Correct price, ownership, exact dates, assignments and status in both clients; interrupted purchase can resume |
| Offline workout/reconnect/app restart | One submission, correct actual values, no silent queue loss, clear persistent pending state |
| Worker restart during activity | In-flight writes finish or safely retry; the sibling remains usable; no duplicate fulfillment |
| Backup restore / rollback | Restore onto an isolated target and verify counts plus a usable athlete journey; define acceptable recovery time/data loss |
| Real-device visual and interaction pass | iPhone Safari, Android Chrome and WeChat iOS/Android; small/large phones, keyboard open, larger text, Chinese/English, background/resume, weak connection, video and payment handoff |
| Browser runtime regression checks | Fail on error-boundary UI and console runtime errors, not only uncaught `pageerror`; include language changes and recovered failures |

The local load probe establishes a defect worth fixing, not a production capacity guarantee. Native payment settlement, actual WeChat device behavior, authenticated Company Operations, full media playback, long-duration soak, worker-failure rehearsal and backup restore remain explicit acceptance gaps.

**Evidence files**

The [audit directory](C:/Users/kentb/nolimit-training/deliverables/audit-2026-09-11) contains the build/test logs, 32 route captures, deeper flow captures, browser state/network measurements, and executable reproduction scripts. The scripts use a separate local database named `nolimit_launch_audit_20260911` with synthetic data. They do not modify the product source. The README in that directory describes safe reruns and which results are authoritative.
