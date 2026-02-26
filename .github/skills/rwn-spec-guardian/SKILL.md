---
name: rwn-spec-guardian
description: Guard RWN spec compliance and track all RWN touchpoints in code. Use for parser, serializer, docs, or workout-notation changes.
---

Use this skill whenever a change touches RWN notation, parsing, serialization, docs, or PM5 lowering behavior.

## RWN Source of Truth
- `rwn/RWN_spec.md`

## Known RWN Surfaces
- `src/utils/rwnParser.ts`
- `src/utils/rwnParser.test.ts`
- `src/utils/structureToRWN.ts`
- `src/components/RWNPlayground.tsx`
- `src/pages/Documentation.tsx`
- `src/utils/rwnPm5Lowering.ts`
- `src/utils/rwnPm5Lowering.test.ts`
- `src/utils/structureToWhiteboard.ts`
- `src/utils/structureToWhiteboard.test.ts`
- `src/utils/workoutEntryClassifier.ts`
- `src/components/TemplateEditor.tsx`
- `src/pages/TemplateDetail.tsx`
- `src/pages/WorkoutDetail.tsx`
- `src/services/workoutService.ts`
- `src/docs/CORE_CONCEPTS.md`

## Discovery Rule (always run)
- Search for additional RWN usage before finalizing changes:
  - `rg "RWN|rwnParser|parseRWN|structureToRWN|sessionExtension" src`

## Validation Checklist
1. Parser and serializer remain round-trip safe for supported notation.
2. Any grammar extension updates spec/docs in the same change.
3. Playground and documentation examples stay aligned with parser behavior.
4. PM5 lowering classification (`exact`, `prompt_only`, `unsupported`) remains coherent when orchestration features are involved.
5. Tests cover both new behavior and legacy regression paths.

## Output Contract
- List touched RWN surfaces.
- State spec/doc alignment status.
- Summarize round-trip and regression-test coverage.
