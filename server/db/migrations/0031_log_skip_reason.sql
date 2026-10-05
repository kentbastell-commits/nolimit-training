-- Explicit "skipped this exercise" (2026-10-06): a set row with completed=false
-- could already be saved, but nothing recorded WHY. The athlete now picks a
-- reason (no equipment, pain, out of time, other…) when skipping an exercise;
-- it lives on each of that exercise's skipped set rows so history and the
-- coach review can show it without another table.
ALTER TABLE workout_logs ADD COLUMN skip_reason text;
