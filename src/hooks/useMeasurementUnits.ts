import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { resolveMeasurementUnits, type MeasurementUnits } from '../utils/unitConversion';

export function useMeasurementUnits(): MeasurementUnits {
  const { profile } = useAuth();

  return useMemo(() => {
    const prefs = (profile?.preferences ?? null) as Record<string, unknown> | null;
    return resolveMeasurementUnits(prefs, 'imperial');
  }, [profile?.preferences]);
}
