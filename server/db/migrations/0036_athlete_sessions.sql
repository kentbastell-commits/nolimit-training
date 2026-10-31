CREATE TABLE IF NOT EXISTS athlete_sessions (
  token_hash text PRIMARY KEY,
  client_id text NOT NULL REFERENCES clients(client_id) ON DELETE CASCADE,
  proof text NOT NULL,
  created_at bigint NOT NULL,
  expires_at bigint NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS athlete_sessions_client_idx ON athlete_sessions(client_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS athlete_sessions_expiry_idx ON athlete_sessions(expires_at);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS athlete_login_limits (
  key text PRIMARY KEY,
  window_start bigint NOT NULL,
  attempts integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE wx_login_tokens ADD COLUMN IF NOT EXISTS proof text;
