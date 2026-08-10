-- 0017 was authored with a journal timestamp older than 0016, so Drizzle
-- correctly skipped it on databases that had already applied 0016. Keep this
-- repair idempotent because some fresh or non-production databases may already
-- contain the 0017 columns and indexes.
ALTER TABLE "product_orders" ADD COLUMN IF NOT EXISTS "marketing_source" text;--> statement-breakpoint
ALTER TABLE "product_orders" ADD COLUMN IF NOT EXISTS "marketing_medium" text;--> statement-breakpoint
ALTER TABLE "product_orders" ADD COLUMN IF NOT EXISTS "campaign_code" text;--> statement-breakpoint
ALTER TABLE "product_orders" ADD COLUMN IF NOT EXISTS "partner_code" text;--> statement-breakpoint
ALTER TABLE "product_orders" ADD COLUMN IF NOT EXISTS "staff_attribution_code" text;--> statement-breakpoint
ALTER TABLE "product_orders" ADD COLUMN IF NOT EXISTS "marketing_attribution_code" text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_orders_campaign_code_idx" ON "product_orders" USING btree ("campaign_code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_orders_staff_attribution_idx" ON "product_orders" USING btree ("staff_attribution_code");
