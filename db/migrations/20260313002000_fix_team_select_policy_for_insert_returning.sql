-- Avoid self-referential team visibility checks on the teams table itself.
-- PostgREST inserts use `return=representation`, which requires reading the
-- newly inserted row back immediately. The previous SELECT policy delegated to
-- can_view_team(id, auth.uid()), and that helper queried `teams` again.
-- That recursive/self-referential pattern blocks INSERT ... RETURNING under RLS.

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
    WHERE tm.team_id = id
      AND tm.user_id = (select auth.uid())
  )
  OR (
    org_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.org_id = org_id
        AND om.user_id = (select auth.uid())
    )
  )
);
