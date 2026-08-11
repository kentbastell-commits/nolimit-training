ALTER TABLE "product_orders" ADD COLUMN "wxpay_trade_no" text;--> statement-breakpoint
ALTER TABLE "product_orders" ADD COLUMN "wxpay_transaction_id" text;--> statement-breakpoint
CREATE INDEX "product_orders_wxpay_trade_no_idx" ON "product_orders" USING btree ("wxpay_trade_no");