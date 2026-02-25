# Implementation Log: Feature Development History

**Purpose**: Track what's been built, what worked, what failed, and why certain approaches were abandoned.

---

## Phase 21: User-Level Measurement Units Preference (February 25, 2026)

**Timeline**: February 25, 2026  
**Status**: ✅ Complete

### What Was Built

**Goal**: Make height/weight display and entry user-configurable (`imperial` vs `metric`) while keeping canonical storage metric (cm/kg), with no team-level defaults.

### Changes Implemented

#### 1. Units Model + Resolver
- `src/utils/unitConversion.ts`
   - Added `MeasurementUnits` type (`'imperial' | 'metric'`)
   - Added `isMeasurementUnits()` validator
   - Added `resolveMeasurementUnits()` preference resolver with fallback
   - Updated `formatHeight()` / `formatWeight()` to support unit-aware output

#### 2. Auth-Aware Units Hook
- `src/hooks/useMeasurementUnits.ts`
   - New hook reading `user_profiles.preferences.units`
   - Defaults to `imperial` when unset/invalid

#### 3. Preferences UI (User-Level Setting)
- `src/pages/Preferences.tsx`
   - Added **Units** section in General tab
   - Added measurement units selector:
      - `Imperial (lb, ft/in)`
      - `Metric (kg, cm)`
   - Added `updateMeasurementUnits()` with optimistic UI + DB persistence + rollback on failure

#### 4. Coaching Entry + Display Wiring
- `src/pages/coaching/CoachingAssignments.tsx`
   - Results-entry bodyweight input now follows user units label/placeholder (`lbs` or `kg`)
   - Input values convert back to kg before saving `result_weight_kg`
   - Prefill values convert from stored/profile kg into selected display units
- `src/components/coaching/AthleteEditorModal.tsx`
   - Added `units` prop
   - Height input now supports imperial (`ft/in`) or metric (`cm`)
   - Weight input now supports imperial (`lbs`) or metric (`kg`)
   - Persisted outputs remain `height_cm` and `weight_kg`
- `src/pages/coaching/CoachingRoster.tsx`
   - Inline height/weight display and editing now respect user units
   - Conversion logic updated to parse/store metric regardless of display units
   - Passes `units` prop to add-athlete modal
- `src/pages/coaching/CoachingAthleteDetail.tsx`
   - Height/weight display now unit-aware
   - Passes `units` prop to edit-athlete modal

### Verification

- `npm run build` (LogbookCompanion) → ✅ success (`tsc -b` + `vite build`)

### Outcome

Users can now choose their own measurement system globally, with coaching/profile workflows honoring that preference while data storage remains consistently metric.

---

## Phase 20: Assignment-Level Weight Capture + Dual-Unit Power-to-Weight (February 25, 2026)

**Timeline**: February 25, 2026  
**Status**: ✅ Complete

### What Was Built

**Problem**: Assignment result analytics used only athlete profile `weight_kg`, which can be stale relative to race/test day. Coaches needed to capture weight per assignment result and view power-to-weight in both metric and imperial forms.

### Changes Implemented

#### 1. Service Layer (`src/services/coaching/coachingService.ts`)
- Added `result_weight_kg?: number | null` to assignment/result row interfaces (`AthleteAssignmentRow`, `AssignmentResultRow`)
- Included `result_weight_kg` in select projections for:
   - `getAthleteAssignmentRows()`
   - `getAssignmentResultsWithAthletes()`
   - `addAthleteToAssignment()` return shape
- Updated `saveAssignmentResults()` payload typing and persistence to write `result_weight_kg` when provided

#### 2. Results Entry Modal (`src/pages/coaching/CoachingAssignments.tsx`)
- Extended `AthleteResultEntry` with `weightKg: string`
- Prefills weight from saved `result_weight_kg` or falls back to athlete profile `weight_kg`
- Added per-athlete `Wt kg` input column/field in results table
- Persisted parsed `result_weight_kg` in all save paths (completed, partial DNF, full DNF)

#### 3. Assignment Results View (`src/pages/coaching/AssignmentResults.tsx`)
- Effective weight logic now prefers `result_weight_kg`, fallback to profile `weight_kg`
- Computes both `W/kg` and `W/lb` on enriched rows
- Updated ratio rendering to display both values (`W/kg · W/lb`) in the table
- Updated W/kg chart tooltip text to include both units

#### 4. Database Migration
- Added `db/migrations/migration_add_result_weight_kg.sql`:
   - `ALTER TABLE public.daily_workout_assignments ADD COLUMN IF NOT EXISTS result_weight_kg NUMERIC;`

### Verification

- `npm run build` (LogbookCompanion) → ✅ success (`tsc -b` + `vite build`)

### Outcome

Power-to-weight analytics now reflect assignment/test-day athlete body weight when entered, with profile weight as safe fallback, and present both metric and imperial ratio units for coach usability.

