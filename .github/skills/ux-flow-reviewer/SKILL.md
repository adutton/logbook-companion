---
name: ux-flow-reviewer
description: Validate user experience quality — flows, responsiveness, accessibility, mobile-native feel, and interaction patterns for React + Tailwind + Capacitor apps.
---

Use this skill when adding or modifying pages, navigation, forms, dialogs, modals, drawers, or any user-facing interaction. LC is a web SPA; EL (erg-link) is the Capacitor mobile app — both share Supabase backend and auth.

## UX Flow Audit

1. **Mobile-First Responsiveness**
   - Layouts must be designed mobile-first (320px baseline) and progressively enhanced for tablet/desktop.
   - Phone layouts should use single-column stacked flows — no horizontal scrolling on small screens.
   - Touch targets must be minimum 44x44px on mobile (Apple HIG / Material Design guidelines).
   - LC navigation: fixed left sidebar (64 units) on desktop, hamburger overlay menu on mobile (`md:hidden` breakpoint).
   - Forms must account for virtual keyboard on mobile web — content should remain visible and scrollable.

2. **Navigation & Wayfinding**
   - LC uses `<BrowserRouter>` with `<Routes>` in `App.tsx`; protected routes wrap in `<Layout>` (sidebar/header).
   - Every page should have a clear title and use `Breadcrumb` component for hierarchical context where appropriate.
   - Active navigation state must be visually distinct in the sidebar.
   - Deep links and direct URL access must work — no reliance on in-memory navigation state alone.
   - Special routes: public share links (`/share/assignment-results/:shareToken`), auth flows, 404 handling.

3. **Form & Input UX**
   - Use `Input` and `Select` components from `src/components/ui/` with `error` prop for inline validation.
   - Multi-step forms should show clear progress indication (stepper, progress bar, or step count).
   - Validation errors must appear inline near the offending field — not just as toasts.
   - Submit buttons must use `Button` with loading state (`disabled` + `Loader2` spinner) during async operations.
   - Destructive actions (delete, archive, cancel) must require confirmation — never single-click execution.
   - Confirmation dialogs for async operations should stay open if the operation fails, not auto-dismiss.

4. **Feedback & Loading States**
   - All async operations must show immediate feedback (optimistic UI, skeleton `animate-pulse`, or `Loader2` spinner).
   - Success feedback uses **Sonner** toast: `toast.success(...)` — not blocking modals.
   - Error feedback must be actionable: describe what failed and what the user can do about it.
   - Empty states must use the `EmptyState` component with icon, title, description, and action — not a blank screen.
   - Long lists should show loading indicators and support pagination or virtual scrolling.

5. **Real-Time & Data Sync** (if applicable)
   - Real-time data should use Supabase Realtime subscriptions — not polling.
   - Concept2 sync operations should show pending/synced/error states visually.
   - Network errors during sync should surface actionable feedback, not silent failures.

6. **Accessibility (a11y)**
   - Interactive elements must be keyboard-navigable with visible focus indicators (using `--color-focus-ring` token).
   - Images and icons conveying meaning must have `alt` text or `aria-label`.
   - Color must not be the sole indicator of state — pair with icons, text, or patterns.
   - Icon-only `Button` components must include `aria-label` or `sr-only` text.
   - Dialog focus trapping must work correctly.
   - Screen reader text (`sr-only`) for status indicators and icon-only controls.

7. **Coaching Module UX**
   - Coaching flows use the `coaching` variant (indigo accent) for visual distinction from athlete flows (emerald).
   - Coach team management routes: `/coaching/setup` (TeamSetup), `/coaching/settings` (CoachingSettings).
   - `CoachDashboard` redirects no-team users to setup — verify this flow is smooth.
   - Role-based UI: coaches see coaching controls; athletes see read-only coaching data.

8. **Flow Completeness**
   - Every user action should have a clear entry point, execution path, and completion state.
   - Flows should not dead-end — after completing an action, guide the user to the next logical step.
   - Error recovery paths must exist — users should be able to retry or go back on failure.
   - Saved-state confirmation should be explicit — users must know their data was persisted.

## Cross-Flow Consistency Check

When invoked, evaluate the changed flow against existing patterns:
- Compare with 2–3 similar flows in the app for interaction consistency.
- Flag any flow that behaves differently from established patterns without justification.
- Verify new pages/features are reachable from navigation (sidebar links, contextual navigation).

## Output Contract
- List pages/flows/interactions reviewed.
- State UX quality assessment (solid / needs attention / has issues).
- Flag specific issues with severity (critical: blocks users, moderate: confusing, minor: polish).
- Recommend concrete fixes referencing existing components/patterns from the codebase.
- Note any new interaction patterns that should be documented in `working-memory/systemPatterns.md`.
