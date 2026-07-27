CREATE TABLE "client_messages" (
	"message_id" text PRIMARY KEY NOT NULL,
	"client_id" text,
	"client_name" text,
	"body" text NOT NULL,
	"status" text DEFAULT 'New',
	"coach_reply" text,
	"created_at" bigint,
	"replied_at" bigint
);
--> statement-breakpoint
ALTER TABLE "client_messages" ADD CONSTRAINT "client_messages_client_id_clients_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("client_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "client_messages_client_idx" ON "client_messages" USING btree ("client_id");