---

## Phase 19: Coaching Module Deep Audit — 27 Issues Fixed (February 24, 2026)

**Timeline**: February 24, 2026  
**Status**: ✅ Complete

### What Was Built

**Problem**: After implementing org-wide assignments and boating snapshots, a comprehensive 4-subagent audit (security, robustness, type-safety, UX) uncovered 27 issues across coaching module files (8 Critical, 6 High, 7 Medium, 6 Low).

### All 27 Issues Fixed Across 12 Files

#### 1. Context Layer (`coachingContextDef.ts`, `CoachingContext.tsx`)
- Added `orgId: string | null` and `activeTeam: UserTeamInfo | null` to `CoachingContextType`
- Changed `teamRole: string | null` → `TeamRole | null` (proper union type)
- User-scoped localStorage key: `lc_selected_team_${userId}` (prevents cross-user collision)
- Exposed `orgId` and `activeTeam` in provider value memo

#### 2. Cross-Org Data Leakage Fix (`coachingService.ts`)
- `getComplianceData()`: Replaced dangerous `team_id.is.null` filter with proper two-step approach — queries `group_assignments` WHERE `org_id = orgId` to get org assignment IDs, then filters `daily_workout_assignments` with `team_id.in.(teamIds) OR group_assignment_id.in.(orgAssignmentIds)`
- Added empty `teamIds`/`orgAssignmentIds` guard (returns `[]` if both empty)

#### 3. Org Athlete Resolution (`coachingService.ts`)
- `getAssignmentResultsWithAthletes()`: Added optional `orgId` parameter, uses `getOrgAthletes(orgId)` for cross-team visibility when org assignments present

#### 4. Mutual Exclusivity Validation (`coachingService.ts`)
- `createGroupAssignment()`: Throws error if both `org_id` and `team_id` are set

#### 5. Type Safety (`types.ts`)
- `BoatPosition.athlete_name`: Changed from `string` to `string?` (optional)

#### 6. orgId Passthrough (6 UI Components)
- `CoachingRoster.tsx`: passes `orgId` to `getAssignmentCompletions`
- `CoachingSchedule.tsx`: passes `orgId` to `getGroupAssignments`
- `CoachDashboard.tsx`: passes `orgId` to `getAssignmentsForDate` and `getAssignmentCompletions`
- `CoachingAssignments.tsx`: uses context `orgId` instead of local derivation
- `AssignmentResults.tsx`: passes `orgId` to `getAssignmentResultsWithAthletes`
- `ResultsEntryModal` in `CoachingAssignments.tsx`: loads org athletes for org-wide assignments

#### 7. Boatings Hardening (`CoachingBoatings.tsx`)
- Fixed `handleInlinePositionUpdate`: passes only `{ positions: newPositions }` (not full spread with `id`, `created_at`)
- Changed all `'Unknown'` fallbacks to `''` (prevents permanent "Unknown" snapshots)
- Added try/catch + toast.error to 5 handlers
- Added teamId guards to `handleSave`, `handleDuplicate`, `handleCopyPreviousDay`

#### 8. Robustness Across 4 Components
- `CoachingRoster.tsx`: teamId guard + try/catch on handleSave/handleDelete
- `CoachingSchedule.tsx`: teamId guards + try/catch on 5 handlers, added toast import
- `CoachingErgScores.tsx`: teamId guard + try/catch on handleAddScore/handleDeleteScore, added toast import
- `CoachingAthleteDetail.tsx`: teamId guard + try/catch on handleSave/handleDelete

### Build Verification
- `npx tsc --noEmit` → Clean (zero errors)
- `npx vite build` → ✓ 2855 modules transformed, built in 8.58s, no errors

### What Worked
- Audit-first approach caught real security issues (cross-org data leakage via `team_id.is.null`)
- Systematic fix ordering (context → service → types → UI) minimized cascading changes
- All fixes passed build verification without introducing regressions

---

## Phase 18: Org-Wide Assignments & Boating Snapshots (February 23, 2026)

**Timeline**: February 23, 2026  
**Status**: ✅ Complete

### What Was Built

**Problem**: When athletes transfer between teams within an org, their workout assignments break because `group_assignments` was strictly team-scoped via `team_id`. Also, boating lineups show "Unknown" for transferred athletes because seat positions only store `athlete_id` and look up names from the current team roster.

### Changes Implemented

#### 1. Database Migration (applied to live Supabase)
- `db/migrations/20260223_add_org_assignments_and_boating_snapshots.sql`
- Added `org_id` FK on `group_assignments` referencing `organizations(id)`
- Made `team_id` nullable on `group_assignments`
- Added CHECK constraint: exactly one of `team_id` or `org_id` must be set
- Updated RLS policies to allow org-level queries via org membership
- Added index on `group_assignments(org_id)`

