# Athlete sessions: rollout and verification

Kent's access requirement (2026-11-01): administrator/trial users, manually added
accounts, non-paying users and paying users must all retain sign-in access.
Payment/subscription status and how the account was created are not login
eligibility checks. Keep existing logins working while credentials are introduced;
publishing a new mini version alone is not sufficient reason to enable enforcement.
Coach-assigned training remains available under its existing permissions. Paid
product entitlements and coach-console privileges remain separate checks.

Client codes are public identifiers. Sessions are issued only after a coach PIN,
verified WeChat phone/openid, or a coach-signed personal invite. Public checkout
keys authorize one order and use a separate signing purpose from personal pay
links. New public coaching questionnaires stay on their order; typing an existing
athlete's contact details cannot change that athlete's profile.

The API defaults to enforcement (`ATHLETE_SESSION_MODE=required` or omitted).
The old publicly released mini program sends client codes without credentials.
Deploying enforcement before replacing that client would interrupt training.

1. Run the forced TypeScript check, production build and full unit suite. Apply
   migrations 0035 and 0036 through Drizzle and verify their actual tables/columns.
2. For an additive backend/web deployment ahead of the mini release, explicitly
   set `ATHLETE_SESSION_MODE=compat` in production before restarting workers.
   This is a temporary security exception: unauthenticated legacy API calls still
   work, including existing web portal links. The web gate bypasses login only
   when the server explicitly reports compatibility; an offline/unknown check
   never grants access. This stage does not close the systemic access finding.
3. Build the mini program with `NODE_ENV=production`. Confirm compiled requests
   target `https://trainnolimit.cn`, never localhost or the staging twin. Upload
   through the established DevTools CLI route. An upload is a development version,
   not a public release. Trial promotion, WeChat review and public release each
   need their own verification.
   Superseding build 1.0.1101.1 preserves stored legacy identities and existing
   phone/name recovery only while the server explicitly reports compatibility.
   It never turns that lookup into a trusted token or a permanent WeChat binding.
   Use it in place of 1.0.1031.1, which could force unbound legacy accounts back
   to login even with the backend in compatibility mode.
4. Confirm existing athletes have a PIN, a bound WeChat account or a fresh
   coach-issued personal invite. The read-only 2026-10-31 readiness check found
   one athlete with assigned training and neither PIN nor WeChat binding; arrange
   verified enrollment before enforcement, without sending unsolicited messages.
   Confirm continued login for existing administrator/trial, manually added,
   non-paying and paying accounts, including those whose stored identity has no
   WeChat binding. Preserve their saved drafts and queues. After that continuity
   is established and the session-enabled mini is in use, remove `compat`
   and restart workers one at a time. Older installed clients may need to update;
   unbound legacy accounts must sign in with their coach PIN or verified WeChat.
   Offline drafts and queued writes must survive a failed session restoration.
5. Verify code-only reads return 401; PIN login returns a host-only Secure
   HttpOnly SameSite=Lax cookie on HTTPS; the mini receives a bearer credential;
   own-account reads work; foreign IDs return 403/404; logout revokes the session;
   coach preview permits reads and rejects writes. Never exercise real payment
   or notification paths as a smoke test.

Production needs `COACH_ACCESS_KEY` and a stable checkout signing secret.
`CHECKOUT_TOKEN_SECRET` is preferred; the existing `PAY_LINK_SECRET` or
`WXPAY_APIV3_KEY` can supply the fallback. Do not rotate a fallback casually:
already issued checkout links depend on it. Nginx must overwrite X-Real-IP and
forward the correct Host. Never log credentials or put sessions in URLs.

Local integration checks use synthetic accounts in the separate, loopback-only
`nolimit_athlete_sessions_e2e` database. All outbound integration calls are blocked:

```sh
npm run build
npx playwright test --config playwright.session.config.ts
```

The test server owns its fixture database and refuses remote DATABASE_URL hosts.
The ordinary live/read-only Playwright suite does not include these write tests.

Payment history begins with migration 0035's current trade pointers. Mappings
overwritten before that migration cannot be reconstructed from the database.
An unmatched historical receipt still requires manual reconciliation against the
provider's records. Known late attempts settle their original immutable amount
and order membership; a second distinct paid attempt triggers duplicate-payment
review without activating coaching twice.
