-- Fix invite flows for existing accounts.
-- 1) Allow coach/coxswain team staff to add members by email.
-- 2) Add SECURITY DEFINER invite-code lookup RPC so non-members can preview/join private teams.

DROP POLICY IF EXISTS "Coaches and coxswains can add team members" ON public.team_members;
CREATE POLICY "Coaches and coxswains can add team members"
ON public.team_members
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.team_members actor
    WHERE actor.team_id = team_members.team_id
      AND actor.user_id = auth.uid()
      AND actor.role IN ('coach', 'coxswain')
  )
);

CREATE OR REPLACE FUNCTION public.lookup_team_by_invite_code(p_code text)
RETURNS SETOF public.teams
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.teams
  WHERE invite_code = upper(trim(p_code))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.lookup_team_by_invite_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_team_by_invite_code(text) TO authenticated;
