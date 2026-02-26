---
name: rowing-domain-validator
description: Validate rowing/training logic using domain principles and repository knowledge-base guidance.
---

Use this skill for changes involving training zones, pacing targets, workout design, athlete load, or coaching recommendations.

## Knowledge Sources
Read and prioritize repository knowledge before finalizing behavior:
- `kb/physiology/zones-and-pacing.md`
- `kb/physiology/rowing-training-physiology.md`
- `kb/physiology/power-duration-curve.md`
- `kb/training-plans/training-plans-overview.md`
- `kb/coaching-plans/assistant-coach-cue-sheets.md`
- `kb/injury-prevention/injury-prevention.md`

## Domain Validation Checklist
- Units are internally consistent (split, pace, watts, meters, seconds, body mass).
- Intensity labels/zone mappings are coherent with physiological intent.
- Work/rest structure is plausible for the stated session goal.
- Progression/load assumptions do not create obvious overtraining risk.
- Youth/novice contexts avoid unrealistic targets and preserve technique focus.
- Safety cues and recovery expectations are not silently dropped.

## Output Contract
- State which domain checks were applied.
- Cite KB sources used for any non-obvious decision.
- Flag questionable coaching logic explicitly (do not silently normalize).
