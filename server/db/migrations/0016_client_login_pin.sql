ALTER TABLE "clients" ADD COLUMN "login_pin" text;--> statement-breakpoint
CREATE UNIQUE INDEX "clients_login_pin_uq" ON "clients" ("login_pin") WHERE "login_pin" IS NOT NULL;