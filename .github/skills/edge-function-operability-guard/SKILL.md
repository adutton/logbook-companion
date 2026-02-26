---
name: edge-function-operability-guard
description: Validate Supabase Edge Function operability across auth, secrets, retries, logging, and idempotent execution.
---

Use this skill for Edge Function changes, function-triggered pipelines, or operational issues in edge runtimes.

## Operability Checklist
1. Auth and exposure:
   - `verify_jwt` setting is intentional for function purpose.
   - Unauthorized access paths are explicitly handled.
2. Configuration/secrets:
   - Required env vars/secrets are enumerated and validated.
   - No secret values are logged or hardcoded.
3. Reliability and idempotency:
   - Retries/timeouts do not create duplicate side effects.
   - Re-entrant execution is safe for expected invocation patterns.
4. Observability:
   - Error logs include actionable context without leaking sensitive data.
   - Success/failure outcomes are externally visible to callers.
5. Deployment checks:
   - Entrypoint/import map and file set are complete.
   - Post-deploy smoke path is defined.

## Output Contract
- List function(s) reviewed and auth mode.
- State secret/config, retry/idempotency, and logging validation outcomes.
- Highlight any unresolved operational risk and required follow-up.
