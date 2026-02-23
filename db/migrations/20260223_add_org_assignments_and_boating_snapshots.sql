-- Migration: Add org_id to group_assignments for org-wide workout assignments
-- When org_id is set, the assignment applies to ALL teams in the org.
-- When team_id is set (existing behavior), it's team-scoped.
--
-- Also documents the BoatPosition JSONB schema change:
--   positions: [{ seat, athlete_id, athlete_name }]
--   athlete_name is snapshotted at creation time for historical accuracy.
--   (No SQL change needed — JSONB is schemaless)

-- 1. Add org_id column
ALTER TABLE public.group_assignments
  ADD COLUMN org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 2. Make team_id nullable (was NOT NULL)
ALTER TABLE public.group_assignments
  ALTER COLUMN team_id DROP NOT NULL;

-- 3. Ensure at least one scope is set
ALTER TABLE public.group_assignments
  ADD CONSTRAINT group_assignments_scope_check
  CHECK (team_id IS NOT NULL OR org_id IS NOT NULL);

-- 4. Index for org-wide queries
CREATE INDEX IF NOT EXISTS idx_group_assignments_org_date
  ON public.group_assignments(org_id, scheduled_date)
  WHERE org_id IS NOT NULL;

-- 5. Update RLS: allow org members to SELECT org-level assignments
DROP POLICY IF EXISTS "Team members can view group assignments" ON public.group_assignments;
CREATE POLICY "Team or org members can view group assignments"
ON public.group_assignments FOR SELECT
TO authenticated
USING (
  -- Team-scoped: existing check
  (team_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_members.team_id = group_assignments.team_id
      AND team_members.user_id = auth.uid()
  ))
  OR
  -- Org-scoped: org member can view
  (org_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_members.org_id = group_assignments.org_id
      AND organization_members.user_id = auth.uid()
  ))
);

-- 6. Update RLS: allow org coaches to INSERT org-level assignments
DROP POLICY IF EXISTS "Coaches can create group assignments" ON public.group_assignments;
CREATE POLICY "Coaches can create group assignments"
ON public.group_assignments FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (
    -- Team-scoped: coach of that team
    (team_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = group_assignments.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('coach', 'coxswain')
    ))
    OR
    -- Org-scoped: member of that org
    (org_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.org_id = group_assignments.org_id
        AND organization_members.user_id = auth.uid()
    ))
  )
);

-- UPDATE and DELETE policies stay as-is (creator-only), which is fine.

COMMENT ON COLUMN public.group_assignments.org_id IS 'When set, assignment applies to all teams in the org. Mutually exclusive intent with team_id (but both can coexist for hybrid queries).';