#### 2. TypeScript Types
- `BoatPosition`: Added optional `athlete_name?: string` for snapshot
- `GroupAssignment`: Added `org_id?: string | null`, made `team_id` optional/nullable
- `GroupAssignmentInput`: Added `org_id?: string | null`, made `team_id` optional/nullable

#### 3. Service Layer (`coachingService.ts`)
- **New**: `getTeamsForOrg(orgId)` — queries `teams` table by org_id
- **New**: `getOrgAthletes(orgId)` — fetches all athletes across all org teams, de-duplicated by athlete ID
- **Modified**: `getGroupAssignments()` — accepts optional `orgId`, uses `.or()` for org-wide + team-scoped
- **Modified**: `createGroupAssignment()` — auto-fans-out to all org athletes when `org_id` set and `team_id` null
- **Modified**: `syncAssignmentAthletes()` — handles nullable `team_id`
- **Modified**: `getComplianceData()` — queries across all org teams when `orgId` provided
- **Modified**: `getAssignmentCompletions()` — passes through `orgId`
- **Modified**: `getAssignmentsForDate()` — passes through `orgId`

#### 4. Boating UI Snapshots (`CoachingBoatings.tsx`)
- `setPosition()`: resolves + stores `athlete_name` when assigning seat
- `getAthleteNameForSeat()`: prefers snapshot name, falls back to live roster
- `handleSeatChange()`: includes `athlete_name` for inline edits
- Swap logic: preserves snapshot names during seat swaps

#### 5. Assignment UI (`CoachingAssignments.tsx`)
- Derived `orgId` from `useCoachingContext().teams`
- `loadData()`: passes `orgId` to service queries
- `CreateAssignmentForm`: new `orgId` prop, "All Teams (Org)" radio button, lazy-loaded org athletes
- `assignTo` expanded to `'all' | 'squad' | 'org'`
- `handleSubmit`: sets `org_id`/`team_id` correctly for scope
- `AssignmentCard`: "ORG" badge for org-level assignments

### Verification

- `npx tsc --noEmit` — clean (zero errors)
- `npx vite build` — clean (2855 modules, 13.68s, ~2MB bundle)

### Design Decisions

- **Fan-out at creation time**: Org-level assignments create `daily_workout_assignments` per athlete using `athlete_id` FK (not `team_id`). This makes results transfer-stable — when an athlete moves teams, their completed results stay.
- **Snapshot over live lookup**: Boating `athlete_name` snapshots prevent historical lineups from breaking when athletes transfer. Display prefers snapshot, falls back to live roster.
- **Lazy loading org athletes**: Only fetched when coach selects "All Teams" radio, avoiding unnecessary queries for team-scoped assignments.

**Result**: Coaches can now assign workouts to all athletes across an organization, and those assignments + boating records remain accurate even after athlete transfers.

---

## Phase 17: Coaching Results Modal Ladder Recognition Fix (February 18, 2026)

**Timeline**: February 18, 2026  
**Status**: ✅ Complete

### What Was Fixed

**Problem**: Team Management → Assignments `Enter Results` modal sometimes failed to recognize variable ladders (notably `1:00/5:00r + 3:00/5:00r + 7:00/5:00r`) and fell back to single-piece/freeform inputs.

**Root Cause**: Entry shape classification relied on `canonical_name` text parsing. Some templates surfaced stylized/non-parseable canonical display text (for example `v1:00...7:00 Ladder`) even though `workout_structure` JSON was correct.

### Changes Implemented

- Added `parseWorkoutStructureForEntry()` in `src/utils/workoutEntryClassifier.ts`.
- Updated `GroupAssignment` to include optional `workout_structure` in `src/services/coaching/types.ts`.
- Updated `getGroupAssignments()` to select and map `workout_templates.workout_structure` in `src/services/coaching/coachingService.ts`.
- Updated `ResultsEntryModal` in `src/pages/coaching/CoachingAssignments.tsx` to classify from `workout_structure` first, then fallback to `canonical_name` parsing only (friendly `template_name`/`title` are labels, not parse inputs).
- Updated interval rep input semantics in `ResultsEntryModal` so timed work reps request **distance** input and distance work reps request **time** input (applies to fixed interval and variable ladder reps).
- Fixed Enter Results input reset loop by memoizing computed workout shape and removing unstable array-reference effect dependency that caused repeated `getAthleteAssignmentRows()` fetches and state re-seeding.
- Added regression test in `src/utils/workoutEntryClassifier.test.ts` using the exact variable ladder JSON shape (`60s`, `180s`, `420s` work with `300s` rests).

### Verification

- Ran focused suite: `npm run test:run -- src/utils/workoutEntryClassifier.test.ts`
- Result: ✅ 4/4 tests passing.

**Result**: Results modal now recognizes ladder workouts reliably from authoritative template structure, independent of canonical label formatting.


