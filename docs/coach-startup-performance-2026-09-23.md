# Coach startup performance — 23 September 2026

The coaching roster competed with review feeds and duplicate reads for the first network connections. The roster component was discovered late, and the splash could continue animating after the working screen was ready. External latency amplified these delays even though the server's own API reads were fast.

The coach entry now preloads the roster alongside authentication and client data. Only those two API reads start before the roster is ready. Background notifications, reviews and activity begin after the splash disappears. Pending activity is labelled as loading; failed activity is labelled unavailable, rather than implying that an athlete has no sessions.

Unused statistics reads and duplicate subscription/review requests are removed. Concurrent roster and review consumers share one assigned-workout request, while later refreshes still read fresh data. The coach splash disappears immediately when authentication, styles, roster code and client loading have settled. Athlete portal splash behavior remains unchanged.

## Controlled comparison

Old production build `014f274` and the new production build used the same read-only data, browser, 390px viewport and real local HTTP server. Network emulation added 600ms latency and limited downloads to 512,000 bytes/second. Each build had two fresh loads and two warm reloads, alternating version order.

| Usable roster | Before, mean | After, mean |
| --- | ---: | ---: |
| Fresh browser | 4,866ms | 3,338ms |
| Warm reload | 1,589ms | 1,489ms |
| Startup API requests, fresh / warm | 18 / 16 | 14 / 12 |

Fresh startup improved about 31% in this controlled sample. Timing ends when the roster is present and the splash is gone. Background completion is measured separately. These are comparative measurements, not a promise of a particular loading time on a Japanese mobile network.

## Verification

- Held the client request: only authentication and clients started.
- Held all secondary feeds: the roster became usable and Yanjun's calendar could be opened.
- Verified one shared workout read, one subscription read, and no unused analytics requests.
- Rejected authentication: the sign-in screen appeared and background queues did not start.
- Unit coverage verifies shared success, failure/retry, isolation, and honest roster loading states.

Release validation and live measurements are recorded in [release checks](../deliverables/coach-loading-2026-09-23/release-checks.json). No production athlete data is changed by the verification. This phase changes browser scheduling, not hosting, network routing, database schema or the mini program.
