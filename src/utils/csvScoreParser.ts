/**
 * CSV score parser for coaching assignment imports.
 * Parses CSV text (from file or paste) into structured rows
 * compatible with IntervalResult[].
 */

import { parseCsvTime } from './csvTimeParser';
import type { IntervalResult } from '../services/coaching/coachingService';

export type CsvParseMode = 'intervals' | 'single_piece';

export interface CsvParseOptions {
  mode?: CsvParseMode;
  nameColumnIndex?: number;
  singleResultColumnIndex?: number;
}

export interface CsvColumnOption {
  index: number;
  header: string;
  sample: string | null;
}

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
  columns: CsvColumnOption[];
  mode: CsvParseMode;
  nameColumnIndex: number;
  singleResultColumnIndex: number | null;
}

/**
 * Parse CSV text into structured score rows.
 * Expects header row with "Name" in first column and rep numbers/labels in subsequent columns.
 * Trailing empty columns are ignored.
 */
export function parseCsvScores(csvText: string, options: CsvParseOptions = {}): CsvParseResult {
  const errors: string[] = [];
  const lines = csvText
    .replace(/^\uFEFF/, '') // strip BOM
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);

  if (lines.length < 2) {
    return {
      rows: [],
      repCount: 0,
      errors: ['CSV must have a header row and at least one data row.'],
      columns: [],
      mode: options.mode ?? 'intervals',
      nameColumnIndex: options.nameColumnIndex ?? 0,
      singleResultColumnIndex: options.singleResultColumnIndex ?? null,
    };
  }

  const headerCells = splitCsvLine(lines[0]);
  const dataRows = lines.slice(1).map(splitCsvLine);
  const columns = buildColumnOptions(headerCells, dataRows);
  const nameColumnIndex = resolveNameColumnIndex(headerCells, dataRows, options.nameColumnIndex);
  const mode = options.mode ?? 'intervals';

  const rows: CsvScoreRow[] = [];

  if (mode === 'single_piece') {
    const singleResultColumnIndex = resolveSingleResultColumnIndex(
      headerCells,
      dataRows,
      nameColumnIndex,
      options.singleResultColumnIndex
    );

    if (singleResultColumnIndex == null) {
      return {
        rows: [],
        repCount: 0,
        errors: ['No result time column found in header.'],
        columns,
        mode,
        nameColumnIndex,
        singleResultColumnIndex: null,
      };
    }

    for (let rowIdx = 0; rowIdx < dataRows.length; rowIdx++) {
      const cells = dataRows[rowIdx];
      const name = cells[nameColumnIndex]?.trim() ?? '';

      if (!name) {
        continue;
      }

      const raw = cells[singleResultColumnIndex] ?? '';
      const { time_seconds, dnf } = parseCsvTime(raw);
      const intervals: IntervalResult[] = [
        {
          rep: 1,
          time_seconds,
          dnf: dnf || null,
        },
      ];

      rows.push({
        name,
        intervals,
        total_seconds: time_seconds,
        valid_rep_count: time_seconds != null ? 1 : 0,
        line: rowIdx + 1,
      });
    }

    return {
      rows,
      repCount: 1,
      errors,
      columns,
      mode,
      nameColumnIndex,
      singleResultColumnIndex,
    };
  }

  const intervalColumnIndices = getDefaultIntervalColumnIndices(headerCells, dataRows, nameColumnIndex);
  const repCount = intervalColumnIndices.length;

  if (repCount === 0) {
    return {
      rows: [],
      repCount: 0,
      errors: ['No rep columns found in header.'],
      columns,
      mode,
      nameColumnIndex,
      singleResultColumnIndex: null,
    };
  }

  for (let rowIdx = 0; rowIdx < dataRows.length; rowIdx++) {
    const cells = dataRows[rowIdx];
    const name = cells[nameColumnIndex]?.trim() ?? '';

    if (!name) {
      continue; // skip blank name rows
    }

    const intervals: IntervalResult[] = [];
    let totalSeconds = 0;
    let validCount = 0;

    for (let rep = 0; rep < intervalColumnIndices.length; rep++) {
      const raw = cells[intervalColumnIndices[rep]] ?? '';
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
      line: rowIdx + 1,
    });
  }

  return {
    rows,
    repCount,
    errors,
    columns,
    mode,
    nameColumnIndex,
    singleResultColumnIndex: null,
  };
}

function buildColumnOptions(headerCells: string[], dataRows: string[][]): CsvColumnOption[] {
  return headerCells.map((header, index) => ({
    index,
    header: header.trim() || `Column ${index + 1}`,
    sample: getFirstNonEmptyCell(dataRows, index),
  }));
}