## Phase 16: OCR Asset Extraction + Integration Deep Dive (February 15, 2026)

**Timeline**: February 15, 2026  
**Status**: ✅ Planning + Preservation Complete

### What Was Added

#### 1. OCR source preservation inside LC
Copied Train Better OCR artifacts into `working-memory/extracted-ocr/`:

#### 2. Integration deep-dive brief
Created `working-memory/train-better-ocr-deep-dive.md` documenting:

**Result**: ✅ OCR intellectual property and implementation details are preserved in-repo and translated into an actionable LC roadmap artifact.



## Phase 16: OCR Salvage Deep Dive + Integration Brief (February 15, 2026)

**Timeline**: February 15, 2026  
**Status**: ✅ Planning Complete

### What Was Added

Created `working-memory/ocr-salvage-and-integration-brief.md` to convert extracted Train Better OCR code into an implementation-ready migration plan for Logbook Companion.

#### Audit inputs reviewed
- `working-memory/extracted-ocr/OcrService.train-better.ts`
- `working-memory/extracted-ocr/ErgWorkoutParser.train-better.ts`
- `working-memory/extracted-ocr/image_processor.train-better.py`
- `working-memory/extracted-ocr/workout_parser.train-better.py`
- `train-better/functions/src/processErgImages.ts`

#### Included in the brief
- Keep/adapt/drop matrix for salvage candidates
- Minimum normalized OCR response contract
- LC target architecture (server OCR module + web adapter + Bronze ingestion bridge)
- Phase-aligned execution sequence tied to workout-capture Phase 1
- Risk register (interval misclassification, stitching artifacts, schema drift, config mismatch)

**Result**: ✅ OCR is now scoped as a low-risk migration stream with explicit implementation order and integration boundaries.

===
## Phase 15: Phase A Kickoff Pack (February 15, 2026)

**Timeline**: February 15, 2026  
**Status**: ✅ Planning Complete

### What Was Added

Created `working-memory/train-better-phase-a-kickoff-pack.md` to convert the roadmap into immediate execution assets.

#### Included in the kickoff pack
- Recommended label taxonomy for phases, workstreams, risk, and status
- Board setup blueprint (columns + custom fields)
- Phase A definition of done checklist
- Copy/paste issue templates for Epics 1-5
- Reusable Phase A task template
- Suggested initial setup task list and 30-minute kickoff agenda

**Result**: ✅ Program setup can now be executed in one pass with standardized issue structure and explicit phase gating.

===

## Phase 14: Train Better Program Roadmap + Execution Spec (February 15, 2026)

**Timeline**: February 15, 2026  
**Status**: ✅ Planning Complete

### What Was Added

Created `working-memory/train-better-change-roadmap-spec.md` to operationalize the strategy docs into a single execution artifact.

#### Included in the spec
- Phase-gated roadmap (A-F) with objectives, deliverables, entry/exit criteria
- Workstream specs (Brand/UX, Platform/Domains, Auth/Integrations, Analytics, Change Ops)
- Dependencies, risks, mitigations, and governance cadence
- Issue-ready backlog epics and program completion definition
- Conditional execution tracks for coaching split and product rename

**Result**: ✅ You now have architecture + runbook + worksheet + execution roadmap artifacts needed to begin implementation planning and commit with a complete paper trail.

===

## Phase 13: Split + Naming Decision Worksheet (February 15, 2026)

**Timeline**: February 15, 2026  
**Status**: ✅ Planning Complete

### What Was Added

Added Section 10 to `working-memory/train-better-site-architecture.md` with a one-session decision framework:
- App split readiness scorecard (0-5 criteria)
- Explicit split thresholds (go/no-go)
- Naming scorecard across multiple candidates
- Naming decision threshold (when rename is justified)
- Required evidence checklist before decision
- Fill-in decision templates and immediate kickoff checklist

**Result**: ✅ Repeatable, evidence-based process to decide both app split timing and product naming without ad hoc debate.

===

## Phase 12: Coaching Split Strategy + Naming Exploration (February 15, 2026)

**Timeline**: February 15, 2026  
**Status**: ✅ Planning Complete

### What Was Added

#### 1. Split Strategy Section in Architecture Doc
Expanded `working-memory/train-better-site-architecture.md` with:
- Keep-unified-now recommendation for in-season execution
- Split-readiness trigger checklist (2+ trigger gate)
- Target post-split domain map including `coach.train-better.app`
- Four-phase migration roadmap (boundary hardening → shell split → optimization → packaging)
- Risk/mitigation notes for auth, UI drift, and user navigation confusion

#### 2. Product Naming Exploration
Added structured evaluation for whether to keep "Logbook Companion":
- Naming decision criteria (clarity, scope fit, brand coherence, distinctiveness, migration cost)
- Option analysis (keep, soft transition, full rename)
- Recommended path: keep current name now, strengthen subtitle, revisit with post-season evidence

