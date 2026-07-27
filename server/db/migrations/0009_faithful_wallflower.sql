CREATE TABLE "wx_subscribe_credits" (
	"credit_id" text PRIMARY KEY NOT NULL,
	"client_id" text,
	"template_type" text DEFAULT 'wellness',
	"granted_at" bigint,
	"used_at" bigint
);
--> statement-breakpoint
ALTER TABLE "wx_subscribe_credits" ADD CONSTRAINT "wx_subscribe_credits_client_id_clients_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("client_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "wx_subscribe_credits_client_idx" ON "wx_subscribe_credits" USING btree ("client_id");