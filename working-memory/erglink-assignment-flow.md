# ErgLink Assignment Completion Flow

## Mermaid Diagram

```mermaid
flowchart TD
A[Coach creates assignment in LC] --> B[Coach starts live session]
B --> C[LC writes erg_sessions.active_workout JSON]
C --> C1[Includes: type/start_type + canonical_name + template_id + group_assignment_id]
C1 --> D[Athlete joins in ErgLink]
D --> E[ErgLink reads active_workout and programs PM5]
E --> F[Athlete rows]
F --> G[ErgLink uploads workout_log]
G --> G1[source=erg_link_live]
G --> G2[raw_data contains group_assignment_id/canonical_name/template_id]
G --> H[LC auto-link step]
H --> H1[Find athlete by user_id]
H1 --> H2[Update daily_workout_assignments]
H2 --> H3[Set completed=true and completed_log_id]
H3 --> H4[Guard: only if completed_log_id is NULL]

G --> I[Workout visible in LC history]
I --> J[Optional later C2 sync]
J --> K[Reconciliation match check]
K --> L[Merge/upgrade duplicate records]
L --> M[Single clean record, assignment remains linked]
```

## ASCII Diagram

```text
+-------------------------------+
| Coach creates assignment (LC) |
+---------------+---------------+
                |
                v
+-------------------------------+
| Coach starts live session     |
+---------------+---------------+
                |
                v
+------------------------------------------------------+
| LC writes erg_sessions.active_workout                |
| - workout config (type/start_type)                   |
| - canonical_name                                     |
| - template_id                                        |
| - group_assignment_id  <-- key for assignment link   |
+---------------+--------------------------------------+
                |
                v
+-------------------------------+
| Athlete joins ErgLink         |
+---------------+---------------+
                |
                v
+-------------------------------+
| ErgLink reads active_workout  |
| and programs PM5              |
+---------------+---------------+
                |
                v
+-------------------------------+
| Athlete rows                  |
+---------------+---------------+
                |
                v
+------------------------------------------------------+
| ErgLink uploads workout_log                          |
| source = 'erg_link_live'                             |
| raw_data has: group_assignment_id, canonical_name... |
+---------------+--------------------------------------+
                |
                v
+------------------------------------------------------+
| LC auto-link assignment                              |
| 1) find athlete by user_id                           |
| 2) update daily_workout_assignments                  |
| 3) set completed=true + completed_log_id             |
| 4) guard: only if completed_log_id is NULL           |
+---------------+--------------------------------------+
                |
                v
+-------------------------------+
| Assignment shows completed    |
+---------------+---------------+
                |
                v
+-------------------------------+
| Optional later C2 sync        |
+---------------+---------------+
                |
                v
+-------------------------------+
| Reconciliation merge/upgrade  |
| (dedupe same workout records) |
+-------------------------------+
```

## Notes

- ErgLink knows it is assignment-linked only when `group_assignment_id` is present in `active_workout`.
- `group_assignment_id` is strongest for assignment completion; `canonical_name` helps matching/reconciliation context.
- C2 sync is not required for initial assignment completion from ErgLink uploads.