**Result**: ✅ Decision-quality planning artifact for both app-boundary and naming strategy without forcing immediate architectural churn.

===

## Phase 11: Train Better Hub IA + Wireframes (February 13, 2026)

**Timeline**: February 13, 2026  
**Status**: ✅ Planning Complete

### What Was Built

#### 1. Umbrella Site Architecture Document
**Problem**: Domain rollout plan existed, but there was no dedicated product/UX architecture doc for how `train-better.app` should communicate and route users across Logbook Companion and ErgLink.

**Solution**:
- Added `working-memory/train-better-site-architecture.md` as a companion to `working-memory/domain-rollout-plan.md`.
- Defined brand model, messaging hierarchy, IA/site map, and cross-site communication strategy.

#### 2. Wireframe Set (ASCII)
**What was documented**:
- Home page wireframes (desktop + mobile)
- Product detail page wireframe
- Coaches journey page wireframe

#### 3. MVP Sequencing
**Implementation order**:
1. Ship hub homepage + product pages
2. Add docs/community/support pages
3. Add analytics events and funnel tracking
4. Iterate copy and routing based on spring season usage feedback

**Result**: ✅ Clear blueprint for building `train-better.app` as umbrella site while keeping app deployments independent (`log.*`, `erg.*`).

===

## Phase 6: Workout Capture Engine (Backend) (February 6, 2026)

**Timeline**: February 6, 2026
**Status**: ✅ Complete (Backend)

### What Was Built

#### 1. Reconciliation Engine
**Problem**: Duplicate data entering system from Manual + C2 sources.
**Solution**: "Swiss Cheese" layering with source priority (Gold/Silver/Bronze).
**Logic**:
- Check for existing workout within +/- 10 mins.
- If existing, check if new source > existing source (e.g. C2 > Manual).
- If update: Update in place. If new: Insert.

#### 2. RWN Canonical Naming Updates
**Problem**: Complex nested blocks (e.g., `2 x (4 x 500m)`) not naming correctly.
**Solution**:
- Recursive block structure detection.
- Updated `workoutNaming.ts` to generate `Nx(MxDIST)` strings.
- Saved canonical name to `notes` field for visibility.

#### 3. Power Distribution & Zone Analytics
**Problem**: Power distribution data was missing or incorrectly bucketed, leading to inaccurate "Time in Zone" charts.
**Solution**:
- Integrated `getPowerDistribution` from C2 API to fetch raw stroke buckets.
- Fixed bucketing logic to align with training zones.
- Upserted to `workout_power_distribution` table for fast analytics.
- Added graceful error handling (skips if RLS/Schema fails).

===

## Phase 5: Template System Enhancement (February 4, 2026)

**Timeline**: February 4, 2026  
**Status**: ✅ Complete (pending manual migration)

### What Was Built

#### 1. Template Linking & Display Fixes
**Problem**: Template links weren't displaying on WorkoutDetail page despite being set in database

**Root Cause**: `getWorkoutDetail()` returned only C2 API data (`raw_data`), stripping database metadata

**Solution**:
```typescript
// workoutService.ts - Merge database fields into returned object
return {
    ...data.raw_data,
    workout_name: canonicalName,
    template_id: data.template_id,      // ✅ Now included
    manual_rwn: data.manual_rwn,        // ✅ Now included
    is_benchmark: data.is_benchmark     // ✅ Now included
} as C2ResultDetail;
```

**Files Changed**:
- `src/services/workoutService.ts`

**Result**: ✅ Linked templates now display correctly on WorkoutDetail page

---

#### 2. Power Distribution Error Handling
**Problem**: 406 errors when accessing `workout_power_distribution` table blocked page rendering

**Root Cause**: RLS policy requires user owns workout; when data missing or access denied → 406

**Solution**:
```typescript
// Wrap query in try-catch, handle specific error codes
try {
    const { data, error } = await supabase
        .from('workout_power_distribution')
        .select('buckets')
        .eq('workout_id', workoutId)
        .single();
    
    if (error) {
        if (error.code === 'PGRST116' || error.message?.includes('406')) {
            console.log('Power distribution not available');
            return null; // Graceful degradation
        }
    }
} catch (err) {
    return null;
}
```

**Files Changed**:
- `src/services/workoutService.ts` - `getPowerBuckets()` function

**Result**: ✅ Pages no longer crash when power distribution unavailable

---

#### 3. Global Template Library with Personal Stats
**Design Decision**: Templates shared globally, but usage tracking is personal

**Implementation**:
```typescript
// Templates: No user filter (global library)
const templates = await fetchTemplates({ workoutType: 'erg' });

// Personal stat: User-filtered workout count
const { count } = await supabase
    .from('workout_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .not('template_id', 'is', null);

// Display: "347 workouts categorized" (personal)
// vs template.usage_count (global community popularity)
```

