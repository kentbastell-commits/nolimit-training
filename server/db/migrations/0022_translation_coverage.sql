ALTER TABLE "coaches" ADD COLUMN IF NOT EXISTS "bio_cn" text;
--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN IF NOT EXISTS "equipment_cn" text;
--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN IF NOT EXISTS "movement_pattern_cn" text;
--> statement-breakpoint
ALTER TABLE "workout_templates" ADD COLUMN IF NOT EXISTS "session_goal_cn" text;
--> statement-breakpoint
ALTER TABLE "workout_templates" ADD COLUMN IF NOT EXISTS "session_notes_cn" text;
--> statement-breakpoint
ALTER TABLE "assigned_workouts" ADD COLUMN IF NOT EXISTS "session_goal_cn" text;
--> statement-breakpoint
ALTER TABLE "form_questions" ADD COLUMN IF NOT EXISTS "options_cn" text;
--> statement-breakpoint
ALTER TABLE "check_ins" ADD COLUMN IF NOT EXISTS "nutrition_notes_en" text;
--> statement-breakpoint
ALTER TABLE "check_ins" ADD COLUMN IF NOT EXISTS "training_notes_en" text;
--> statement-breakpoint
ALTER TABLE "check_ins" ADD COLUMN IF NOT EXISTS "wins_en" text;
--> statement-breakpoint
ALTER TABLE "check_ins" ADD COLUMN IF NOT EXISTS "problems_pain_en" text;
--> statement-breakpoint
ALTER TABLE "check_ins" ADD COLUMN IF NOT EXISTS "client_notes_en" text;
--> statement-breakpoint
ALTER TABLE "form_videos" ADD COLUMN IF NOT EXISTS "client_note_en" text;
--> statement-breakpoint
ALTER TABLE "client_messages" ADD COLUMN IF NOT EXISTS "body_en" text;
--> statement-breakpoint
ALTER TABLE "form_responses" ADD COLUMN IF NOT EXISTS "answers_en" text;
--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "quote_cn" text;
--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "quote_en" text;
--> statement-breakpoint
ALTER TABLE "enquiries" ADD COLUMN IF NOT EXISTS "notes_en" text;
