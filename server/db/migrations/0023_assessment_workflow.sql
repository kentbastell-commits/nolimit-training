ALTER TABLE assigned_forms ADD COLUMN IF NOT EXISTS is_intake boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE assigned_tests ADD COLUMN IF NOT EXISTS reviewed_at bigint;
--> statement-breakpoint
-- FA- identifiers were created exclusively by the digital checkout intake path.
UPDATE assigned_forms SET is_intake = true WHERE assigned_form_id LIKE 'FA-%';
