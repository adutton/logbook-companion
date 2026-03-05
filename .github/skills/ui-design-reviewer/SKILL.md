---
name: ui-design-reviewer
description: Validate visual design consistency, component usage, theming, and styling for React + Tailwind CSS applications.
---

Use this skill when adding or modifying UI components, pages, dialogs, forms, cards, tables, or any visible surface.

## Design System Audit

1. **Component Library Compliance**
   - Shared UI components live in `src/components/ui/` (barrel export `index.ts`): `Button`, `Card`, `CardHeader`, `Badge`, `Input`, `Select`, `Breadcrumb`, `EmptyState`.
   - New interactive elements must use these components — never raw `<button>`, `<input>`, or `<select>` when an equivalent exists.
   - `Button` variants: `primary`, `secondary`, `danger`, `ghost`, `coaching`; sizes: `sm`, `md`, `lg`.
   - `Card` variants: `default`, `elevated`, `outlined`, `ghost`; padding: `none`, `sm`, `md`, `lg`.
   - `Badge` variants: `default`, `success`, `warning`, `danger`, `info`, `coaching`, `muted`.
   - Class composition should use `clsx` (v2.1.1) + `tailwind-merge` (v3.4.0) — never string concatenation for conditional classes.
   - Icons must come from **lucide-react** — flag any other icon library imports.
   - Forms use vanilla React state + `Input`/`Select` components with `error` prop — no form library; keep consistent.

2. **Theme Token & Design Variable Usage**
   - Project uses CSS custom properties (dark-first, light overrides in `html.light`):
     - **Surfaces:** `--color-surface-page`, `--color-surface-card`, `--color-surface-elevated`, `--color-surface-secondary`, `--color-surface-well`
     - **Text:** `--color-text-primary`, `--color-text-secondary`, `--color-text-muted`, `--color-text-faint`
     - **Borders:** `--color-border-default`, `--color-border-subtle`
     - **Accent (Emerald):** `--color-accent-primary`, `--color-accent-primary-hover`, `--color-accent-primary-text`, `--color-accent-primary-surface`
     - **Accent (Coaching/Indigo):** `--color-accent-coaching`, `--color-accent-coaching-hover`, `--color-accent-coaching-text`, `--color-accent-coaching-surface`
     - **Accent (Danger):** `--color-accent-danger`, `--color-accent-danger-hover`, `--color-accent-danger-text`
     - **Focus:** `--color-focus-ring`
   - Tailwind extensions in `tailwind.config.js` map tokens: `surface.*`, `content.*`, `border.*`, `accent.*`, `focus`.
   - **NEVER** use hardcoded hex/rgb, `bg-white`, `text-black`, `bg-gray-*`, `text-gray-*`, `border-gray-*`, or Tailwind's default neutral colors. Always use token-based classes (`bg-surface-card`, `text-content-primary`, `border-border`, etc.).
   - Shadows and border-radius should use Tailwind defaults consistently — not arbitrary `shadow-[...]` values.
   - Spacing should follow Tailwind's scale — avoid mixing rem/px/em in the same component.

3. **Typography**
   - Font family is inherited from the root — no inline font-family overrides.
   - Heading hierarchy should be consistent across similar views (same level = same size/weight).
   - Text colors must use semantic tokens (`text-content-primary`, `text-content-secondary`, `text-content-muted`) — not `text-black`, `text-white`, or raw Tailwind color scales.

4. **Button & Action Patterns**
   - Primary actions use `variant="primary"` (emerald); coaching actions use `variant="coaching"` (indigo); destructive actions use `variant="danger"`.
   - Button groups should have consistent sizing and gap spacing.
   - Icon-only buttons must include accessible labels (`aria-label` or `sr-only` text).

5. **Dark Mode Compatibility**
   - Design system is dark-first with light overrides via `html.light` class.
   - All styles must work in both modes — verify no raw color values that break in the opposite theme.
   - Gradients and shadows should degrade gracefully across modes.

6. **Animation & Transitions**
   - Use Tailwind animation utilities: `animate-spin`, `animate-pulse`, `animate-in`, `fade-in`, `slide-in-from-top-4`.
   - Hover/focus transitions: `transition-colors duration-150` or `duration-200`.
   - Loading states should use `Loader2` from lucide-react with `animate-spin` or skeleton `animate-pulse`.
   - Empty states must use the `EmptyState` component from `src/components/ui/`.

7. **Visual Hierarchy & Layout**
   - Primary content container is `Card` with `CardHeader` — verify new code follows this pattern.
   - Toast notifications use **Sonner** (`<Toaster position="top-right" richColors />`) — import `toast` from `sonner`.
   - Data displays should use consistent card-based layouts.

## Cross-Codebase Scan

When invoked, review the changed files AND scan sibling components for visual inconsistency:
- Compare card padding, heading sizes, and spacing against 2–3 similar existing components.
- Flag any new color, shadow, or custom values that don't exist in the project's theme config.
- Flag any inline `style={{}}` usage that should be Tailwind utilities.
- Flag any usage of raw neutral colors (`gray-*`, `slate-*`, `zinc-*`, `neutral-*`) instead of token classes.

## Output Contract
- List components/pages reviewed.
- State design system compliance (aligned / drifted).
- Flag specific violations with file:line and recommended fix.
- Note any new visual patterns that should be promoted to `src/components/ui/`.
