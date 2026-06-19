CREATE TABLE "assigned_forms" (
	"assigned_form_id" text PRIMARY KEY NOT NULL,
	"form_id" text,
	"client_id" text,
	"client_code" text,
	"assigned_date" bigint,
	"status" text,
	"completed_at" bigint,
	"product_type" text,
	"intake_assessment" text,
	"review_status" text,
	"reviewed_by" text,
	"reviewed_at" bigint
);
--> statement-breakpoint
CREATE TABLE "assigned_tests" (
	"assigned_test_id" text PRIMARY KEY NOT NULL,
	"test_template_id" text,
	"client_id" text,
	"client_code" text,
	"assigned_date" bigint,
	"options" jsonb,
	"completed_at" bigint
);
--> statement-breakpoint
CREATE TABLE "assigned_workouts" (
	"assigned_workout_id" text PRIMARY KEY NOT NULL,
	"client_id" text,
	"program_id" text,
	"week" integer,
	"day" integer,
	"session_name" text,
	"session_name_cn" text,
	"session_type" text,
	"session_goal" text,
	"intensity" text,
	"estimated_duration" integer,
	"scheduled_date" bigint,
	"completion_status" text,
	"coach_notes" text,
	"coach_notes_cn" text,
	"client_notes" text,
	"client_notes_cn" text
);
--> statement-breakpoint
CREATE TABLE "athlete_metrics" (
	"metric_id" text PRIMARY KEY NOT NULL,
	"client_id" text,
	"client_name" text,
	"source_test_id" text,
	"metric_name" text,
	"metric_type" text,
	"value" double precision,
	"unit" text,
	"valid_from" bigint,
	"valid_until" bigint,
	"source_test_name" text,
	"calculation_method" text,
	"source_type" text,
	"status" text DEFAULT 'Active',
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "check_ins" (
	"checkin_id" text PRIMARY KEY NOT NULL,
	"client_id" text,
	"client_name" text,
	"submitted_date" bigint,
	"body_weight" double precision,
	"sleep_quality" integer,
	"energy" integer,
	"mood" text,
	"stress" integer,
	"soreness" integer,
	"client_notes" text,
	"coach_notes" text,
	"reviewed_date" bigint
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"client_id" text PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"full_name_cn" text,
	"email" text,
	"phone" text,
	"language_preference" text DEFAULT 'en',
	"client_type" text,
	"primary_coach_id" text,
	"secondary_coach_id" text,
	"coach_assigned" text,
	"program_id" text,
	"purchased_program_id" text,
	"package_type" text,
	"package" text,
	"subscription_status" text,
	"intake_status" text,
	"payment_status" text,
	"start_date" bigint,
	"access_start_date" bigint,
	"access_end_date" bigint,
	"source" text,
	"stripe_payment_id" text,
	"last_login" bigint,
	"last_checkin_date" bigint,
	"tags" text[],
	"categories" text[],
	"notes" text,
	"notes_en" text,
	"mas" double precision,
	"hr_max" double precision,
	"resting_hr" double precision,
	"zone_5k_pct" double precision,
	"zone_10k_pct" double precision,
	"zone_threshold_pct" double precision,
	"zone_easy_pct" double precision
);
--> statement-breakpoint
CREATE TABLE "coaches" (
	"coach_id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"role" text,
	"status" text DEFAULT 'Active',
	"bio" text,
	"revenue_share_pct" double precision,
	"created_at" bigint
);
--> statement-breakpoint
CREATE TABLE "exercise_alternates" (
	"alternate_id" text PRIMARY KEY NOT NULL,
	"template_id" text,
	"exercise_id" text,
	"exercise_name" text
);
--> statement-breakpoint
CREATE TABLE "exercise_results" (
	"result_id" text PRIMARY KEY NOT NULL,
	"client_id" text,
	"exercise_id" text,
	"exercise_name" text,
	"date" bigint,
	"best_weight" double precision,
	"best_reps" integer,
	"estimated_1rm" double precision,
	"volume" double precision,
	"source_workout_id" text
);
--> statement-breakpoint
CREATE TABLE "exercises" (
	"exercise_id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"name_cn" text,
	"category" text,
	"category_cn" text,
	"movement_pattern" text,
	"primary_muscles" text,
	"primary_muscles_cn" text,
	"equipment" text[],
	"difficulty" text,
	"training_quality" text,
	"default_sets" integer,
	"default_reps" text,
	"default_rest" text,
	"rpe_target" text,
	"coaching_cues" text,
	"coaching_cues_cn" text,
	"technical_cues" text,
	"technical_cues_cn" text,
	"common_errors" text,
	"common_errors_cn" text,
	"thumbnail_url" text,
	"short_video_url" text,
	"long_video_url" text,
	"default_metric" text,
	"metric_category" text,
	"use_auto_target" boolean,
	"status" text DEFAULT 'Active'
);
--> statement-breakpoint
CREATE TABLE "form_questions" (
	"question_id" text PRIMARY KEY NOT NULL,
	"form_id" text,
	"order_index" integer,
	"label" text,
	"label_cn" text,
	"question_type" text,
	"options" jsonb,
	"required" boolean DEFAULT false,
	"help_text" text,
	"help_text_cn" text
);
--> statement-breakpoint
CREATE TABLE "form_responses" (
	"response_id" text PRIMARY KEY NOT NULL,
	"assigned_form_id" text,
	"form_id" text,
	"client_id" text,
	"submitted_at" bigint,
	"answers" jsonb,
	"client_comment" text,
	"client_comment_en" text
);
--> statement-breakpoint
CREATE TABLE "form_templates" (
	"form_id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"name_cn" text,
	"type" text,
	"description" text,
	"description_cn" text,
	"product_type" text,
	"public_intake_link" text,
	"requires_coach_review" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"notification_id" text PRIMARY KEY NOT NULL,
	"client_id" text,
	"title" text,
	"body" text,
	"type" text,
	"read" boolean DEFAULT false,
	"created_at" bigint
);
--> statement-breakpoint
CREATE TABLE "product_orders" (
	"order_id" text PRIMARY KEY NOT NULL,
	"client_id" text,
	"client_name" text,
	"product_type" text,
	"program_id" text,
	"product_name" text,
	"amount" numeric(10, 2),
	"currency" text,
	"payment_status" text,
	"payment_provider" text,
	"payment_reference" text,
	"purchased_at" bigint,
	"access_start_date" bigint,
	"intake_status" text,
	"assign_coach" text
);
--> statement-breakpoint
CREATE TABLE "programs" (
	"program_id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"name_cn" text,
	"goal" text,
	"goal_cn" text,
	"sport" text,
	"level" text,
	"duration_weeks" integer,
	"phase" text,
	"phase_cn" text,
	"sessions_per_week" integer,
	"coach_id" text,
	"description" text,
	"description_cn" text,
	"status" text DEFAULT 'Active',
	"product_type" text,
	"price" numeric(10, 2),
	"currency" text,
	"public_store_visible" boolean DEFAULT false,
	"purchase_link" text,
	"store_url" text,
	"store_description" text,
	"store_description_cn" text,
	"product_image" text,
	"default_intake_form_id" text,
	"access_length_days" integer,
	"product_status" text,
	"sales_description" text,
	"sales_description_cn" text
);
--> statement-breakpoint
CREATE TABLE "set_prescriptions" (
	"prescription_id" text PRIMARY KEY NOT NULL,
	"template_id" text,
	"set_number" integer,
	"reps" text,
	"load" text,
	"percent" double precision,
	"percent_mas" double precision,
	"intensity_mode" text,
	"intensity_value" text,
	"tempo" text,
	"rest" text
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"subscription_id" text PRIMARY KEY NOT NULL,
	"client_id" text,
	"plan" text,
	"price" numeric(10, 2),
	"currency" text DEFAULT 'CNY',
	"billing_cycle" text,
	"start_date" bigint,
	"next_billing_date" bigint,
	"status" text DEFAULT 'Active',
	"coach" text,
	"auto_renew" boolean DEFAULT false,
	"payment_id" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"team_id" text NOT NULL,
	"client_id" text NOT NULL,
	"position" text
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"team_id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"coach" text,
	"focus" text,
	"notes" text,
	"positions" jsonb,
	"groups" jsonb,
	"created_at" bigint
);
--> statement-breakpoint
CREATE TABLE "test_items" (
	"test_item_id" text PRIMARY KEY NOT NULL,
	"test_template_id" text,
	"order_index" integer,
	"test_name" text,
	"test_name_cn" text,
	"metric_type" text,
	"unit" text,
	"unit_cn" text,
	"instructions" text,
	"instructions_cn" text,
	"creates_metric" boolean,
	"testing_metric_type" text,
	"calculation_method" text,
	"metric_name" text,
	"metric_unit" text,
	"input_unit" text
);
--> statement-breakpoint
CREATE TABLE "test_results" (
	"result_id" text PRIMARY KEY NOT NULL,
	"assigned_test_id" text,
	"test_template_id" text,
	"test_item_id" text,
	"client_id" text,
	"value" text,
	"unit" text,
	"notes" text,
	"notes_en" text,
	"submitted_at" bigint,
	"creates_metric" boolean,
	"metric_created" boolean
);
--> statement-breakpoint
CREATE TABLE "test_templates" (
	"test_template_id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"name_cn" text,
	"description" text,
	"description_cn" text
);
--> statement-breakpoint
CREATE TABLE "workout_logs" (
	"log_id" text PRIMARY KEY NOT NULL,
	"client_id" text,
	"assigned_workout_id" text,
	"exercise_id" text,
	"exercise_name" text,
	"date" bigint,
	"set_number" integer,
	"prescribed_sets" integer,
	"prescribed_reps" text,
	"actual_reps" integer,
	"actual_weight" double precision,
	"weight_unit" text,
	"actual_time" text,
	"time_unit" text,
	"actual_distance" double precision,
	"distance_unit" text,
	"completed" boolean,
	"coach_reviewed" boolean,
	"athlete_notes" text,
	"athlete_notes_en" text,
	"exercise_order" integer,
	"volume" double precision,
	"duration_seconds" integer,
	"load_score" double precision,
	"created_at" bigint
);
--> statement-breakpoint
CREATE TABLE "workout_templates" (
	"template_id" text PRIMARY KEY NOT NULL,
	"program_id" text,
	"week" integer,
	"day" integer,
	"session_name" text,
	"session_name_cn" text,
	"session_type" text,
	"session_goal" text,
	"estimated_duration" integer,
	"intensity" text,
	"is_single_workout" boolean,
	"exercise_id" text,
	"exercise_name" text,
	"exercise_order" integer,
	"sets" integer,
	"reps" text,
	"tempo" text,
	"rest" text,
	"video_url" text,
	"coaching_notes" text,
	"coaching_notes_cn" text,
	"target_source" text,
	"target_metric" text,
	"target_percent" double precision,
	"target_adjustment" double precision,
	"auto_target" boolean,
	"display_target" text,
	"section_name" text,
	"exercise_label" text,
	"group_type" text,
	"group_name" text,
	"tracking_type" text,
	"is_unilateral" boolean,
	"is_accessory" boolean,
	"accessory_parent" text,
	"accessory_color" text,
	"status" text DEFAULT 'Active'
);
--> statement-breakpoint
ALTER TABLE "assigned_forms" ADD CONSTRAINT "assigned_forms_form_id_form_templates_form_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."form_templates"("form_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assigned_forms" ADD CONSTRAINT "assigned_forms_client_id_clients_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("client_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assigned_tests" ADD CONSTRAINT "assigned_tests_test_template_id_test_templates_test_template_id_fk" FOREIGN KEY ("test_template_id") REFERENCES "public"."test_templates"("test_template_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assigned_tests" ADD CONSTRAINT "assigned_tests_client_id_clients_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("client_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assigned_workouts" ADD CONSTRAINT "assigned_workouts_client_id_clients_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("client_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assigned_workouts" ADD CONSTRAINT "assigned_workouts_program_id_programs_program_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("program_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_metrics" ADD CONSTRAINT "athlete_metrics_client_id_clients_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("client_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_client_id_clients_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("client_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_program_id_programs_program_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("program_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_alternates" ADD CONSTRAINT "exercise_alternates_template_id_workout_templates_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."workout_templates"("template_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_alternates" ADD CONSTRAINT "exercise_alternates_exercise_id_exercises_exercise_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("exercise_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_results" ADD CONSTRAINT "exercise_results_client_id_clients_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("client_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_results" ADD CONSTRAINT "exercise_results_exercise_id_exercises_exercise_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("exercise_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_questions" ADD CONSTRAINT "form_questions_form_id_form_templates_form_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."form_templates"("form_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_responses" ADD CONSTRAINT "form_responses_assigned_form_id_assigned_forms_assigned_form_id_fk" FOREIGN KEY ("assigned_form_id") REFERENCES "public"."assigned_forms"("assigned_form_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_responses" ADD CONSTRAINT "form_responses_form_id_form_templates_form_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."form_templates"("form_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_responses" ADD CONSTRAINT "form_responses_client_id_clients_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("client_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_client_id_clients_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("client_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_orders" ADD CONSTRAINT "product_orders_client_id_clients_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("client_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_orders" ADD CONSTRAINT "product_orders_program_id_programs_program_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("program_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "set_prescriptions" ADD CONSTRAINT "set_prescriptions_template_id_workout_templates_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."workout_templates"("template_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_client_id_clients_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("client_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_teams_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("team_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_client_id_clients_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("client_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_items" ADD CONSTRAINT "test_items_test_template_id_test_templates_test_template_id_fk" FOREIGN KEY ("test_template_id") REFERENCES "public"."test_templates"("test_template_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_assigned_test_id_assigned_tests_assigned_test_id_fk" FOREIGN KEY ("assigned_test_id") REFERENCES "public"."assigned_tests"("assigned_test_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_test_template_id_test_templates_test_template_id_fk" FOREIGN KEY ("test_template_id") REFERENCES "public"."test_templates"("test_template_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_test_item_id_test_items_test_item_id_fk" FOREIGN KEY ("test_item_id") REFERENCES "public"."test_items"("test_item_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_client_id_clients_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("client_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_logs" ADD CONSTRAINT "workout_logs_client_id_clients_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("client_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_logs" ADD CONSTRAINT "workout_logs_assigned_workout_id_assigned_workouts_assigned_workout_id_fk" FOREIGN KEY ("assigned_workout_id") REFERENCES "public"."assigned_workouts"("assigned_workout_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_logs" ADD CONSTRAINT "workout_logs_exercise_id_exercises_exercise_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("exercise_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_templates" ADD CONSTRAINT "workout_templates_program_id_programs_program_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("program_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_templates" ADD CONSTRAINT "workout_templates_exercise_id_exercises_exercise_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("exercise_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assigned_forms_client_idx" ON "assigned_forms" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "assigned_forms_form_idx" ON "assigned_forms" USING btree ("form_id");--> statement-breakpoint
CREATE INDEX "assigned_tests_client_idx" ON "assigned_tests" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "assigned_tests_template_idx" ON "assigned_tests" USING btree ("test_template_id");--> statement-breakpoint
CREATE INDEX "assigned_workouts_client_idx" ON "assigned_workouts" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "assigned_workouts_client_date_idx" ON "assigned_workouts" USING btree ("client_id","scheduled_date");--> statement-breakpoint
CREATE INDEX "assigned_workouts_program_idx" ON "assigned_workouts" USING btree ("program_id");--> statement-breakpoint
CREATE INDEX "assigned_workouts_status_idx" ON "assigned_workouts" USING btree ("completion_status");--> statement-breakpoint
CREATE INDEX "athlete_metrics_client_idx" ON "athlete_metrics" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "athlete_metrics_client_type_idx" ON "athlete_metrics" USING btree ("client_id","metric_type");--> statement-breakpoint
CREATE INDEX "check_ins_client_idx" ON "check_ins" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "check_ins_client_date_idx" ON "check_ins" USING btree ("client_id","submitted_date");--> statement-breakpoint
CREATE INDEX "clients_primary_coach_idx" ON "clients" USING btree ("primary_coach_id");--> statement-breakpoint
CREATE INDEX "clients_email_idx" ON "clients" USING btree ("email");--> statement-breakpoint
CREATE INDEX "clients_type_idx" ON "clients" USING btree ("client_type");--> statement-breakpoint
CREATE INDEX "exercise_alternates_template_idx" ON "exercise_alternates" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "exercise_alternates_exercise_idx" ON "exercise_alternates" USING btree ("exercise_id");--> statement-breakpoint
CREATE INDEX "exercise_results_client_idx" ON "exercise_results" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "exercise_results_client_exercise_idx" ON "exercise_results" USING btree ("client_id","exercise_id");--> statement-breakpoint
CREATE INDEX "exercises_category_idx" ON "exercises" USING btree ("category");--> statement-breakpoint
CREATE INDEX "exercises_status_idx" ON "exercises" USING btree ("status");--> statement-breakpoint
CREATE INDEX "exercises_name_idx" ON "exercises" USING btree ("name");--> statement-breakpoint
CREATE INDEX "form_questions_form_idx" ON "form_questions" USING btree ("form_id");--> statement-breakpoint
CREATE INDEX "form_responses_client_idx" ON "form_responses" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "form_responses_assigned_idx" ON "form_responses" USING btree ("assigned_form_id");--> statement-breakpoint
CREATE INDEX "notifications_client_idx" ON "notifications" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "product_orders_client_idx" ON "product_orders" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "product_orders_program_idx" ON "product_orders" USING btree ("program_id");--> statement-breakpoint
CREATE INDEX "product_orders_payment_status_idx" ON "product_orders" USING btree ("payment_status");--> statement-breakpoint
CREATE INDEX "programs_coach_idx" ON "programs" USING btree ("coach_id");--> statement-breakpoint
CREATE INDEX "programs_status_idx" ON "programs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "programs_store_idx" ON "programs" USING btree ("public_store_visible");--> statement-breakpoint
CREATE INDEX "set_prescriptions_template_idx" ON "set_prescriptions" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "subscriptions_client_idx" ON "subscriptions" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "subscriptions_status_idx" ON "subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "subscriptions_next_billing_idx" ON "subscriptions" USING btree ("next_billing_date");--> statement-breakpoint
CREATE INDEX "team_members_team_idx" ON "team_members" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "team_members_client_idx" ON "team_members" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "teams_coach_idx" ON "teams" USING btree ("coach");--> statement-breakpoint
CREATE INDEX "test_items_template_idx" ON "test_items" USING btree ("test_template_id");--> statement-breakpoint
CREATE INDEX "test_results_client_idx" ON "test_results" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "test_results_assigned_idx" ON "test_results" USING btree ("assigned_test_id");--> statement-breakpoint
CREATE INDEX "test_results_item_idx" ON "test_results" USING btree ("test_item_id");--> statement-breakpoint
CREATE INDEX "workout_logs_client_idx" ON "workout_logs" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "workout_logs_assigned_idx" ON "workout_logs" USING btree ("assigned_workout_id");--> statement-breakpoint
CREATE INDEX "workout_logs_exercise_idx" ON "workout_logs" USING btree ("exercise_id");--> statement-breakpoint
CREATE INDEX "workout_logs_client_date_idx" ON "workout_logs" USING btree ("client_id","date");--> statement-breakpoint
CREATE INDEX "workout_templates_program_idx" ON "workout_templates" USING btree ("program_id");--> statement-breakpoint
CREATE INDEX "workout_templates_exercise_idx" ON "workout_templates" USING btree ("exercise_id");--> statement-breakpoint
CREATE INDEX "workout_templates_program_week_day_idx" ON "workout_templates" USING btree ("program_id","week","day");