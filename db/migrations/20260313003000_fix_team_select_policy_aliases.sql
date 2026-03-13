-- Fix outer-row references in the teams SELECT policy.
-- In row-level policies, unqualified column names inside nested EXISTS can bind
-- to the inner table instead of the outer `teams` row. Use explicit table
-- qualification so visibility checks evaluate against the current team row.

DROP POLICY IF EXISTS "Team and org members can view teams" ON public.teams;

CREATE POLICY "Team and org members can view teams"
ON public.teams
FOR SELECT
TO authenticated
USING (
  ((select auth.uid()) = coach_id)
  OR EXISTS (
    SELECT 1
    FROM public.team_members tm
    WHERE tm.team_id = teams.id
      AND tm.user_id = (select auth.uid())
  )
  OR (
    teams.org_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.org_id = teams.org_id
        AND om.user_id = (select auth.uid())
    )
  )
);
