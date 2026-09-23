ALTER TABLE programs ADD COLUMN assignment_only boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE assigned_workouts ADD COLUMN is_draft boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE assigned_tests ADD COLUMN is_draft boolean NOT NULL DEFAULT false;
