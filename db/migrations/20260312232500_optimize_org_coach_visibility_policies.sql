-- Clean up org coach visibility policies after rollout:
-- - remove superseded duplicate permissive policies
-- - use `(select auth.uid())` in touched policies to satisfy advisor guidance
-- - add indexes for newly hot foreign-key paths surfaced by advisors

CREATE INDEX IF NOT EXISTS idx_team_members_user_id
  ON public.team_members (user_id);

CREATE INDEX IF NOT EXISTS idx_coaching_athlete_notes_coach_user_id
  ON public.coaching_athlete_notes (coach_user_id);

CREATE INDEX IF NOT EXISTS idx_coaching_athlete_notes_team_id
  ON public.coaching_athlete_notes (team_id);

CREATE INDEX IF NOT EXISTS idx_coaching_boatings_team_id
  ON public.coaching_boatings (team_id);

DROP POLICY IF EXISTS "Users can select teams" ON public.teams;
DROP POLICY IF EXISTS "Coaches can insert teams" ON public.teams;
DROP POLICY IF EXISTS "Coaches can update their teams" ON public.teams;
DROP POLICY IF EXISTS "Coaches can delete their teams" ON public.teams;
DROP POLICY IF EXISTS "Team and org members can view teams" ON public.teams;

CREATE POLICY "Team and org members can view teams"
ON public.teams
FOR SELECT
TO authenticated
USING (public.can_view_team(teams.id, (select auth.uid())));

CREATE POLICY "Coaches can insert teams"
ON public.teams
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE user_profiles.user_id = (select auth.uid())
      AND 'coach' = ANY (user_profiles.roles)
  )
);

CREATE POLICY "Coaches can update their teams"
ON public.teams
FOR UPDATE
TO authenticated
USING ((select auth.uid()) = coach_id)
WITH CHECK ((select auth.uid()) = coach_id);

CREATE POLICY "Coaches can delete their teams"
ON public.teams
FOR DELETE
TO authenticated
USING ((select auth.uid()) = coach_id);

DROP POLICY IF EXISTS "Users can select team members" ON public.team_members;
DROP POLICY IF EXISTS "Coaches can update team member roles" ON public.team_members;
DROP POLICY IF EXISTS "Users and coaches can delete team members" ON public.team_members;
DROP POLICY IF EXISTS "Users can insert themselves as team members" ON public.team_members;
DROP POLICY IF EXISTS "Coaches and coxswains can add team members" ON public.team_members;
DROP POLICY IF EXISTS "Team and org members can view team members" ON public.team_members;
DROP POLICY IF EXISTS "Team and org coaches can update team members" ON public.team_members;
DROP POLICY IF EXISTS "Users, team coaches, and org coaches can delete team members" ON public.team_members;

CREATE POLICY "Team and org members can view team members"
ON public.team_members
FOR SELECT
TO authenticated
USING (public.can_view_team(team_members.team_id, (select auth.uid())));

CREATE POLICY "Users can insert themselves as team members"
ON public.team_members
FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Coaches and coxswains can add team members"
ON public.team_members
FOR INSERT
TO authenticated
WITH CHECK (public.can_manage_team_members(team_members.team_id, (select auth.uid())));

CREATE POLICY "Team and org coaches can update team members"
ON public.team_members
FOR UPDATE
TO authenticated
USING (public.can_coach_team(team_members.team_id, (select auth.uid())))
WITH CHECK (public.can_coach_team(team_members.team_id, (select auth.uid())));

CREATE POLICY "Users, team coaches, and org coaches can delete team members"
ON public.team_members
FOR DELETE
TO authenticated
USING (((select auth.uid()) = user_id) OR public.can_coach_team(team_members.team_id, (select auth.uid())));

DROP POLICY IF EXISTS "Team athletes viewable by team members" ON public.team_athletes;
DROP POLICY IF EXISTS "Team athletes manageable by coaches" ON public.team_athletes;
DROP POLICY IF EXISTS "Team and org members can view team athletes" ON public.team_athletes;
DROP POLICY IF EXISTS "Team and org coaches can manage team athletes" ON public.team_athletes;

