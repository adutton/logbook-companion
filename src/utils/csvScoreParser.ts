/**
 * CSV score parser for coaching assignment imports.
 * Parses CSV text (from file or paste) into structured rows
 * compatible with IntervalResult[].
 */

import { parseCsvTime } from './csvTimeParser';
import type { IntervalResult } from '../services/coaching/coachingService';

export interface CsvScoreRow {
  name: string;
  intervals: IntervalResult[];
  /** Total time across all intervals (sum of non-null reps) */
  total_seconds: number | null;
  /** Number of valid (non-DNF, non-empty) reps */
  valid_rep_count: number;
  /** Original CSV line number (1-based, excluding header) */
  line: number;
}

export interface CsvParseResult {
  rows: CsvScoreRow[];
  repCount: number;
  errors: string[];
}

/**
 * Parse CSV text into structured score rows.
 * Expects header row with "Name" in first column and rep numbers/labels in subsequent columns.
 * Trailing empty columns are ignored.
 */
export function parseCsvScores(csvText: string): CsvParseResult {
  const errors: string[] = [];
  const lines = csvText
    .replace(/^\uFEFF/, '') // strip BOM
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);

  if (lines.length < 2) {
    return { rows: [], repCount: 0, errors: ['CSV must have a header row and at least one data row.'] };
  }

  const headerCells = splitCsvLine(lines[0]);

  // Determine how many rep columns exist (skip trailing empty headers)
  let repCount = 0;
  for (let i = 1; i < headerCells.length; i++) {
    if (headerCells[i].trim()) {
      repCount = i; // last non-empty header index
    }
  }
  // repCount is now the index of the last non-empty header; convert to count
  repCount = repCount; // it's already the count since columns are 1-indexed from the name column

  // Actually, let's be more precise: count non-empty header columns after the name column
  const repHeaders: string[] = [];
  for (let i = 1; i < headerCells.length; i++) {
    const h = headerCells[i].trim();
    if (h) {
      repHeaders.push(h);
    } else {
      // Stop at first empty header (trailing columns)
      break;
    }
  }
  repCount = repHeaders.length;

  if (repCount === 0) {
    return { rows: [], repCount: 0, errors: ['No rep columns found in header.'] };
  }

  const rows: CsvScoreRow[] = [];

  for (let lineIdx = 1; lineIdx < lines.length; lineIdx++) {
    const cells = splitCsvLine(lines[lineIdx]);
    const name = cells[0]?.trim() ?? '';

    if (!name) {
      continue; // skip blank name rows
    }

    const intervals: IntervalResult[] = [];
    let totalSeconds = 0;
    let validCount = 0;

    for (let rep = 0; rep < repCount; rep++) {
      const raw = cells[rep + 1] ?? '';
      const { time_seconds, dnf } = parseCsvTime(raw);

      intervals.push({
        rep: rep + 1,
        time_seconds,
        dnf: dnf || null,
      });

      if (time_seconds != null) {
        totalSeconds += time_seconds;
        validCount++;
      }
    }

    rows.push({
      name,
      intervals,
      total_seconds: validCount > 0 ? totalSeconds : null,
      valid_rep_count: validCount,
      line: lineIdx,
    });
  }

  return { rows, repCount, errors };
}

/** Split a CSV line respecting quoted fields */
function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}
