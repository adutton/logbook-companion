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

This separation keeps core grammar clean while enabling real coaching-floor session design.

## 3) Coverage of Recent Real-World Workout Patterns

### A) Partner Alternating Work/Off (e.g., 2x2000m, off while partner rows)
- Current approximation:
  - `2x2000m/...r #partner #off_equals_partner_work`
- Preferred extension concept:
  - `partner(2) :: 2x2000m / wait(partner:2000m)`

### B) Team Relay (e.g., 6 athletes, 6k total, switch every 500m)
- Current approximation:
  - `12x500m/...r #relay #team6 #total6000m`
- Preferred extension concept:
  - `relay(team=6,total=6000m,leg=500m)`

### C) Rotating Stations / Mixed Modalities / Timed Blocks
Example: 4x15:00 blocks rotating run, weights EMOM, erg rate ladders.
- Current approximation:
  - Variable sequence + modality prefixes + metadata tags
- Preferred extension concept:
  - `rotate(4, block=15:00) :: [A:Run:15:00 | B:Other:15:00#weights_emom_3x5 | C:Row:(5:00@r20+4:00@r22+3:00@r24+2:00@r26+1:00@r28) | D:Row:(5:00@r22+4:00@r24+3:00@r26+2:00@r28+1:00@r30)]`

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
