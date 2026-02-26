---
name: analytics-integrity-guard
description: Validate analytics/chart correctness for metrics, units, aggregations, and statistical interpretation.
---

Use this skill for analytics pages, chart components, KPI cards, percentile/benchmark logic, and derived metrics.

## Key Surfaces
- `src/pages/Analytics.tsx`
- `src/pages/coaching/AssignmentResults.tsx`
- `src/pages/PublicAssignmentResultsShare.tsx`
- `src/components/analytics/**`
- `src/utils/powerProfile.ts`
- `src/utils/powerBucketing.ts`
- `src/utils/workoutAnalysis.ts`

## Integrity Checklist
1. Metric correctness:
   - Formulas and derived values are dimensionally correct.
   - Denominators/weighting assumptions are explicit.
2. Unit consistency:
   - Conversions (split, pace, watts, kg/lb, meters/seconds) are consistent and reversible.
   - Label text and tooltip units match underlying calculations.
3. Statistical integrity:
   - Median/percentile/grouping logic uses the intended filtered population.
   - Missing/partial data handling is explicit and not silently biased.
4. Visualization semantics:
   - Axis direction, reference lines, legends, and color encodings match interpretation.
   - Comparative charts avoid misleading coupling/reuse of the same signal on both axes unless intentional.

## Output Contract
- List affected metrics/charts.
- State formula and unit validation outcomes.
- Flag interpretation risks with specific chart/component references.
