---
name: ui-ux-consistency-guard
description: Enforce modern UI/UX consistency, accessibility, and interaction standards across pages/components.
---

Use this skill for UI changes, new screens, component refactors, and interaction updates.

## Scope
- `src/pages/**`
- `src/components/**`
- Shared presentation utilities and display formatting logic used by UI.

## Validation Checklist
1. Accessibility baseline:
   - Interactive elements are keyboard reachable.
   - Focus states are visible and preserved.
   - Semantic controls/labels are used (buttons, inputs, landmarks, headings).
   - Color contrast and status communication do not rely on color alone.
2. Interaction consistency:
   - Loading/empty/error states exist and match existing app patterns.
   - Destructive actions are clear and guarded.
   - Toast/error handling is consistent with Sonner usage in the codebase.
3. Responsive behavior:
   - Layout works on mobile + desktop breakpoints already used in app.
   - Tables/charts/forms degrade gracefully on narrow screens.
4. Visual consistency:
   - Reuse existing Tailwind utility patterns/class maps.
   - Avoid introducing one-off design language when an existing pattern exists.

## Cross-Surface Consistency Rule
When updating a shared interaction pattern (filters, modals, tables, charts, navigation badges, state banners), search for and review parallel surfaces before finalizing:
- `rg "Loading|Empty|error|toast|Modal|Table|Chart|filter" src/pages src/components`

## Output Contract
- List affected UI surfaces.
- Note any a11y, responsiveness, or consistency gaps found and how they were handled.
- Flag intentional deviations from existing patterns.
