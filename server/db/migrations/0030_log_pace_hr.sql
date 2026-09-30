-- Athlete-entered cardio facts (2026-10-01): actual pace and heart rate per
-- logged set, plus session-level average/max HR captured at workout finish
-- alongside session RPE and duration. Pace is stored as seconds per km so
-- readers never re-parse "4:17"; it is derived server-side from actual time
-- and distance whenever the athlete leaves it blank.
ALTER TABLE workout_logs ADD COLUMN actual_pace_sec_km double precision;
--> statement-breakpoint
ALTER TABLE workout_logs ADD COLUMN avg_hr integer;
--> statement-breakpoint
ALTER TABLE workout_logs ADD COLUMN max_hr integer;
--> statement-breakpoint
ALTER TABLE assigned_workouts ADD COLUMN session_avg_hr integer;
--> statement-breakpoint
ALTER TABLE assigned_workouts ADD COLUMN session_max_hr integer;
