-- Coaching aliases are internal; public client reads explicitly omit them.
ALTER TABLE clients ADD COLUMN IF NOT EXISTS coach_alias text;
--> statement-breakpoint
ALTER TABLE clients ADD COLUMN IF NOT EXISTS tag_colors jsonb;
