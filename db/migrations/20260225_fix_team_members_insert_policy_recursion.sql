-- Fix team_members insert policy recursion causing 500s when coaches add members by email.
-- Previous policy queried public.team_members directly inside a team_members policy.

CREATE OR REPLACE FUNCTION public.can_manage_team_members(p_team_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members tm
    WHERE tm.team_id = p_team_id
      AND tm.user_id = p_user_id
      AND tm.role IN ('coach', 'coxswain')
  )
  OR EXISTS (
    SELECT 1
    FROM public.teams t
    WHERE t.id = p_team_id
      AND t.coach_id = p_user_id
  );
$$;

REVOKE ALL ON FUNCTION public.can_manage_team_members(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_team_members(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Coaches and coxswains can add team members" ON public.team_members;
CREATE POLICY "Coaches and coxswains can add team members"
ON public.team_members
FOR INSERT
TO authenticated
WITH CHECK (public.can_manage_team_members(team_members.team_id, auth.uid()));
