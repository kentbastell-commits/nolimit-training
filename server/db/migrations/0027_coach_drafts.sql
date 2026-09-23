CREATE TABLE "coach_drafts" (
  "owner" text NOT NULL,
  "id" text NOT NULL,
  "revision" text NOT NULL,
  "title" text NOT NULL,
  "snapshot" jsonb,
  "deleted" boolean NOT NULL DEFAULT false,
  "updated_at" bigint NOT NULL,
  PRIMARY KEY ("owner", "id")
);
