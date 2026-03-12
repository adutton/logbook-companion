-- Align team creation policy with the app's broader coach-access rules.
-- Team creation should be allowed for:
-- - legacy users with `coach` in user_profiles.roles
-- - existing team coaches / coxswains
-- - org-level coaches/admins/owners
-- - users with approved coaching access requests

CREATE OR REPLACE FUNCTION public.can_create_teams(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.user_id = p_user_id
      AND 'coach' = ANY (up.roles)
  )
  OR EXISTS (
    SELECT 1
    FROM public.team_members tm
    WHERE tm.user_id = p_user_id
      AND tm.role IN ('coach', 'coxswain')
  )
  OR EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.user_id = p_user_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.coaching_access_requests car
    WHERE car.user_id = p_user_id
      AND car.status = 'approved'
  );
$$;

REVOKE ALL ON FUNCTION public.can_create_teams(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_create_teams(uuid) TO authenticated;

DROP POLICY IF EXISTS "Coaches can insert teams" ON public.teams;
CREATE POLICY "Coaches can insert teams"
ON public.teams
FOR INSERT
TO authenticated
WITH CHECK (public.can_create_teams((select auth.uid())));
