---
name: concept2-reliability-guard
description: Validate Concept2 integration reliability across auth scopes, sync/publish behavior, and data mapping.
---

Use this skill for any change touching Concept2 auth, sync, callback, ingestion, reconciliation, or C2 publish flows.

## Key Integration Surfaces
- `src/api/concept2.ts`
- `src/hooks/useConcept2Sync.ts`
- `src/pages/Callback.tsx`
- `src/pages/Sync.tsx`
- `src/components/AutoSync.tsx`
- `src/components/ReconnectPrompt.tsx`
- `src/pages/Dashboard.tsx`
- `src/components/Layout.tsx`
- `src/services/workoutService.ts`
- `src/utils/reconciliation.ts`

## Reliability Checklist
1. OAuth + scopes:
   - Ensure required scopes are requested (`results:read` and/or `results:write` as intended).
   - If scope upgrades are required, verify re-link UX messaging is present.
2. Token lifecycle:
   - Validate refresh-before-expiry behavior and 401 fallback handling.
   - Ensure expired/revoked token paths produce explicit user-facing action (reconnect prompt).
3. Sync/publish integrity:
   - Enforce idempotency (no duplicate logs/uploads on retry).
   - Preserve external IDs and published timestamps where applicable.
   - Verify retry behavior reports real failures (no success-shaped fallback).
4. Data mapping correctness:
   - Confirm C2 payload fields map consistently into workout structures/log records.
   - Ensure reconciliation tolerances and source-priority rules remain coherent.
5. Environment + deployment safety:
   - Confirm expected secrets/vars and endpoint environment (dev vs live) are explicit.

## Discovery Rule (always run)
- `rg "concept2|Concept2|results:read|results:write|publish-to-c2|reconnect|reconciliation" src`

## Output Contract
- List touched C2 surfaces.
- State auth/scope, token, and idempotency validation results.
- Highlight unresolved operational risks (approval gates, missing secrets, or migration prerequisites).
