-- Add team-scoped athlete performance tier classification.
-- Kept additive so existing squad and experience_level behavior is unchanged.

ALTER TABLE public.team_athletes
  ADD COLUMN IF NOT EXISTS performance_tier text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'team_athletes_performance_tier_check'
  ) THEN
    ALTER TABLE public.team_athletes
      ADD CONSTRAINT team_athletes_performance_tier_check
      CHECK (
        performance_tier IS NULL
        OR performance_tier IN ('pool', 'developmental', 'challenger', 'champion')
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_team_athletes_team_performance_tier
  ON public.team_athletes (team_id, performance_tier)
  WHERE performance_tier IS NOT NULL;
