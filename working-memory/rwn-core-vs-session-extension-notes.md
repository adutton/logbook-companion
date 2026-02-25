# RWN Strategy Notes — Core vs Session Extensions

## Date
- 2026-02-25

## Goal
Capture the architectural direction for evolving RWN across Logbook Companion, ErgLink, and ReadyAll.

## 1) Shared Library Direction

### Recommendation
Create a shared RWN package, but **phase it**:
1. Start as an internal shared package (workspace/Git dependency).
2. Publish to npm after grammar and AST stabilize (target v0.2+).

### Why
- Single parser/validator/canonicalizer across all apps
- Eliminates syntax drift and duplicated bug fixes
- One test suite for all consumers

### Risk
- Publishing too early can lock unstable semantics via semver and break downstreams.

### Suggested Package Shape
- `@rwn/core`
  - Parser
  - Validator
  - Canonical naming
  - AST/type exports
- `@rwn/spec`
  - Versioned spec text
  - Example corpus
  - Grammar snapshots
- `@rwn/adapters`
  - Runtime/platform adapters (PM5/ErgLink execution mapping)

## 2) Spec Scope: Two-Layer Model

### Layer A: Core RWN
Single-athlete prescription language:
- work/rest intervals
- pacing/rate guidance
- tags and modality steps

### Layer B: Session Orchestration Extensions
Multi-actor/team flow semantics:
- partner alternation
- relay constraints
- rotating stations/groups

Coach-facing wording should stay simple:
- **On / Off** for partner swaps
- **Switch** for transition rule
- **Stations** only for true multi-station sessions

This separation keeps core grammar clean while enabling real coaching-floor session design.

## 3) Coverage of Recent Real-World Workout Patterns

### A) Partner Alternating Work/Off (e.g., 2x2000m, off while partner rows)
- Current approximation:
  - `2x2000m/...r #partner #off_equals_partner_work`
- Preferred extension concept:
  - `partner(on=2x2000m, off=wait, switch=piece_end)`

#### Partner active off-task variant (no waiting)
- `partner(on=4x1000m, off=circuit(20 burpees,20 pushups,20 situps), switch=piece_end)`

Defaults (can be omitted in most authoring):
- `switch=piece_end`
- `off=wait`

### B) Team Relay (e.g., 6 athletes, 6k total, switch every 500m)
- Current approximation:
  - `12x500m/...r #relay #team6 #total6000m`
- Preferred extension concept:
  - `relay(leg=500m,total=6000m)`

Relay defaults:
- `switch=leg_complete`
- `order=round_robin`
- `off_task=wait`
- `team_size` inferred from assigned participants when available

### C) Rotating Stations / Mixed Modalities / Timed Blocks
Example: 4x15:00 blocks rotating run, weights EMOM, erg rate ladders.
- Current approximation:
  - Variable sequence + modality prefixes + metadata tags
- Preferred extension concept:
  - `rotate(stations=4, switch=15:00, rounds=4, plan=[run(15:00), circuit(emom 3x5), row(5:00@r20+4:00@r22+3:00@r24+2:00@r26+1:00@r28), row(5:00@r22+4:00@r24+3:00@r26+2:00@r28+1:00@r30)])`

### D) Circuit block extension (new)
Use `circuit(...)` inside off-task or station plans for repeated bodyweight/mobility work.

Examples:
- `circuit(20 burpees,20 pushups,20 situps)`
- `circuit(10 jump_squats,30s plank,10 v_ups) x 3`
- `partner(on=6x500m, off=circuit(20 burpees,20 pushups,20 situps))`

Notes:
- `circuit(...)` is valid orchestration language and may include any RWN-valid sub-steps.
- PM5 target treats circuit as prompt/orchestration metadata (not device-programmed intervals).

## 4) App Implications

### Logbook Companion
- Can store full core+session AST
- Analytics initially prioritize row-capable segments
- Session metadata used for context and planning continuity

### ErgLink
- Executes erg/ski/bike-compatible segments
- Treats run/weights/rotation constructs as orchestration cues (timing/prompts)

### ReadyAll
- Documents core grammar + orchestration layer
- Uses examples to explain compatibility by platform/runtime

## 5) Practical Next Step
- Draft RWN v0.2 extension proposal:
  - AST additions for partner/relay/rotation semantics
  - Parser grammar additions (without destabilizing core)
  - Backward compatibility and degradation rules
  - Example suite and parser tests for each orchestration primitive

## 6) Decision Contract (Current)

### Terminology (Coach-facing)
- Use **On / Off** for simple partner swaps.
- Use **Switch** for transition rule.
- Use **Stations** only for true multi-station rotations.
- Avoid technical labels like `sync` and `lanes` in coach-facing UX/docs.

### Minimal Defaults (Convention over Configuration)
- Partner defaults:
  - `switch=piece_end`
  - `off=wait`
- Relay defaults:
  - `switch=leg_complete`
  - `order=round_robin`
  - `off_task=wait`
  - `team_size` inferred when participant context exists
- Therefore `relay(leg=500m,total=6000m)` is valid and complete in most cases.

### Content Model for `on` / `off` / `station`
- Any valid RWN block is allowed (superset philosophy).
- `off` may be `wait`, a single block, or `circuit(...)`.
- `station` may contain any valid RWN or modality-scoped block (`row(...)`, `run(...)`, `bike(...)`, `ski(...)`, etc.).
- Initial guardrail: no nested orchestration primitives inside these blocks (e.g., no `relay(...)` inside `off`) until v0.2+ stability.

### Target Execution Contract
Every orchestration construct gets one of:
- `exact` (target can execute directly)
- `prompt_only` (runtime cues/timers; not native to target firmware)
- `unsupported` (blocked or requires explicit fallback)

PM5-specific expectation:
- PM5 executes row-capable interval structure.
- Off-task/circuit/rotation semantics are runtime orchestration (ErgLink/LC prompts), not PM5-native programming.

### Runtime Requirement
- If `team_size`/participant order cannot be inferred at execution time, runtime must require explicit participants (or `team_size`) before launch.
