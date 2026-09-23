CREATE TABLE programming_blocks (
  id text PRIMARY KEY, name text NOT NULL, name_cn text NOT NULL DEFAULT '',
  exercises jsonb NOT NULL, favorite boolean NOT NULL DEFAULT false,
  updated_at bigint NOT NULL, last_used_at bigint, version integer NOT NULL
);
