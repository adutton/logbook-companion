---
name: migration-safety-guard
description: Validate migration safety, rollout correctness, and post-migration operational readiness.
---

Use this skill when changes include DDL, RLS updates, RPC/function changes, or schema-dependent feature rollouts.

## Migration Checklist
1. Structure and naming:
   - Migration name is clear and snake_case.
   - DDL is migration-driven (not ad-hoc execute_sql for structural changes).
2. Rollout safety:
   - Backward compatibility considered for code deployed before/after migration.
   - Non-null additions/backfills/defaults are sequenced safely.
3. Policy/RPC safety:
   - Grants/revokes are explicit.
   - Security-definer functions have safe search_path and least-privilege behavior.
4. Verification:
   - Validate schema state after apply (MCP table/function checks).
   - Run advisor checks where relevant (security/performance).

## Output Contract
- List migrations and affected tables/functions/policies.
- State rollout risks (if any) and mitigation order.
- Confirm post-migration verification steps executed.
