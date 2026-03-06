/**
 * Athlete name matching for CSV imports.
 * Matches CSV names to enrolled CoachingAthlete records using
 * exact match first, then fuzzy matching.
 */

import type { CoachingAthlete } from '../services/coaching/types';

export interface NameMatch {
  csvName: string;
  csvLine: number;
  athlete: CoachingAthlete | null;
  confidence: 'exact' | 'fuzzy' | 'none';
  /** Alternative candidates for manual resolution (sorted by score desc) */
  candidates: Array<{ athlete: CoachingAthlete; score: number }>;
}

export interface MatchResult {
  matches: NameMatch[];
  /** Athletes enrolled in the assignment but not in the CSV */
  unmatchedAthletes: CoachingAthlete[];
}

/**
 * Match CSV row names against enrolled athletes.
 * Priority: exact match (case-insensitive) → fuzzy (Levenshtein + substring) → unmatched.
 */
export function matchAthleteNames(
  csvRows: Array<{ name: string; line: number }>,
  athletes: CoachingAthlete[]
): MatchResult {
  const remaining = new Set(athletes.map((a) => a.id));
  const matches: NameMatch[] = [];

  for (const row of csvRows) {
    const csvNorm = normalize(row.name);

    // 1. Exact match (case-insensitive, trimmed)
    const exact = athletes.find(
      (a) => remaining.has(a.id) && normalize(a.name) === csvNorm
    );
    if (exact) {
      remaining.delete(exact.id);
      matches.push({
        csvName: row.name,
        csvLine: row.line,
        athlete: exact,
        confidence: 'exact',
        candidates: [],
      });
      continue;
    }

    // 2. Score all remaining athletes for fuzzy matching
    const scored = athletes
      .filter((a) => remaining.has(a.id))
      .map((a) => ({ athlete: a, score: fuzzyScore(csvNorm, normalize(a.name)) }))
      .filter((s) => s.score > 0.3)
      .sort((a, b) => b.score - a.score);

    if (scored.length > 0 && scored[0].score >= 0.6) {
      // Auto-match if confidence is high enough
      remaining.delete(scored[0].athlete.id);
      matches.push({
        csvName: row.name,
        csvLine: row.line,
        athlete: scored[0].athlete,
        confidence: 'fuzzy',
        candidates: scored.slice(0, 5),
      });
    } else {
      // No confident match — needs manual resolution
      matches.push({
        csvName: row.name,
        csvLine: row.line,
        athlete: null,
        confidence: 'none',
        candidates: scored.slice(0, 5),
      });
    }
  }

  const unmatchedAthletes = athletes.filter((a) => remaining.has(a.id));
  return { matches, unmatchedAthletes };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function normalize(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Combined fuzzy scoring: weighted blend of Levenshtein similarity,
 * token overlap, and substring containment.
 */
function fuzzyScore(a: string, b: string): number {
  if (!a || !b) return 0;

  const levSim = 1 - levenshtein(a, b) / Math.max(a.length, b.length);
  const tokenSim = tokenOverlap(a, b);
  const substringBonus = a.includes(b) || b.includes(a) ? 0.3 : 0;

  return Math.min(1, levSim * 0.4 + tokenSim * 0.4 + substringBonus * 0.2 + substringBonus);
}

/** Token (word) overlap ratio */
function tokenOverlap(a: string, b: string): number {
  const tokA = new Set(a.split(' '));
  const tokB = new Set(b.split(' '));
  let overlap = 0;
  for (const t of tokA) {
    if (tokB.has(t)) overlap++;
  }
  return overlap / Math.max(tokA.size, tokB.size);
}

/** Levenshtein edit distance */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}
