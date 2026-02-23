import { useContext } from 'react';
import { CoachingContext } from '../contexts/coachingContextDef';

export type { OrgTeamGroup } from '../contexts/coachingContextDef';

/**
 * Hook to access coaching context. Must be used within a CoachingProvider.
 */
export function useCoachingContext() {
  const ctx = useContext(CoachingContext);
  if (!ctx) {
    throw new Error('useCoachingContext must be used within a CoachingProvider');
  }
  return ctx;
}
