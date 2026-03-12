-- Fix org coach visibility so org membership grants access to org teams
-- and team-scoped coaching data without requiring direct team_members rows.

CREATE OR REPLACE FUNCTION public.can_view_team(p_team_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.teams t
    WHERE t.id = p_team_id
      AND t.coach_id = p_user_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.team_members tm
    WHERE tm.team_id = p_team_id
      AND tm.user_id = p_user_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.teams t
    JOIN public.organization_members om ON om.org_id = t.org_id
    WHERE t.id = p_team_id
      AND om.user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.can_staff_team(p_team_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.teams t
    WHERE t.id = p_team_id
      AND t.coach_id = p_user_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.team_members tm
    WHERE tm.team_id = p_team_id
      AND tm.user_id = p_user_id
      AND tm.role IN ('coach', 'coxswain')
  )
  OR EXISTS (
    SELECT 1
    FROM public.teams t
    JOIN public.organization_members om ON om.org_id = t.org_id
    WHERE t.id = p_team_id
      AND om.user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.can_coach_team(p_team_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.teams t
    WHERE t.id = p_team_id
      AND t.coach_id = p_user_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.team_members tm
    WHERE tm.team_id = p_team_id
      AND tm.user_id = p_user_id
      AND tm.role = 'coach'
  )
  OR EXISTS (
    SELECT 1
    FROM public.teams t
    JOIN public.organization_members om ON om.org_id = t.org_id
    WHERE t.id = p_team_id
      AND om.user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.can_view_athlete(p_athlete_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.athletes a
    WHERE a.id = p_athlete_id
      AND (a.user_id = p_user_id OR a.created_by = p_user_id)
  )
  OR EXISTS (
    SELECT 1
    FROM public.team_athletes ta
    WHERE ta.athlete_id = p_athlete_id
      AND public.can_view_team(ta.team_id, p_user_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.can_coach_athlete(p_athlete_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_athletes ta
    WHERE ta.athlete_id = p_athlete_id
      AND public.can_coach_team(ta.team_id, p_user_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_team_members(p_team_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.can_staff_team(p_team_id, p_user_id);
$$;

REVOKE ALL ON FUNCTION public.can_view_team(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_staff_team(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_coach_team(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_view_athlete(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_coach_athlete(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_manage_team_members(uuid, uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.can_view_team(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_staff_team(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_coach_team(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_athlete(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_coach_athlete(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_team_members(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Team and org members can view teams" ON public.teams;
CREATE POLICY "Team and org members can view teams"
ON public.teams
FOR SELECT
TO authenticated
USING (public.can_view_team(teams.id, auth.uid()));

DROP POLICY IF EXISTS "Team and org members can view team members" ON public.team_members;
CREATE POLICY "Team and org members can view team members"
ON public.team_members
FOR SELECT
TO authenticated
USING (public.can_view_team(team_members.team_id, auth.uid()));

DROP POLICY IF EXISTS "Team and org coaches can update team members" ON public.team_members;
CREATE POLICY "Team and org coaches can update team members"
ON public.team_members
FOR UPDATE
TO authenticated
USING (public.can_coach_team(team_members.team_id, auth.uid()))
WITH CHECK (public.can_coach_team(team_members.team_id, auth.uid()));

DROP POLICY IF EXISTS "Users, team coaches, and org coaches can delete team members" ON public.team_members;
CREATE POLICY "Users, team coaches, and org coaches can delete team members"
ON public.team_members
FOR DELETE
TO authenticated
USING ((auth.uid() = user_id) OR public.can_coach_team(team_members.team_id, auth.uid()));

DROP POLICY IF EXISTS "Team and org members can view team athletes" ON public.team_athletes;
CREATE POLICY "Team and org members can view team athletes"
ON public.team_athletes
FOR SELECT
TO authenticated
USING (public.can_view_team(team_athletes.team_id, auth.uid()));

DROP POLICY IF EXISTS "Team and org coaches can manage team athletes" ON public.team_athletes;
CREATE POLICY "Team and org coaches can manage team athletes"
ON public.team_athletes
FOR ALL
TO authenticated
USING (public.can_coach_team(team_athletes.team_id, auth.uid()))
WITH CHECK (public.can_coach_team(team_athletes.team_id, auth.uid()));

DROP POLICY IF EXISTS "Team and org members can view athletes" ON public.athletes;
CREATE POLICY "Team and org members can view athletes"
ON public.athletes
FOR SELECT
TO authenticated
USING (public.can_view_athlete(athletes.id, auth.uid()));

DROP POLICY IF EXISTS "Team and org coaches can update athletes" ON public.athletes;
CREATE POLICY "Team and org coaches can update athletes"
ON public.athletes
FOR UPDATE
TO authenticated
USING ((user_id = auth.uid()) OR public.can_coach_athlete(athletes.id, auth.uid()))
WITH CHECK ((user_id = auth.uid()) OR public.can_coach_athlete(athletes.id, auth.uid()));

DROP POLICY IF EXISTS "Team and org coaches can delete athletes" ON public.athletes;
CREATE POLICY "Team and org coaches can delete athletes"
ON public.athletes
FOR DELETE
TO authenticated
USING (public.can_coach_athlete(athletes.id, auth.uid()));

DROP POLICY IF EXISTS "Team and org members can view erg scores" ON public.coaching_erg_scores;
CREATE POLICY "Team and org members can view erg scores"
ON public.coaching_erg_scores
FOR SELECT
TO authenticated
USING (
  ((team_id IS NULL) AND (coach_user_id = auth.uid()))
  OR ((team_id IS NOT NULL) AND public.can_view_team(coaching_erg_scores.team_id, auth.uid()))
);

DROP POLICY IF EXISTS "Team and org staff can insert erg scores" ON public.coaching_erg_scores;
CREATE POLICY "Team and org staff can insert erg scores"
ON public.coaching_erg_scores
FOR INSERT
TO authenticated
WITH CHECK (
  (coach_user_id = auth.uid())
  AND (
    (team_id IS NULL)
    OR public.can_staff_team(coaching_erg_scores.team_id, auth.uid())
  )
);

DROP POLICY IF EXISTS "Team and org staff can update erg scores" ON public.coaching_erg_scores;
CREATE POLICY "Team and org staff can update erg scores"
ON public.coaching_erg_scores
FOR UPDATE
TO authenticated
USING (
  (coach_user_id = auth.uid())
  OR ((team_id IS NOT NULL) AND public.can_staff_team(coaching_erg_scores.team_id, auth.uid()))
)
WITH CHECK (
  (coach_user_id = auth.uid())
  OR ((team_id IS NOT NULL) AND public.can_staff_team(coaching_erg_scores.team_id, auth.uid()))
);

DROP POLICY IF EXISTS "Team and org coaches can delete erg scores" ON public.coaching_erg_scores;
CREATE POLICY "Team and org coaches can delete erg scores"
ON public.coaching_erg_scores
FOR DELETE
TO authenticated
USING (
  (coach_user_id = auth.uid())
  OR ((team_id IS NOT NULL) AND public.can_coach_team(coaching_erg_scores.team_id, auth.uid()))
);

DROP POLICY IF EXISTS "Team and org members can view sessions" ON public.coaching_sessions;
CREATE POLICY "Team and org members can view sessions"
ON public.coaching_sessions
FOR SELECT
TO authenticated
USING (
  (auth.uid() = coach_user_id)
  OR ((team_id IS NOT NULL) AND public.can_view_team(coaching_sessions.team_id, auth.uid()))
);

DROP POLICY IF EXISTS "Team and org coaches can manage sessions" ON public.coaching_sessions;
CREATE POLICY "Team and org coaches can manage sessions"
ON public.coaching_sessions
FOR ALL
TO authenticated
USING (
  (auth.uid() = coach_user_id)
  OR ((team_id IS NOT NULL) AND public.can_coach_team(coaching_sessions.team_id, auth.uid()))
)
WITH CHECK (
  (coach_user_id = auth.uid())
  AND (
    (team_id IS NULL)
    OR public.can_coach_team(coaching_sessions.team_id, auth.uid())
  )
);

DROP POLICY IF EXISTS "Team and org members can view boatings" ON public.coaching_boatings;
CREATE POLICY "Team and org members can view boatings"
ON public.coaching_boatings
FOR SELECT
TO authenticated
USING (
  (auth.uid() = coach_user_id)
  OR ((team_id IS NOT NULL) AND public.can_view_team(coaching_boatings.team_id, auth.uid()))
);

DROP POLICY IF EXISTS "Team and org coaches can manage boatings" ON public.coaching_boatings;
CREATE POLICY "Team and org coaches can manage boatings"
ON public.coaching_boatings
FOR ALL
TO authenticated
USING (
  (auth.uid() = coach_user_id)
  OR ((team_id IS NOT NULL) AND public.can_coach_team(coaching_boatings.team_id, auth.uid()))
)
WITH CHECK (
  (coach_user_id = auth.uid())
  AND (
    (team_id IS NULL)
    OR public.can_coach_team(coaching_boatings.team_id, auth.uid())
  )
);

DROP POLICY IF EXISTS "Team and org coaches can view athlete notes" ON public.coaching_athlete_notes;
CREATE POLICY "Team and org coaches can view athlete notes"
ON public.coaching_athlete_notes
FOR SELECT
TO authenticated
USING (
  (auth.uid() = coach_user_id)
  OR ((team_id IS NOT NULL) AND public.can_coach_team(coaching_athlete_notes.team_id, auth.uid()))
);

DROP POLICY IF EXISTS "Team and org coaches can manage athlete notes" ON public.coaching_athlete_notes;
CREATE POLICY "Team and org coaches can manage athlete notes"
ON public.coaching_athlete_notes
FOR ALL
TO authenticated
USING (
  (auth.uid() = coach_user_id)
  OR ((team_id IS NOT NULL) AND public.can_coach_team(coaching_athlete_notes.team_id, auth.uid()))
)
WITH CHECK (
  (coach_user_id = auth.uid())
  AND (
    (team_id IS NULL)
    OR public.can_coach_team(coaching_athlete_notes.team_id, auth.uid())
  )
);
