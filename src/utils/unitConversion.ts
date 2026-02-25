/**
 * Unit conversion utilities for height and weight.
 * DB stores metric (cm, kg). Display can show imperial (ft/in, lbs).
 */

export type MeasurementUnits = 'imperial' | 'metric';

export function isMeasurementUnits(value: unknown): value is MeasurementUnits {
  return value === 'imperial' || value === 'metric';
}

export function resolveMeasurementUnits(
  preferences: Record<string, unknown> | null | undefined,
  fallback: MeasurementUnits = 'imperial'
): MeasurementUnits {
  const maybeUnits = preferences?.units;
  return isMeasurementUnits(maybeUnits) ? maybeUnits : fallback;
}

/** Convert cm to feet and inches */
export function cmToFtIn(cm: number): { feet: number; inches: number; display: string } {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  // Handle edge case where rounding gives 12 inches
  if (inches === 12) {
    return { feet: feet + 1, inches: 0, display: `${feet + 1}'0"` };
  }
  return { feet, inches, display: `${feet}'${inches}"` };
}

/** Convert feet and inches to cm */
export function ftInToCm(feet: number, inches: number): number {
  const totalInches = feet * 12 + inches;
  return Math.round(totalInches * 2.54 * 10) / 10; // 1 decimal
}

/** Convert kg to lbs */
export function kgToLbs(kg: number): number {
  return Math.round(kg * 2.20462 * 10) / 10; // 1 decimal
}

/** Convert lbs to kg */
export function lbsToKg(lbs: number): number {
  return Math.round(lbs / 2.20462 * 100) / 100; // 2 decimals for clean round-trip
}

/** Format height for display using preferred units */
export function formatHeight(cm: number | null | undefined, units: MeasurementUnits = 'imperial'): string | null {
  if (cm == null) return null;
  if (units === 'metric') return `${cm} cm`;
  const { display } = cmToFtIn(cm);
  return `${display} (${cm} cm)`;
}

/** Format weight for display using preferred units */
export function formatWeight(kg: number | null | undefined, units: MeasurementUnits = 'imperial'): string | null {
  if (kg == null) return null;
  if (units === 'metric') return `${kg} kg`;
  const lbs = kgToLbs(kg);
  return `${lbs} lbs (${kg} kg)`;
}
