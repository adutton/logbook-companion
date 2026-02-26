---
name: preflight-test-gate
description: Enforce lightweight pre/post-change validation. Use for code changes before handoff or commit.
---

Use this skill whenever code changes are made.

## Validation Sequence
1. Run targeted tests first (focused unit/spec files tied to changed areas) when available.
2. Run repository checks:
   - `npm run lint`
   - `npm run build`
   - `npm run test:run`
3. If full tests are too expensive during iteration, run targeted tests and clearly mark full-suite status as pending.

## Failure Handling
- On failure, report first failing command and root-cause file(s).
- Prefer minimal fixes that preserve behavior.
- Re-run only impacted checks, then re-run the full required sequence before final handoff.

## Output Contract
- Commands executed.
- Pass/fail status for each command.
- Remaining risk (if any), especially if full suite was deferred.
