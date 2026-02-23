-- Fix org-level assignment bugs:
-- 1. getComplianceData() used wrong column name 'workout_date' on group_assignments (should be 'scheduled_date') — fixed in app code
-- 2. daily_workout_assignments RLS policies only checked team_members — failed for org assignments where team_id could be null
--    Now all 4 coach policies (INSERT, SELECT, UPDATE, DELETE) also check org membership via group_assignment linkage
-- 3. createGroupAssignment() fan-out now resolves each athlete's actual team_id from team_athletes instead of using null

-- ────── daily_workout_assignments RLS policy updates ──────

-- INSERT: allow coaches OR org members (via group_assignment)
DROP POLICY IF EXISTS "Coaches can create team assignments" ON daily_workout_assignments;
CREATE POLICY "Coaches can create team assignments" ON daily_workout_assignments
  FOR INSERT TO authenticated
  WITH CHECK (
    (team_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = daily_workout_assignments.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role = 'coach'
    ))
    OR
    (group_assignment_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM group_assignments ga
      JOIN organization_members om ON om.org_id = ga.org_id
      WHERE ga.id = daily_workout_assignments.group_assignment_id
        AND om.user_id = auth.uid()
    ))
  );

-- SELECT: allow team members OR org members (via group_assignment)
DROP POLICY IF EXISTS "Coaches can view team assignments" ON daily_workout_assignments;
CREATE POLICY "Coaches can view team assignments" ON daily_workout_assignments
  FOR SELECT TO authenticated
  USING (
    (team_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = daily_workout_assignments.team_id
        AND team_members.user_id = auth.uid()
    ))
    OR
    (group_assignment_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM group_assignments ga
      JOIN organization_members om ON om.org_id = ga.org_id
      WHERE ga.id = daily_workout_assignments.group_assignment_id
        AND om.user_id = auth.uid()
    ))
  );

-- UPDATE: allow coaches OR org members (via group_assignment)
DROP POLICY IF EXISTS "Coaches can update team assignments" ON daily_workout_assignments;
CREATE POLICY "Coaches can update team assignments" ON daily_workout_assignments
  FOR UPDATE TO authenticated
  USING (
    (team_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = daily_workout_assignments.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role = 'coach'
    ))
    OR
    (group_assignment_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM group_assignments ga
      JOIN organization_members om ON om.org_id = ga.org_id
      WHERE ga.id = daily_workout_assignments.group_assignment_id
        AND om.user_id = auth.uid()
    ))
  )
  WITH CHECK (
    (team_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = daily_workout_assignments.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role = 'coach'
    ))
    OR
    (group_assignment_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM group_assignments ga
      JOIN organization_members om ON om.org_id = ga.org_id
      WHERE ga.id = daily_workout_assignments.group_assignment_id
        AND om.user_id = auth.uid()
    ))
  );

-- DELETE: allow coaches OR org members (via group_assignment)
DROP POLICY IF EXISTS "Coaches can delete team assignments" ON daily_workout_assignments;
CREATE POLICY "Coaches can delete team assignments" ON daily_workout_assignments
  FOR DELETE TO authenticated
  USING (
    (team_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = daily_workout_assignments.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role = 'coach'
    ))
    OR
    (group_assignment_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM group_assignments ga
      JOIN organization_members om ON om.org_id = ga.org_id
      WHERE ga.id = daily_workout_assignments.group_assignment_id
        AND om.user_id = auth.uid()
    ))
  );
