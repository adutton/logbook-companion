# Whiteboard Workout Example — RWN Mapping

> Real-world coaching whiteboard from a practice session, annotated with RWN equivalents.

## Original Whiteboard

```
A. Warmup

B.
    PARTNER
    10x 3', 30" transition
    2:30, [24-26], last :30" open

C. Suspension Discussion

D. Abs/Stretch
```

## RWN Mapping

| Section | Whiteboard | RWN | Notes |
|---------|-----------|-----|-------|
| **A** | Warmup | `[w]10:00` (duration varies) | Block tag for warmup |
| **B** | PARTNER / 10x 3', 30" transition / 2:30, [24-26], last :30" open | `partner(on=10x(2:30@r24..26 + 0:30@open)/30sr, off=wait, switch=piece_end)` | See breakdown below |
| **C** | Suspension Discussion | *(outside RWN scope)* | Non-rowing: coaching session management |
| **D** | Abs/Stretch | *(outside RWN scope)* | Non-rowing: off-erg work |

### Section B Breakdown

The core rowing piece uses several RWN features:

| Whiteboard Element | Meaning | RWN Syntax |
|---|---|---|
| `PARTNER` | Two athletes share one erg, alternating | `partner(on=..., off=wait, switch=piece_end)` |
| `10x` | 10 repetitions | `10x(...)` |
| `3'` | 3-minute pieces | `2:30 + 0:30` (split into guidance segments) |
| `30" transition` | 30 seconds to switch between partners | `/30sr` (rest component) |
| `2:30, [24-26]` | First 2:30 controlled at rate 24-26 | `2:30@r24..26` |
| `last :30" open` | Last 30 seconds: sprint/no restriction | `0:30@open` |

### Key RWN Features Used

1. **`'`/`"` shorthand** (§11.2): `3'` = 3:00, `30"` = 0:30 — input tolerance for coach notation
2. **`@open` guidance** (§4.4): Intentional no-restriction instruction — distinct from omitting guidance
3. **Compound segments for sub-interval guidance** (§5.3): The `+` operator splits a 3-minute piece into `2:30 + 0:30` with different guidance per segment. PM5 beeps at the boundary, signaling the athlete to change effort.
4. **Session orchestration** (partner): Wraps the core workout in `partner()` to describe the multi-athlete flow

### Full RWN (canonical)

```
partner(on=10x(2:30@r24..26 + 0:30@open)/30sr, off=wait, switch=piece_end)
```