function resolveNameColumnIndex(
  headerCells: string[],
  dataRows: string[][],
  preferredIndex?: number
): number {
  if (preferredIndex != null && preferredIndex >= 0 && preferredIndex < headerCells.length) {
    return preferredIndex;
  }

  const explicitNameIndex = headerCells.findIndex((header) =>
    /\b(name|athlete|rower)\b/i.test(header.trim())
  );
  if (explicitNameIndex >= 0) {
    return explicitNameIndex;
  }

  let bestIndex = 0;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (let i = 0; i < headerCells.length; i++) {
    const score = scoreNameColumn(headerCells, dataRows, i);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  return bestIndex;
}

function resolveSingleResultColumnIndex(
  headerCells: string[],
  dataRows: string[][],
  nameColumnIndex: number,
  preferredIndex?: number
): number | null {
  if (
    preferredIndex != null &&
    preferredIndex >= 0 &&
    preferredIndex < headerCells.length &&
    preferredIndex !== nameColumnIndex
  ) {
    return preferredIndex;
  }

  let bestIndex: number | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (let i = 0; i < headerCells.length; i++) {
    if (i === nameColumnIndex) continue;

    const score = scoreSingleResultColumn(headerCells, dataRows, i);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  return bestScore > 0 ? bestIndex : null;
}

function getDefaultIntervalColumnIndices(
  headerCells: string[],
  dataRows: string[][],
  nameColumnIndex: number
): number[] {
  const repHeaderColumns: number[] = [];
  const timeLikeColumns: number[] = [];

  for (let i = 0; i < headerCells.length; i++) {
    if (i === nameColumnIndex) continue;

    const header = headerCells[i].trim();
    if (!header) continue;

    if (looksLikeRepHeader(header)) {
      repHeaderColumns.push(i);
      continue;
    }

    const score = scoreSingleResultColumn(headerCells, dataRows, i);
    if (score > 0 && !isLikelyMetadataHeader(header)) {
      timeLikeColumns.push(i);
    }
  }

  return repHeaderColumns.length > 0 ? repHeaderColumns : timeLikeColumns;
}

function scoreNameColumn(headerCells: string[], dataRows: string[][], columnIndex: number): number {
  const header = headerCells[columnIndex]?.trim().toLowerCase() ?? '';
  const sample = getFirstNonEmptyCell(dataRows, columnIndex)?.trim() ?? '';
  let score = 0;

  if (!header && columnIndex === 0) score += 5;
  if (columnIndex === 0) score += 10;
  if (/\bname\b/.test(header)) score += 100;
  if (/\bathlete\b|\brower\b/.test(header)) score += 80;
  if (sample && /[a-z]/i.test(sample) && !isStructuredTimeToken(sample)) score += 20;
  if (sample && /^-?\d+(?:\.\d+)?$/.test(sample)) score -= 20;
  if (isStructuredTimeToken(sample)) score -= 30;

  return score;
}

function scoreSingleResultColumn(headerCells: string[], dataRows: string[][], columnIndex: number): number {
  const header = headerCells[columnIndex]?.trim() ?? '';
  if (!header) return Number.NEGATIVE_INFINITY;

  const stats = getColumnStats(dataRows, columnIndex);
  if (stats.timeLikeCount === 0) {
    return Number.NEGATIVE_INFINITY;
  }

  const headerLower = header.toLowerCase();
  let score = stats.timeLikeCount * 20;

  if (/\btime\b|\bresult\b|\bscore\b|\boverall\b|\bpiece\b|\btotal\b/.test(headerLower)) {
    score += 60;
  }
  if (/\b(split|pace|\/500|500m)\b/.test(headerLower)) {
    score -= 80;
  }
  if (/\b(weight|watts?|power|efficiency|classification|class|note|comment|rank|place|percent)\b/.test(headerLower)) {
    score -= 120;
  }
  if (looksLikeRepHeader(header)) {
    score += 20;
  }

  return score;
}

function getColumnStats(dataRows: string[][], columnIndex: number): { nonEmptyCount: number; timeLikeCount: number } {
  let nonEmptyCount = 0;
  let timeLikeCount = 0;

  for (const row of dataRows) {
    const value = row[columnIndex]?.trim() ?? '';
    if (!value) continue;
    nonEmptyCount++;
    if (isStructuredTimeToken(value)) {
      timeLikeCount++;
    }
  }

  return { nonEmptyCount, timeLikeCount };
}

function getFirstNonEmptyCell(dataRows: string[][], columnIndex: number): string | null {
  for (const row of dataRows) {
    const value = row[columnIndex]?.trim();
    if (value) return value;
  }
  return null;
}

function looksLikeRepHeader(header: string): boolean {
  return /^(rep\s*)?\d+$/i.test(header.trim()) || /^r\d+$/i.test(header.trim());
}

function isLikelyMetadataHeader(header: string): boolean {
  return /\b(split|pace|weight|watts?|power|efficiency|classification|class|note|comment|rank|place|percent)\b/i.test(header.trim());
}

function isStructuredTimeToken(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  if (/^dnf$/i.test(trimmed)) return true;
  if (/^\d{1,2}:\d{1,2}(?:\.\d+)?$/.test(trimmed)) return true;
  return /^\d{1,2}\.\d{2}\.\d+$/.test(trimmed);
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