CREATE POLICY "Team and org members can view team athletes"
ON public.team_athletes
FOR SELECT
TO authenticated
USING (public.can_view_team(team_athletes.team_id, (select auth.uid())));

CREATE POLICY "Team and org coaches can manage team athletes"
ON public.team_athletes
FOR ALL
TO authenticated
USING (public.can_coach_team(team_athletes.team_id, (select auth.uid())))
WITH CHECK (public.can_coach_team(team_athletes.team_id, (select auth.uid())));

DROP POLICY IF EXISTS "Athletes viewable by team members" ON public.athletes;
DROP POLICY IF EXISTS "Athletes updatable by coaches" ON public.athletes;
DROP POLICY IF EXISTS "Athletes deletable by coaches" ON public.athletes;
DROP POLICY IF EXISTS "Team and org members can view athletes" ON public.athletes;
DROP POLICY IF EXISTS "Team and org coaches can update athletes" ON public.athletes;
DROP POLICY IF EXISTS "Team and org coaches can delete athletes" ON public.athletes;

CREATE POLICY "Team and org members can view athletes"
ON public.athletes
FOR SELECT
TO authenticated
USING (public.can_view_athlete(athletes.id, (select auth.uid())));

CREATE POLICY "Team and org coaches can update athletes"
ON public.athletes
FOR UPDATE
TO authenticated
USING (((select auth.uid()) = user_id) OR public.can_coach_athlete(athletes.id, (select auth.uid())))
WITH CHECK (((select auth.uid()) = user_id) OR public.can_coach_athlete(athletes.id, (select auth.uid())));

CREATE POLICY "Team and org coaches can delete athletes"
ON public.athletes
FOR DELETE
TO authenticated
USING (public.can_coach_athlete(athletes.id, (select auth.uid())));

DROP POLICY IF EXISTS "Coaches manage own erg scores" ON public.coaching_erg_scores;
DROP POLICY IF EXISTS "Team members can view erg scores" ON public.coaching_erg_scores;
DROP POLICY IF EXISTS "Coaches and coxswains can insert erg scores" ON public.coaching_erg_scores;
DROP POLICY IF EXISTS "Coaches and coxswains can update erg scores" ON public.coaching_erg_scores;
DROP POLICY IF EXISTS "Coaches can delete erg scores" ON public.coaching_erg_scores;
DROP POLICY IF EXISTS "Team and org members can view erg scores" ON public.coaching_erg_scores;
DROP POLICY IF EXISTS "Team and org staff can insert erg scores" ON public.coaching_erg_scores;
DROP POLICY IF EXISTS "Team and org staff can update erg scores" ON public.coaching_erg_scores;
DROP POLICY IF EXISTS "Team and org coaches can delete erg scores" ON public.coaching_erg_scores;

CREATE POLICY "Team and org members can view erg scores"
ON public.coaching_erg_scores
FOR SELECT
TO authenticated
USING (
  ((team_id IS NULL) AND (coach_user_id = (select auth.uid())))
  OR ((team_id IS NOT NULL) AND public.can_view_team(coaching_erg_scores.team_id, (select auth.uid())))
);

CREATE POLICY "Team and org staff can insert erg scores"
ON public.coaching_erg_scores
FOR INSERT
TO authenticated
WITH CHECK (
  (coach_user_id = (select auth.uid()))
  AND (
    (team_id IS NULL)
    OR public.can_staff_team(coaching_erg_scores.team_id, (select auth.uid()))
  )
);

CREATE POLICY "Team and org staff can update erg scores"
ON public.coaching_erg_scores
FOR UPDATE
TO authenticated
USING (
  (coach_user_id = (select auth.uid()))
  OR ((team_id IS NOT NULL) AND public.can_staff_team(coaching_erg_scores.team_id, (select auth.uid())))
)
WITH CHECK (
  (coach_user_id = (select auth.uid()))
  OR ((team_id IS NOT NULL) AND public.can_staff_team(coaching_erg_scores.team_id, (select auth.uid())))
);

