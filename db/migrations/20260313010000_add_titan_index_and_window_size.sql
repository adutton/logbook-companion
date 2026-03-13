-- Add per-workout titan_index to daily_workout_assignments
-- and configurable titan_window_size to teams (default 5)

ALTER TABLE daily_workout_assignments
  ADD COLUMN IF NOT EXISTS titan_index numeric;

COMMENT ON COLUMN daily_workout_assignments.titan_index IS
  'Per-workout Titan Index (0-100). Computed from z-score composite of speed + efficiency relative to the cohort that completed this assignment.';

CREATE INDEX IF NOT EXISTS idx_dwa_titan_index
  ON daily_workout_assignments (athlete_id, titan_index)
  WHERE titan_index IS NOT NULL;

ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS titan_window_size integer NOT NULL DEFAULT 5;

COMMENT ON COLUMN teams.titan_window_size IS
  'Number of recent scored workouts used to compute the season-level rolling Titan Index. Default 5.';

-- Backfill: no-op. Per-workout titan indexes will be computed going forward
-- as assignments are scored. Existing data will show null until re-scored.
