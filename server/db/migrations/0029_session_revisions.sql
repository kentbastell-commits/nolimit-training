CREATE TABLE session_versions (
  id text PRIMARY KEY,
  assigned_workout_id text NOT NULL REFERENCES assigned_workouts(assigned_workout_id) ON DELETE CASCADE,
  created_at bigint NOT NULL,
  kind text NOT NULL,
  snapshot jsonb NOT NULL
);
--> statement-breakpoint
CREATE INDEX session_versions_assignment_idx ON session_versions(assigned_workout_id);
--> statement-breakpoint
CREATE TABLE session_revisions (
  assigned_workout_id text PRIMARY KEY REFERENCES assigned_workouts(assigned_workout_id) ON DELETE CASCADE,
  revision_id text NOT NULL,
  base_version text NOT NULL,
  updated_at bigint NOT NULL,
  workout jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE calendar_operations (
  request_id text PRIMARY KEY,
  fingerprint text NOT NULL,
  result jsonb NOT NULL,
  created_at bigint NOT NULL
);