CREATE POLICY "Team and org coaches can delete erg scores"
ON public.coaching_erg_scores
FOR DELETE
TO authenticated
USING (
  (coach_user_id = (select auth.uid()))
  OR ((team_id IS NOT NULL) AND public.can_coach_team(coaching_erg_scores.team_id, (select auth.uid())))
);

DROP POLICY IF EXISTS "Coaches manage own sessions" ON public.coaching_sessions;
DROP POLICY IF EXISTS "Team and org members can view sessions" ON public.coaching_sessions;
DROP POLICY IF EXISTS "Team and org coaches can manage sessions" ON public.coaching_sessions;

CREATE POLICY "Team and org members can view sessions"
ON public.coaching_sessions
FOR SELECT
TO authenticated
USING (
  ((select auth.uid()) = coach_user_id)
  OR ((team_id IS NOT NULL) AND public.can_view_team(coaching_sessions.team_id, (select auth.uid())))
);

CREATE POLICY "Team and org coaches can manage sessions"
ON public.coaching_sessions
FOR ALL
TO authenticated
USING (
  ((select auth.uid()) = coach_user_id)
  OR ((team_id IS NOT NULL) AND public.can_coach_team(coaching_sessions.team_id, (select auth.uid())))
)
WITH CHECK (
  (coach_user_id = (select auth.uid()))
  AND (
    (team_id IS NULL)
    OR public.can_coach_team(coaching_sessions.team_id, (select auth.uid()))
  )
);

DROP POLICY IF EXISTS "Coaches manage own boatings" ON public.coaching_boatings;
DROP POLICY IF EXISTS "Team and org members can view boatings" ON public.coaching_boatings;
DROP POLICY IF EXISTS "Team and org coaches can manage boatings" ON public.coaching_boatings;

CREATE POLICY "Team and org members can view boatings"
ON public.coaching_boatings
FOR SELECT
TO authenticated
USING (
  ((select auth.uid()) = coach_user_id)
  OR ((team_id IS NOT NULL) AND public.can_view_team(coaching_boatings.team_id, (select auth.uid())))
);

CREATE POLICY "Team and org coaches can manage boatings"
ON public.coaching_boatings
FOR ALL
TO authenticated
USING (
  ((select auth.uid()) = coach_user_id)
  OR ((team_id IS NOT NULL) AND public.can_coach_team(coaching_boatings.team_id, (select auth.uid())))
)
WITH CHECK (
  (coach_user_id = (select auth.uid()))
  AND (
    (team_id IS NULL)
    OR public.can_coach_team(coaching_boatings.team_id, (select auth.uid()))
  )
);

DROP POLICY IF EXISTS "Coaches manage own athlete notes" ON public.coaching_athlete_notes;
DROP POLICY IF EXISTS "Team and org coaches can view athlete notes" ON public.coaching_athlete_notes;
DROP POLICY IF EXISTS "Team and org coaches can manage athlete notes" ON public.coaching_athlete_notes;

CREATE POLICY "Team and org coaches can view athlete notes"
ON public.coaching_athlete_notes
FOR SELECT
TO authenticated
USING (
  ((select auth.uid()) = coach_user_id)
  OR ((team_id IS NOT NULL) AND public.can_coach_team(coaching_athlete_notes.team_id, (select auth.uid())))
);

CREATE POLICY "Team and org coaches can manage athlete notes"
ON public.coaching_athlete_notes
FOR ALL
TO authenticated
USING (
  ((select auth.uid()) = coach_user_id)
  OR ((team_id IS NOT NULL) AND public.can_coach_team(coaching_athlete_notes.team_id, (select auth.uid())))
)
WITH CHECK (
  (coach_user_id = (select auth.uid()))
  AND (
    (team_id IS NULL)
    OR public.can_coach_team(coaching_athlete_notes.team_id, (select auth.uid()))
  )
);