**Files Changed**:
- `src/pages/TemplateLibrary.tsx` - Personal workout count query
- `src/services/templateService.ts` - No user filtering on templates

**Result**: ✅ Community template discovery + personal progress tracking

**See Also**: ADR-013 for decision rationale

---

#### 4. Template Sorting (Popularity vs Recency)
**Feature**: Sort templates by "Most Popular" or "Recently Used"

**Database Changes**:
```sql
-- Add last_used_at column
ALTER TABLE workout_templates 
ADD COLUMN last_used_at TIMESTAMP WITH TIME ZONE;

-- Create index for fast sorting
CREATE INDEX idx_workout_templates_last_used_at 
ON workout_templates(last_used_at DESC);

-- Update trigger to maintain both usage_count and last_used_at
CREATE OR REPLACE FUNCTION update_template_usage_count() ...
```

**UI Implementation**:
```typescript
// Sort options dropdown
<select value={sortOrder} onChange={...}>
    <option value="popular">Most Popular</option>
    <option value="recent">Recently Used</option>
</select>

// Query logic
if (sortBy === 'recent') {
    query.order('last_used_at', { ascending: false, nullsFirst: false });
} else {
    query.order('usage_count', { ascending: false });
}
```

**Files Changed**:
- `db/migrations/migration_add_last_used_at.sql` - Database migration (NOT YET APPLIED)
- `src/services/templateService.ts` - Added `sortBy` parameter
- `src/pages/TemplateLibrary.tsx` - Sort UI controls

**Result**: ✅ Code ready, ⏳ Pending manual SQL execution in Supabase

**See Also**: ADR-014 for decision rationale

---

#### 5. RWN Playground Enhancements
**Feature**: Better visualization and multi-modal workout examples

**Changes**:
1. **Categorized Examples**: Basic → Pace → Advanced → Multi-Modal
2. **Multi-Modal Examples Added**:
   - BikeErg: `Bike: 15000m`
   - SkiErg: `Ski: 8x500m/3:30r`
   - Circuit: `Row: 2000m + Bike: 5000m + Ski: 2000m`
   - Team Circuit: `3x(Row: 2000m/2:00r + Bike: 5000m/2:00r + Run: 800m/2:00r)`
3. **Layout Improvements**: Parsed structure now flex-grows to match examples height

**Files Changed**:
- `src/components/RWNPlayground.tsx` - Reorganized examples, flex layout

**Result**: ✅ Users can experiment with multi-step, multi-modal workouts

---

#### 6. RWN Specification Updates
**Feature**: Document chained guidance parameters

**Added Section 4.4**:
```markdown
### 4.4 Chaining Guidance Parameters
Multiple guidance parameters can be chained using multiple `@` symbols.

Examples:
- 30:00@UT2@r20 → 30 mins at UT2 pace, holding rate 20
- 5000m@2k+5@r28 → 5k at 2k+5 pace, holding rate 28
- 8x500m/1:00r@1:50@r32 → 500m intervals at 1:50 split and rate 32
```

**Files Changed**:
- `rwn/RWN_spec.md` - Added Section 4.4

**Result**: ✅ Specification now documents chaining syntax like `@UT2@r20`

---

#### 7. Menu & Terminology Updates
**Changes**:
- "Templates" → "Library" (clearer for community templates)
- "Analytics" → "Analysis" (user preference)

**Files Changed**:
- `src/components/Layout.tsx` - Navigation menu updates

**Result**: ✅ Improved terminology consistency

---

### What Worked
- ✅ **Graceful error handling**: Null checks prevent cascading failures
- ✅ **Database triggers**: Automatic maintenance of usage_count and last_used_at
- ✅ **Global templates**: Good for team/coaching platforms
- ✅ **Personal stats**: Users still see their own progress
- ✅ **RWN playground**: Interactive learning for complex workouts

### What Failed / Lessons Learned
- ❌ **MCP Server DDL limitations**: Can't apply migrations via MCP (permission denied)
- 📝 **Lesson**: Some operations require manual SQL execution in Supabase UI
- ❌ **Original stats confusion**: "Templates linked" was ambiguous (now "workouts categorized")
- 📝 **Lesson**: Metrics should be user-centric, not system-centric

### Pending Work
- ⏳ **Migration**: `migration_add_last_used_at.sql` needs manual execution
- ⏳ **Template effectiveness tracking**: Compare progress on same template over time
- ⏳ **Backfill script**: Auto-link entire workout history to templates
- ⏳ **Analytics improvements**: Training zone distribution, volume trends

---

## Phase 1: Foundation & Architecture (Completed)

**Timeline**: Initial development → December 2025  
**Status**: ✅ Complete

### What Was Built
1. **Monorepo Structure**
   - `packages/` organized by concern (auth, functions, ui, shared)
   - `infra/` for database schema and infrastructure
   - `scripts/` for build automation
   - Clear separation of concerns

