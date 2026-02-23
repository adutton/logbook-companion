-- Migration: Add Organizations layer
-- Purpose: Group teams under clubs/programs so a coach managing multiple clubs
--          sees a clean hierarchy (Org > Teams) instead of a flat list.
--
-- Model:
--   Organization (club/program)
--     └── Team (boat/squad)           ← existing, gains org_id FK
--          └── Athletes               ← unchanged
--
-- Invite flow change:
--   OLD: invite_code on teams → athlete joins a specific team
--   NEW: invite_code on organizations → athlete joins the org, coach assigns to team
--        teams.invite_code stays for backward compat (existing codes keep working)
--
-- Backward compatible: org_id on teams is nullable. Existing teams with no org
-- continue to work exactly as before.

-- ─── Organizations ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS organizations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL CHECK (length(name) >= 2 AND length(name) <= 120),
    description TEXT,
    invite_code TEXT NOT NULL UNIQUE CHECK (length(invite_code) = 8),
    created_by  UUID NOT NULL REFERENCES auth.users(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Organization Members ───────────────────────────────────────────────────
-- Tracks who can manage this org (owner/admin/coach roles).
-- Athletes are NOT org members — they belong to teams within the org.

CREATE TABLE IF NOT EXISTS organization_members (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id    UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role      TEXT NOT NULL DEFAULT 'coach'
              CHECK (role IN ('owner', 'admin', 'coach')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(org_id, user_id)
);

-- ─── Link teams to organizations ────────────────────────────────────────────
-- Nullable for backward compat: existing teams keep org_id = NULL.

ALTER TABLE teams
    ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_teams_org_id ON teams(org_id) WHERE org_id IS NOT NULL;

-- ─── Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org  ON organization_members(org_id);

-- ─── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Org members can view their org
CREATE POLICY "Org members can view their organizations"
ON organizations FOR SELECT
USING (
    id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid())
);

-- Org owner/admin can insert/update/delete
CREATE POLICY "Org owner/admin can manage organizations"
ON organizations FOR ALL
USING (
    id IN (
        SELECT org_id FROM organization_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
);

-- Members can view org membership list
CREATE POLICY "Org members can view membership"
ON organization_members FOR SELECT
USING (
    org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid())
);

-- Owner/admin can manage org members
CREATE POLICY "Org owner/admin can manage members"
ON organization_members FOR ALL
USING (
    org_id IN (
        SELECT org_id FROM organization_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
);

-- ─── Auto-update timestamps ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_organization_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_organizations_updated_at
BEFORE UPDATE ON organizations
FOR EACH ROW EXECUTE FUNCTION update_organization_updated_at();

-- ─── Comments ───────────────────────────────────────────────────────────────

COMMENT ON TABLE organizations IS 'Clubs or programs that group multiple teams/boats';
COMMENT ON COLUMN organizations.invite_code IS '8-char code — athletes join the org, then get assigned to a team';
COMMENT ON TABLE organization_members IS 'Owner/admin/coach membership in an organization';
COMMENT ON COLUMN teams.org_id IS 'Optional parent org — NULL for standalone/legacy teams';
