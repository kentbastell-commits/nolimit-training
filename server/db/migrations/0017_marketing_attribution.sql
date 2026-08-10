ALTER TABLE "product_orders" ADD COLUMN "marketing_source" text;--> statement-breakpoint
ALTER TABLE "product_orders" ADD COLUMN "marketing_medium" text;--> statement-breakpoint
ALTER TABLE "product_orders" ADD COLUMN "campaign_code" text;--> statement-breakpoint
ALTER TABLE "product_orders" ADD COLUMN "partner_code" text;--> statement-breakpoint
ALTER TABLE "product_orders" ADD COLUMN "staff_attribution_code" text;--> statement-breakpoint
ALTER TABLE "product_orders" ADD COLUMN "marketing_attribution_code" text;--> statement-breakpoint
CREATE INDEX "product_orders_campaign_code_idx" ON "product_orders" USING btree ("campaign_code");--> statement-breakpoint
CREATE INDEX "product_orders_staff_attribution_idx" ON "product_orders" USING btree ("staff_attribution_code");
