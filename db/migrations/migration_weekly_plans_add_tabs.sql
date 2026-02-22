-- Migration: weekly plans — rename focus_points to goals, add coaching_points, drill_examples, piece_examples
-- Applied to Supabase via MCP on 2026-02-22

-- Add new columns
ALTER TABLE coaching_weekly_plans
  ADD COLUMN IF NOT EXISTS coaching_points TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS drill_examples  TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS piece_examples  TEXT[] DEFAULT '{}';

-- Rename focus_points -> goals
ALTER TABLE coaching_weekly_plans
  RENAME COLUMN focus_points TO goals;

-- Update comments
COMMENT ON COLUMN coaching_weekly_plans.goals IS 'Array of measurable goals for the week';
COMMENT ON COLUMN coaching_weekly_plans.coaching_points IS 'Key coaching cues and reminders for the week';
COMMENT ON COLUMN coaching_weekly_plans.drill_examples IS 'Sample drills to use during the week';
COMMENT ON COLUMN coaching_weekly_plans.piece_examples IS 'Sample pieces/workouts for the week';
