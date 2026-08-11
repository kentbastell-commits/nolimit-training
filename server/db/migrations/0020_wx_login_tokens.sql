CREATE TABLE "wx_login_tokens" (
	"token" text PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'pending',
	"client_code" text,
	"created_at" bigint
);
--> statement-breakpoint
CREATE INDEX "wx_login_tokens_created_idx" ON "wx_login_tokens" USING btree ("created_at");