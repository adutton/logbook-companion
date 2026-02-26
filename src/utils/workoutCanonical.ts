import type { C2Interval } from '../api/concept2.types';
import type { WorkoutStructure } from '../types/workoutStructure.types';
import { parseRWN } from './rwnParser';
import { calculateCanonicalName } from './workoutNaming';
import { computeCanonicalName } from './structureAdapter';
import { normalizeForMatching } from './workoutNormalization';

const INVALID_CANONICAL = new Set(['', 'Unknown', 'Unstructured', 'Workout']);

export function normalizeCanonicalName(canonicalName: string | null | undefined): string | null {
  if (!canonicalName) return null;
  const normalized = normalizeForMatching(canonicalName.trim());
  if (!normalized || INVALID_CANONICAL.has(normalized)) return null;
  return normalized;
}

export function deriveCanonicalNameFromIntervals(intervals: C2Interval[] | null | undefined): string | null {
  if (!intervals || intervals.length === 0) return null;
  return normalizeCanonicalName(calculateCanonicalName(intervals));
}

export function deriveCanonicalNameFromStructure(structure: WorkoutStructure | null | undefined): string | null {
  if (!structure) return null;
  return normalizeCanonicalName(computeCanonicalName(structure));
}

export function deriveCanonicalNameFromRWN(rwn: string | null | undefined): string | null {
  if (!rwn?.trim()) return null;
  const structure = parseRWN(rwn);
  if (!structure) return null;
  return deriveCanonicalNameFromStructure(structure);
}

export function canonicalSignatureFromCanonicalName(canonicalName: string | null | undefined): string | null {
  return normalizeCanonicalName(canonicalName);
}
