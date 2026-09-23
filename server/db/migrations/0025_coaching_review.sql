CREATE TABLE coaching_review_states (
  key text PRIMARY KEY, revision text NOT NULL, status text NOT NULL CHECK (status IN ('open','resolved','snoozed')),
  until bigint, version integer NOT NULL, updated_at bigint NOT NULL, item jsonb NOT NULL, note text NOT NULL DEFAULT ''
);
--> statement-breakpoint
CREATE TABLE coaching_review_history (
  event_id text PRIMARY KEY, key text NOT NULL, revision text NOT NULL, status text NOT NULL CHECK (status IN ('open','resolved','snoozed')),
  until bigint, version integer NOT NULL, updated_at bigint NOT NULL, item jsonb NOT NULL, note text NOT NULL DEFAULT ''
);
--> statement-breakpoint
CREATE INDEX coaching_review_history_key_idx ON coaching_review_history (key);
