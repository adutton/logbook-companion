---
name: coaching-rls-guard
description: Validate coaching data access safety across team/org scoping, role hierarchy, and RLS-aligned query behavior.
---

Use this skill for changes touching coaching tables, coaching service queries, role checks, team/org context, or policies.

## Key Surfaces
- `src/services/coaching/coachingService.ts`
- `src/contexts/CoachingContext.tsx`
- `src/pages/coaching/**`
- `db/migrations/**` (coaching tables, RLS, helper functions)

## Safety Checklist
1. Team/org scoping:
   - All coaching reads/writes are scoped by `team_id` (or approved org-level flow).
   - Org-wide views use explicit `orgId` context and avoid implicit derivation.
2. Role hierarchy alignment:
   - Behavior matches `coach > coxswain > member` capability boundaries.
   - UI gating and service/database enforcement do not diverge.
3. RLS compatibility:
   - Query patterns are compatible with existing RLS policies/helpers.
   - No policy logic introduces recursion or privilege escalation risks.
4. Multi-team correctness:
   - Avoid hard-coding single-team assumptions in new code paths.
   - Team switching paths do not leak prior-team data.

## Output Contract
- List touched coaching tables/surfaces.
- State team/org scope and role enforcement validation result.
- Flag any potential RLS mismatch with exact risky query/policy.
