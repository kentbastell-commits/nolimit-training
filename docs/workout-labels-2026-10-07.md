# Workout names, blocks and exercise tags

The calendar editor and mobile session builder now show **Edit name** beside the current workout name. English and Chinese names use the existing session save paths; changing the English name clears its old Chinese mirror. Changes remain local until the session is saved using its normal draft or publish action.

**Labels & colours** contains named blocks with editable names, Chinese names and colours; automatic exercise codes with optional overrides; and short bilingual tags and optional colours for individual exercises. An exercise colour overrides its block colour. Auto restores inherited colour or automatic numbering. Adding a block assigns an existing exercise to that new block; exercises can be moved using their Block select. Explicit circuit/superset membership and prescriptions are preserved when editing presentation.

The existing coaching-note metadata remains the persistence format. `Section Name CN`, `Exercise Tag`, `Exercise Tag CN` and `Label Color` are parsed when a session reopens, copied with prescriptions and excluded from coaching-text translation. Workout-detail responses expose these as separate fields and strip the new metadata lines from prose for older clients. Athlete overview/player and save-review views display the labels. The mini-program package is unchanged.

Validation includes database save/reopen, metadata translation exclusion, circuit preservation, automatic numbering reset, colour validation/contrast, desktop/mobile browser save/reopen, and Chinese controls. Evidence is in `deliverables/william-thursday-labels-2026-10-07/` in the main workspace.
