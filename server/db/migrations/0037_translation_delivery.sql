ALTER TABLE "form_videos" ADD COLUMN IF NOT EXISTS "exercise_name_cn" text;
--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "title_cn" text;
--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "body_cn" text;
