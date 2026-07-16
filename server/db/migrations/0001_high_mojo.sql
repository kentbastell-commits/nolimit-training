CREATE TABLE "enquiries" (
	"enquiry_id" text PRIMARY KEY NOT NULL,
	"contact_person" text,
	"contact" text,
	"organization" text,
	"athletes" text,
	"duration" text,
	"notes" text,
	"submitted_date" text,
	"status" text
);
--> statement-breakpoint
CREATE TABLE "form_videos" (
	"video_id" text PRIMARY KEY NOT NULL,
	"client_id" text,
	"client_name" text,
	"exercise_name" text,
	"workout_name" text,
	"video_url" text,
	"client_note" text,
	"submitted_at" bigint,
	"status" text,
	"coach_reply" text,
	"reviewed_at" bigint
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"review_id" text PRIMARY KEY NOT NULL,
	"client_id" text,
	"client_name" text,
	"program_id" text,
	"program_name" text,
	"rating" double precision,
	"quote" text,
	"show_on_store" boolean DEFAULT false,
	"approved" boolean DEFAULT false,
	"submitted_date" bigint
);
--> statement-breakpoint
CREATE TABLE "test_library" (
	"test_id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"name_cn" text,
	"category" text,
	"result_metric" text,
	"result_unit" text,
	"calculation" text,
	"protocol" text,
	"protocol_cn" text,
	"higher_is_better" boolean DEFAULT true,
	"status" text,
	"linked_exercise_id" text
);
--> statement-breakpoint
CREATE TABLE "workload_logs" (
	"workload_log_id" text PRIMARY KEY NOT NULL,
	"client_id" text,
	"date" bigint,
	"tech_am_rpe" double precision,
	"tech_am_min" double precision,
	"tech_pm_rpe" double precision,
	"tech_pm_min" double precision,
	"cardio_rpe" double precision,
	"cardio_min" double precision,
	"notes" text
);
--> statement-breakpoint
ALTER TABLE "assigned_workouts" ADD COLUMN "session_rpe" double precision;--> statement-breakpoint
ALTER TABLE "assigned_workouts" ADD COLUMN "session_duration" double precision;--> statement-breakpoint
ALTER TABLE "assigned_workouts" ADD COLUMN "session_load" double precision;--> statement-breakpoint
ALTER TABLE "assigned_workouts" ADD COLUMN "coach_reviewed" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "check_ins" ADD COLUMN "sleep_hours" double precision;--> statement-breakpoint
ALTER TABLE "check_ins" ADD COLUMN "readiness_score" double precision;--> statement-breakpoint
ALTER TABLE "check_ins" ADD COLUMN "status" text;--> statement-breakpoint
ALTER TABLE "check_ins" ADD COLUMN "nutrition_notes" text;--> statement-breakpoint
ALTER TABLE "check_ins" ADD COLUMN "training_notes" text;--> statement-breakpoint
ALTER TABLE "check_ins" ADD COLUMN "wins" text;--> statement-breakpoint
ALTER TABLE "check_ins" ADD COLUMN "problems_pain" text;--> statement-breakpoint
ALTER TABLE "product_orders" ADD COLUMN "fulfillment_status" text;--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "season" integer;--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "built_for_client" text;--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "built_for_team" text;--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "store_category" text;--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "store_category_cn" text;--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "store_listing_type" text;--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "bundle_program_ids" text;--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "compare_at_price" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "test_templates" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "workout_logs" ADD COLUMN "client_code" text;--> statement-breakpoint
ALTER TABLE "workout_logs" ADD COLUMN "actual_rpe" double precision;--> statement-breakpoint
ALTER TABLE "workout_logs" ADD COLUMN "actual_rir" double precision;--> statement-breakpoint
ALTER TABLE "form_videos" ADD CONSTRAINT "form_videos_client_id_clients_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("client_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_client_id_clients_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("client_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_program_id_programs_program_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("program_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_library" ADD CONSTRAINT "test_library_linked_exercise_id_exercises_exercise_id_fk" FOREIGN KEY ("linked_exercise_id") REFERENCES "public"."exercises"("exercise_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workload_logs" ADD CONSTRAINT "workload_logs_client_id_clients_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("client_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "form_videos_client_idx" ON "form_videos" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "reviews_program_idx" ON "reviews" USING btree ("program_id");--> statement-breakpoint
CREATE INDEX "workload_logs_client_date_idx" ON "workload_logs" USING btree ("client_id","date");