2. **Database Schema (Multi-Tenant)**
   - Core entities: businesses, profiles, user_business_roles
   - Service business entities: service_items, clients, workers, service_instances
   - Row Level Security (RLS) policies for all tables
   - Audit trail pattern established

3. **Workspace Configuration**
   - TypeScript configured with strict mode
   - pnpm workspace setup
   - Shared tsconfig for consistency

### What Worked
- ✅ Monorepo structure keeps things organized
- ✅ Multi-tenant schema proven in ScheduleBoard v2
- ✅ RLS policies enforce security at database level
- ✅ TypeScript strict mode catches bugs early

### What Failed / Lessons Learned
- ❌ Initial plan for complex generator was over-engineered
- 📝 Lesson: Simpler instruction-driven approach is more maintainable

---

## Phase 2: Authentication System (Completed)

**Timeline**: Early development  
**Status**: ✅ Complete

### What Was Built
1. **Invite-Based Onboarding**
   - `create-invite` edge function: Creates invite records
   - `send-invite-email` edge function: Sends email via Resend
   - `process-invite` edge function: Creates account from invite
   - `get-invite` edge function: Retrieves invite details
   - `delete-user-account` edge function: Account deletion

2. **Email Integration (Resend)**
   - HTML email templates
   - Invite email with direct signup link
   - Verified domain: scheduleboard.co

3. **Role-Based Access**
   - 7-tier role system (USER → OWNER)
   - Enforced via RLS policies
   - Role assignment during invite acceptance

### What Worked
- ✅ Invite flow eliminates manual password setup
- ✅ Resend integration simple and reliable
- ✅ Role-based access clear and enforceable
- ✅ Edge Functions handle business logic securely

### What Failed / Lessons Learned
- ⚠️ Email template styling needs mobile testing
- 📝 Lesson: Always test emails on actual mobile devices
- 📝 Lesson: Edge Functions cold start can be slow (~2s)

---

## Phase 3: Notification System (Completed)

**Timeline**: Mid development  
**Status**: ✅ Complete

### What Was Built
1. **Orchestrator Pattern**
   - `notifications/orchestrator` routes notification requests
   - Determines channel (email, SMS, push) based on preferences
   - Handles retry logic and failure tracking

2. **Email Delivery**
   - `notifications/send-email` handles actual sending
   - Template selection based on notification type
   - HTML + text fallback

3. **Cleanup Job**
   - `notifications/cleanup` removes old notification records
   - Prevents database bloat
   - Runs on scheduled cron

### What Worked
- ✅ Orchestrator pattern allows future SMS/push addition
- ✅ Separation of routing from delivery is clean
- ✅ Cleanup job prevents database bloat

### What Failed / Lessons Learned
- 📝 Lesson: Need better monitoring for failed notifications
- 📝 Lesson: Retry logic should be exponential backoff

---

## Phase 4: Subscription & Payments (Completed)

**Timeline**: Mid development  
**Status**: ✅ Complete

### What Was Built
1. **Stripe Integration**
   - `subscriptions/create-intent` starts checkout
   - `subscriptions/verify-session` confirms payment
   - `subscriptions/stripe-webhooks` handles events
   - `subscriptions/check-status` validates active subscription
   - `subscriptions/manage-tier` updates plan

2. **Tiered Plans**
   - Free tier with limitations
   - Paid tiers with feature unlocks
   - Database fields track subscription status

3. **Webhook Handling**
   - Processes: payment_succeeded, subscription_updated, subscription_cancelled
   - Updates database on subscription changes
   - Idempotent webhook processing

### What Worked
- ✅ Stripe Checkout simplifies payment UI
- ✅ Webhooks keep database in sync
- ✅ Tiered access clear and enforceable
- ✅ Test mode makes development easy

### What Failed / Lessons Learned
- ⚠️ Webhook signature verification critical (security)
- 📝 Lesson: Always verify webhook signatures
- 📝 Lesson: Need clear upgrade prompts in UI

---

## Phase 5: Refactoring to Instruction-Driven (In Progress)

**Timeline**: December 15, 2025  
**Status**: 🚧 In Progress

### What's Being Built
1. **Working Memory Pattern**
   - `working-memoryory/` directory structure
   - Persistent context files (projectBrief, activeContext, etc.)
   - Integration into copilot-instructions.md

2. **Instruction Architecture**
   - Plan to create `.github/instructions/setup/`
   - Pattern documentation in `.github/instructions/patterns/`
   - Workflow templates in `.github/instructions/workflows/`
   - Business type examples

3. **Generator Deprecation**
   - Decision to move away from CLI generator
   - Keep `generator/` as reference for now
   - Focus on instruction-driven workflow

### What's Working
- ✅ Working Memory pattern solves stateless LLM problem
- ✅ Copilot-instructions.md updated with workflow
- ✅ Clear plan for instruction structure

