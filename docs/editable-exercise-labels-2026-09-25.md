# Editable exercise labels

Exercise labels in the coach builder were read-only because adding, moving or saving exercises recalculated them from section and order. Coaches can now type a label in the exercise editor on mobile and desktop. Automatic numbering remains the default; **Auto** restores it after an override.

- Custom labels persist through section changes, reordering, duplication, saved exercise blocks, local drafts and save/reopen. Labels accept up to six characters and normalize to uppercase.
- Both the mobile library builder and the shared calendar exercise editor expose the same control, with English/Chinese copy and 44px touch targets.
- Section colours and explicit circuit/superset identities remain separate from labels. Accessories retain their relationship to the preceding main exercise in their section even when given another label. Matching labels alone do not create a web-player group.
- `Label: …` remains the displayed value. `Label Mode: Custom` records the override in the existing canonical coaching-note metadata; no database migration is needed. It is excluded from translation input and removed from athlete workout-detail responses so older mini-program clients do not display it as a cue.
- Older saved sessions/drafts without the flag retain automatic behaviour. Draft conflict comparison treats an absent flag and `false` equally.

## Verification

Focused coverage exercises automatic numbering, reorder/section changes, an override equal to the current automatic label, accessory linking, reset, warmup overrides, metadata parsing, save/reopen through the real local Postgres handler, old draft recovery and both mobile builder entry points.

Browser checks at 390px in WebKit and 1440px in Chromium cover editing, changing section, the displayed badge, publishing to an intercepted API fixture, reopening, restoring Auto, Chinese controls and horizontal overflow. Screenshots were visually reviewed. These checks did not edit production athlete programs. The in-app browser bootstrap failed because its tool runtime lacked sandbox metadata, so standalone Playwright was used.

Evidence: `deliverables/editable-labels-2026-09-25/`. Production deployment is recorded separately there. The released WeChat player's existing numeric warmup-badge behaviour is outside this web-builder change; no mini-program package is uploaded.
