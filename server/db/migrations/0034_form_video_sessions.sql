ALTER TABLE form_videos ADD COLUMN IF NOT EXISTS assigned_workout_id text;
--> statement-breakpoint
ALTER TABLE form_videos ADD COLUMN IF NOT EXISTS workout_date text;
--> statement-breakpoint
ALTER TABLE form_videos ADD COLUMN IF NOT EXISTS workout_name_cn text;
