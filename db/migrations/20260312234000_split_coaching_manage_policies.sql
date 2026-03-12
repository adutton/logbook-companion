-- Split SELECT from broader manage policies so touched coaching tables avoid
-- duplicate permissive-policy warnings while preserving the same access model.

DROP POLICY IF EXISTS "Athletes insertable by coaches" ON public.athletes;
CREATE POLICY "Athletes insertable by coaches"
ON public.athletes
FOR INSERT
TO authenticated
WITH CHECK (created_by = (select auth.uid()));

DROP POLICY IF EXISTS "Team and org coaches can manage team athletes" ON public.team_athletes;
CREATE POLICY "Team and org coaches can insert team athletes"
ON public.team_athletes
FOR INSERT
TO authenticated
WITH CHECK (public.can_coach_team(team_athletes.team_id, (select auth.uid())));

CREATE POLICY "Team and org coaches can update team athletes"
ON public.team_athletes
FOR UPDATE
TO authenticated
USING (public.can_coach_team(team_athletes.team_id, (select auth.uid())))
WITH CHECK (public.can_coach_team(team_athletes.team_id, (select auth.uid())));

CREATE POLICY "Team and org coaches can delete team athletes"
ON public.team_athletes
FOR DELETE
TO authenticated
USING (public.can_coach_team(team_athletes.team_id, (select auth.uid())));

DROP POLICY IF EXISTS "Team and org coaches can manage sessions" ON public.coaching_sessions;
CREATE POLICY "Team and org coaches can insert sessions"
ON public.coaching_sessions
FOR INSERT
TO authenticated
WITH CHECK (
  (coach_user_id = (select auth.uid()))
  AND (
    (team_id IS NULL)
    OR public.can_coach_team(coaching_sessions.team_id, (select auth.uid()))
  )
);

CREATE POLICY "Team and org coaches can update sessions"
ON public.coaching_sessions
FOR UPDATE
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

CREATE POLICY "Team and org coaches can delete sessions"
ON public.coaching_sessions
FOR DELETE
TO authenticated
USING (
  ((select auth.uid()) = coach_user_id)
  OR ((team_id IS NOT NULL) AND public.can_coach_team(coaching_sessions.team_id, (select auth.uid())))
);

DROP POLICY IF EXISTS "Team and org coaches can manage boatings" ON public.coaching_boatings;
CREATE POLICY "Team and org coaches can insert boatings"
ON public.coaching_boatings
FOR INSERT
TO authenticated
WITH CHECK (
  (coach_user_id = (select auth.uid()))
  AND (
    (team_id IS NULL)
    OR public.can_coach_team(coaching_boatings.team_id, (select auth.uid()))
  )
);

CREATE POLICY "Team and org coaches can update boatings"
ON public.coaching_boatings
FOR UPDATE
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

CREATE POLICY "Team and org coaches can delete boatings"
ON public.coaching_boatings
FOR DELETE
TO authenticated
USING (
  ((select auth.uid()) = coach_user_id)
  OR ((team_id IS NOT NULL) AND public.can_coach_team(coaching_boatings.team_id, (select auth.uid())))
);

DROP POLICY IF EXISTS "Team and org coaches can manage athlete notes" ON public.coaching_athlete_notes;
CREATE POLICY "Team and org coaches can insert athlete notes"
ON public.coaching_athlete_notes
FOR INSERT
TO authenticated
WITH CHECK (
  (coach_user_id = (select auth.uid()))
  AND (
    (team_id IS NULL)
    OR public.can_coach_team(coaching_athlete_notes.team_id, (select auth.uid()))
  )
);

CREATE POLICY "Team and org coaches can update athlete notes"
ON public.coaching_athlete_notes
FOR UPDATE
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

CREATE POLICY "Team and org coaches can delete athlete notes"
ON public.coaching_athlete_notes
FOR DELETE
TO authenticated
USING (
  ((select auth.uid()) = coach_user_id)
  OR ((team_id IS NOT NULL) AND public.can_coach_team(coaching_athlete_notes.team_id, (select auth.uid())))
);
