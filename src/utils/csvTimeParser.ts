/**
 * Robust time parser for CSV-imported erg scores.
 * Handles common format variants from PM5 exports and manual entry:
 *   - "03:46.8"  → standard MM:SS.d
 *   - "3.52.4"   → period-separated (M.SS.d)
 *   - " 4:45.3"  → leading whitespace
 *   - "4:05"     → no decimal
 *   - "DNF"      → did-not-finish
 *   - ""         → empty/missing
 */

export interface ParsedTime {
  time_seconds: number | null;
  dnf: boolean;
}

/**
 * Parse a single time cell from a CSV row.
 * Returns time in total seconds (e.g., "3:46.8" → 226.8) and a DNF flag.
 */
export function parseCsvTime(raw: string): ParsedTime {
  const trimmed = raw.trim();

  if (!trimmed) {
    return { time_seconds: null, dnf: false };
  }

  if (/^dnf$/i.test(trimmed)) {
    return { time_seconds: null, dnf: true };
  }

  // Normalize: replace period-separated "M.SS.d" format → "M:SS.d"
  // Pattern: digit(s) . two-digit seconds . decimal  (e.g., "3.52.4" or "4.36.1")
  let normalized = trimmed;
  const periodMatch = normalized.match(/^(\d{1,2})\.(\d{2})\.(\d+)$/);
  if (periodMatch) {
    normalized = `${periodMatch[1]}:${periodMatch[2]}.${periodMatch[3]}`;
  }

  // Now parse standard "MM:SS.d" or "MM:SS"
  const timeMatch = normalized.match(/^(\d{1,2}):(\d{1,2}(?:\.\d+)?)$/);
  if (timeMatch) {
    const minutes = parseInt(timeMatch[1], 10);
    const seconds = parseFloat(timeMatch[2]);
    if (minutes >= 0 && seconds >= 0 && seconds < 60) {
      return { time_seconds: minutes * 60 + seconds, dnf: false };
    }
  }

  // Fallback: bare number (seconds only)
  const bare = parseFloat(normalized);
  if (!isNaN(bare) && bare > 0) {
    return { time_seconds: bare, dnf: false };
  }

  // Unrecognized → treat as missing
  return { time_seconds: null, dnf: false };
}
