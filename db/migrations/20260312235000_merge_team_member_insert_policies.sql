-- Merge team_members insert policies so self-joins and coach/org-coach adds
-- share one INSERT policy without duplicate permissive-policy warnings.

DROP POLICY IF EXISTS "Users can insert themselves as team members" ON public.team_members;
DROP POLICY IF EXISTS "Coaches and coxswains can add team members" ON public.team_members;

CREATE POLICY "Users and staff can insert team members"
ON public.team_members
FOR INSERT
TO authenticated
WITH CHECK (
  ((select auth.uid()) = user_id)
  OR public.can_manage_team_members(team_members.team_id, (select auth.uid()))
);
