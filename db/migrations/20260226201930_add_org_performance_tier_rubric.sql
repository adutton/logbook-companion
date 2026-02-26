-- Organization-scoped performance tier rubric overrides for squad + 2k mapping
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS performance_tier_rubric jsonb;
