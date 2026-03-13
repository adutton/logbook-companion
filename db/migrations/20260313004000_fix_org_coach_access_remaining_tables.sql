-- Fix org-coach access on teams, group_assignments, coaching_weekly_plans, daily_workout_assignments
-- All policies should recognize org-level coaches via can_coach_team() or org membership

-- 1. teams UPDATE: allow org coaches (not just coach_id owner)
DROP POLICY IF EXISTS "Coaches can update their teams" ON teams;
CREATE POLICY "Coaches can update their teams" ON teams
  FOR UPDATE USING (can_coach_team(id, (SELECT auth.uid())))
  WITH CHECK (can_coach_team(id, (SELECT auth.uid())));

-- 2. teams DELETE: allow org coaches
DROP POLICY IF EXISTS "Coaches can delete their teams" ON teams;
CREATE POLICY "Coaches can delete their teams" ON teams
  FOR DELETE USING (can_coach_team(id, (SELECT auth.uid())));

-- 3. group_assignments UPDATE: allow any team/org coach, not just creator
DROP POLICY IF EXISTS "Creator can update group assignments" ON group_assignments;
CREATE POLICY "Coaches can update group assignments" ON group_assignments
  FOR UPDATE
  USING (
    (created_by = auth.uid())
    OR (team_id IS NOT NULL AND can_coach_team(team_id, (SELECT auth.uid())))
    OR (org_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.org_id = group_assignments.org_id AND om.user_id = (SELECT auth.uid())
    ))
  )
  WITH CHECK (
    (created_by = auth.uid())
    OR (team_id IS NOT NULL AND can_coach_team(team_id, (SELECT auth.uid())))
    OR (org_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.org_id = group_assignments.org_id AND om.user_id = (SELECT auth.uid())
    ))
  );

-- 4. group_assignments DELETE: allow any team/org coach, not just creator
DROP POLICY IF EXISTS "Creator can delete group assignments" ON group_assignments;
CREATE POLICY "Coaches can delete group assignments" ON group_assignments
  FOR DELETE
  USING (
    (created_by = auth.uid())
    OR (team_id IS NOT NULL AND can_coach_team(team_id, (SELECT auth.uid())))
    OR (org_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.org_id = group_assignments.org_id AND om.user_id = (SELECT auth.uid())
    ))
  );

-- 5. coaching_weekly_plans: add org member awareness to the ALL policy
DROP POLICY IF EXISTS "Coaches can manage weekly plans" ON coaching_weekly_plans;
CREATE POLICY "Coaches can manage weekly plans" ON coaching_weekly_plans
  FOR ALL
  USING (can_coach_team(team_id, (SELECT auth.uid())))
  WITH CHECK (can_coach_team(team_id, (SELECT auth.uid())));

-- 6. daily_workout_assignments: replace inline team_members checks with can_coach_team()
DROP POLICY IF EXISTS "Coaches can create team assignments" ON daily_workout_assignments;
CREATE POLICY "Coaches can create team assignments" ON daily_workout_assignments
  FOR INSERT
  WITH CHECK (
    (team_id IS NOT NULL AND can_coach_team(team_id, (SELECT auth.uid())))
    OR (group_assignment_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM group_assignments ga
      JOIN organization_members om ON om.org_id = ga.org_id
      WHERE ga.id = daily_workout_assignments.group_assignment_id AND om.user_id = (SELECT auth.uid())
    ))
  );

DROP POLICY IF EXISTS "Coaches can update team assignments" ON daily_workout_assignments;
CREATE POLICY "Coaches can update team assignments" ON daily_workout_assignments
  FOR UPDATE
  USING (
    (team_id IS NOT NULL AND can_coach_team(team_id, (SELECT auth.uid())))
    OR (group_assignment_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM group_assignments ga
      JOIN organization_members om ON om.org_id = ga.org_id
      WHERE ga.id = daily_workout_assignments.group_assignment_id AND om.user_id = (SELECT auth.uid())
    ))
  )
  WITH CHECK (
    (team_id IS NOT NULL AND can_coach_team(team_id, (SELECT auth.uid())))
    OR (group_assignment_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM group_assignments ga
      JOIN organization_members om ON om.org_id = ga.org_id
      WHERE ga.id = daily_workout_assignments.group_assignment_id AND om.user_id = (SELECT auth.uid())
    ))
  );

DROP POLICY IF EXISTS "Coaches can delete team assignments" ON daily_workout_assignments;
CREATE POLICY "Coaches can delete team assignments" ON daily_workout_assignments
  FOR DELETE
  USING (
    (team_id IS NOT NULL AND can_coach_team(team_id, (SELECT auth.uid())))
    OR (group_assignment_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM group_assignments ga
      JOIN organization_members om ON om.org_id = ga.org_id
      WHERE ga.id = daily_workout_assignments.group_assignment_id AND om.user_id = (SELECT auth.uid())
    ))
  );

DROP POLICY IF EXISTS "Coaches can view team assignments" ON daily_workout_assignments;
CREATE POLICY "Coaches can view team assignments" ON daily_workout_assignments
  FOR SELECT
  USING (
    (team_id IS NOT NULL AND can_coach_team(team_id, (SELECT auth.uid())))
    OR (group_assignment_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM group_assignments ga
      JOIN organization_members om ON om.org_id = ga.org_id
      WHERE ga.id = daily_workout_assignments.group_assignment_id AND om.user_id = (SELECT auth.uid())
    ))
  );
