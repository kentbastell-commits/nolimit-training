# Mini program circuit player fix — 19 September 2026

The mini program displayed circuit links in the workout overview, but its logging screen still opened one exercise with all its sets. The saved links were correct. A read-only inspection confirmed the reported pair, Standing Calf Raise and Pogos, was assigned as a two-round circuit with 60-second and 120-second rests. No production training records were changed.

The logging screen now opens the entire linked group, showing one set of each exercise for the current round. Next round repeats the group; after its final round, Next exercise moves beyond the group. Entering through either member opens the same circuit. Supersets use the same grouping behavior. Only adjacent members in the same section and explicit group are linked, so reused labels do not merge unrelated work.

Each movement keeps the coach's prescribed rest. Unilateral movements keep both sides in the same round and start rest after both sides are checked. Straight exercises retain their existing set list and rest behavior. The current round is saved in the local draft alongside the existing set keys, entered values and exercise swaps; older drafts remain readable. Existing per-set prescriptions, repeat-previous values and workout submissions retain their data format.

## Verification

- Mini TypeScript and production build passed.
- **27 regression checks passed:** eight circuit/superset checks plus the existing 19 assessment, coaching journey and save/reliability checks.
- Native WeChat walkthrough passed: open the circuit through its second member; show both members in round 1; enter reps/weight; check the separate 60/120-second timers; advance to round 2; close and reopen with values and round preserved; return to round 1; leave the completed round sequence for a straight exercise; return to the circuit; display the round controls in Chinese.
- Six native screenshots and the result are in `deliverables/mini-circuit-2026-09-19/`. [Round 1](../deliverables/mini-circuit-2026-09-19/circuit-round-1-en.png), [resumed round 2](../deliverables/mini-circuit-2026-09-19/circuit-resumed-en.png), [Chinese](../deliverables/mini-circuit-2026-09-19/circuit-round-2-zh.png). These use synthetic IDs and mocked API responses. No real workout was submitted. Simulator storage and language were restored.
- Real-device verification remains necessary. This fix does not add an AMRAP/EMOM clock; existing timed metadata remains visible and does not trigger ordinary prescribed-rest timers.

## Release

**Development version 2026.9.19.3 uploaded successfully**, superseding 2026.9.19.2 and retaining all of its coaching journey changes. Source: `57b22a10c00c83cca544df0dac956928a966d014`. DevTools reported `√ upload`, exit code 0, package size **937,588 bytes (915.6 KB)**.

The frozen production build, file hashes, upload receipt/log, test log and source bundle are under `deliverables/mini-circuit-2026-09-19/`. No backend deployment was needed for this fix.

Select **2026.9.19.3** as the trial version in WeChat Version Management for phone checks, then submit it for review. The development upload is not a public release.