### Current Challenges
- 🤔 Decide fate of `generator/` directory
- 🤔 How tightly to couple with ScheduleBoard v2
- 🤔 Business config: YAML vs markdown instructions

### Next Steps
1. Create `.github/instructions/setup/` structure
2. Write first setup guide (00-project-init.md)
3. Document database patterns
4. Create business type decision tree
5. Fill out remaining Working Memory files

---

## Phase 6: Component Extraction (Not Started)

**Timeline**: TBD  
**Status**: ❌ Not Started

### Planned Work
1. **Extract Core Components from ScheduleBoard v2**
   - Authentication UI components
   - Service item management components
   - Client/worker management components
   - Mobile-optimized input components

2. **Generalize Components**
   - Add BusinessConfig props
   - Make terminology configurable
   - Add feature toggle support

3. **Document Extraction**
   - Map source → template for each component
   - Document generalization decisions
   - Provide usage examples

### Dependencies
- Need Working Memory and instruction architecture complete first
- ScheduleBoard v2 production release should be stable

---

## Phase 7: Example Applications (Not Started)

**Timeline**: TBD  
**Status**: ❌ Not Started

### Planned Work
1. **HVAC Business Example**
   - Full implementation using template
   - Job tracking, technician scheduling
   - Equipment tracking

2. **Cleaning Business Example**
   - Recurring appointments
   - Team management
   - Route optimization

3. **Personal Care Example**
   - Appointment booking
   - Stylist schedules
   - Package/membership management

---

## Abandoned Approaches

### Generator CLI (Abandoned December 2025)
**Why Built**: Thought code generation would be faster  
**Why Abandoned**: Too complex to maintain, instruction-driven is better  
**What We Learned**: Copilot + instructions > custom CLI  
**Code Location**: `generator/` (kept as reference)

---

## Key Metrics & Learnings

### Development Velocity
- **Auth System**: ~3 days including edge functions
- **Notification System**: ~2 days with orchestrator pattern
- **Subscription System**: ~4 days including Stripe integration
- **Working Memory Setup**: ~1 day to establish pattern

### What Accelerates Development
1. ✅ Clear database schema defined upfront (data-first design)
2. ✅ Edge Functions for business logic (keeps frontend simple)
3. ✅ TypeScript strict mode (catches bugs early)
4. ✅ Supabase RLS (security built-in)
5. ✅ Working Memory (persistent context across sessions)

### What Slows Development
1. ⚠️ Over-engineering abstractions before needed (YAGNI violation)
2. ⚠️ Mobile testing on actual devices (necessary but time-consuming)
3. ⚠️ Webhook testing (need to use Stripe CLI or ngrok)
4. ⚠️ Cold start times on Edge Functions (2-3s on first request)

---

## Template for Future Entries

```markdown
## Phase X: [Feature Name] ([Status])

**Timeline**: [Start] → [End]  
**Status**: [Not Started | In Progress | Complete | Abandoned]

### What Was Built
1. **[Component/Feature 1]**
   - [Detail]
   - [Detail]

### What Worked
- ✅ [Success]
- ✅ [Success]

### What Failed / Lessons Learned
- ❌ [Failure]
- 📝 Lesson: [Learning]

### Metrics
- **Time Spent**: [X days/hours]
- **Lines of Code**: [Estimate]
- **Files Changed**: [Count]
```

---

# 🚀 LogbookAnalyzer Project Progress

*Separate from template history above.*

## Phase 1: Core Logic & Analytics (In Progress)

**Status**: 🚧 In Progress

### What Was Built
1.  **Workout Naming Engine**
    -   Canonical naming logic (`750/500/250...`)
    -   **Polish**: Added Fuzzy matching (avg distance), Ladder detection (`v100...1000m`), and Pyramid detection.
    -   **Refinement**: Prioritized Standard Time naming (e.g. `1x30:00`) over distance for single intervals.
    -   Handling of variable intervals and repeating patterns.
    -   Fixes for "Unstructured" misclassification.

2.  **Analytics Foundation**
    -   "Time in Zone" chart using aggregated power buckets (percentages).
    -   `PRList` component for displaying Personal Records.
    -   Raw data parsing for PR detection.

3.  **Sync Reliability**
    -   Retry logic and error handling for 500/CORS errors.
    -   Date handling fixes.

4.  **Guest Mode / Public Demo**
    -   Frontend-only implementation using curated mock data (`demoData.ts`).
    -   Bypassed Supabase calls for `isGuest` users to ensure security and prevent errors.
    -   Implemented in AuthContext, Analytics, Dashboard, and WorkoutDetail.

### Key Learnings
-   **Date Parsing**: Concept2 dates can be tricky; standardized on specific parsing logic.
-   **Interval Detection**: `rest_time` vs `rest_distance` requires careful handling for variable identifiers.

