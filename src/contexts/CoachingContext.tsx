import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getTeamsForUser } from '../services/coaching/coachingService';
import type { UserTeamInfo } from '../services/coaching/types';
import { CoachingContext } from './coachingContextDef';
import type { OrgTeamGroup, CoachingContextType } from './coachingContextDef';

/** User-scoped localStorage key so different coach accounts don't collide */
const selectedTeamKey = (uid: string) => `lc_selected_team_${uid}`;
const filterTeamKey = (uid: string) => `lc_filter_team_${uid}`;



/**
 * Provides coaching context (teams, active team, switcher) to all descendants.
 * Wrap this around any route tree that needs shared team state.
 */
export function CoachingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? '';

  const [teams, setTeams] = useState<UserTeamInfo[]>([]);
  const [teamId, setTeamId] = useState<string>('');
  const [filterTeamId, setFilterTeamIdRaw] = useState<string | null>(null);
  const [isLoadingTeam, setIsLoadingTeam] = useState(true);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [hasTeam, setHasTeam] = useState<boolean | null>(null);

  // Resolve active team from list + localStorage preference
  const resolveActiveTeam = useCallback((allTeams: UserTeamInfo[]) => {
    if (allTeams.length === 0) {
      setTeamId('');
      setHasTeam(false);
      return;
    }
    const key = userId ? selectedTeamKey(userId) : '';
    const saved = key ? localStorage.getItem(key) : null;
    const match = allTeams.find((t) => t.team_id === saved);
    const active = match ?? allTeams[0];
    setTeamId(active.team_id);
    setHasTeam(true);
    if (key) localStorage.setItem(key, active.team_id);

    // Restore filter preference (null = all teams)
    const fKey = userId ? filterTeamKey(userId) : '';
    const savedFilter = fKey ? localStorage.getItem(fKey) : null;
    if (savedFilter && allTeams.some((t) => t.team_id === savedFilter)) {
      setFilterTeamIdRaw(savedFilter);
    } else {
      setFilterTeamIdRaw(null);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setIsLoadingTeam(false);
      setHasTeam(false);
      return;
    }

    getTeamsForUser(userId)
      .then((allTeams) => {
        setTeams(allTeams);
        resolveActiveTeam(allTeams);
      })
      .catch((err) => {
        setTeamError(err instanceof Error ? err.message : 'Failed to load team');
        setHasTeam(false);
      })
      .finally(() => setIsLoadingTeam(false));
  }, [userId, resolveActiveTeam]);

  /** Switch to a different team */
  const switchTeam = useCallback((newTeamId: string) => {
    const match = teams.find((t) => t.team_id === newTeamId);
    if (match) {
      setTeamId(newTeamId);
      if (userId) localStorage.setItem(selectedTeamKey(userId), newTeamId);
      // Reset filter to "All" when switching teams (org may change)
      setFilterTeamIdRaw(null);
      if (userId) localStorage.removeItem(filterTeamKey(userId));
    }
  }, [teams, userId]);

  /** Update the team filter. null = org-wide ("All Teams"). */
  const setFilterTeamId = useCallback((id: string | null) => {
    setFilterTeamIdRaw(id);
    if (userId) {
      if (id === null) {
        localStorage.removeItem(filterTeamKey(userId));
      } else {
        localStorage.setItem(filterTeamKey(userId), id);
      }
    }
  }, [userId]);

  /** Call after creating a team to refresh context */
  const refreshTeam = useCallback(async () => {
    if (!userId) return;
    setIsLoadingTeam(true);
    try {
      const allTeams = await getTeamsForUser(userId);
      setTeams(allTeams);
      resolveActiveTeam(allTeams);
      setTeamError(null);
    } catch (err) {
      setTeamError(err instanceof Error ? err.message : 'Failed to load team');
    } finally {
      setIsLoadingTeam(false);
    }
  }, [userId, resolveActiveTeam]);

  // Derived: current team info
  const activeTeam = teams.find((t) => t.team_id === teamId) ?? null;
  const teamName = activeTeam?.team_name ?? '';
  const teamRole = (activeTeam?.role ?? null) as import('../services/coaching/types').TeamRole | null;
  const orgId = activeTeam?.org_id ?? null;

  // Derived: filter team name
  const filterTeamName = filterTeamId
    ? (teams.find((t) => t.team_id === filterTeamId)?.team_name ?? teamName)
    : 'All Teams';

  // Derived: teams grouped by organization for the switcher
  const teamsByOrg = useMemo((): OrgTeamGroup[] => {
    const orgMap = new Map<string | null, OrgTeamGroup>();

    for (const t of teams) {
      const key = t.org_id ?? null;
      if (!orgMap.has(key)) {
        orgMap.set(key, {
          org_id: key,
          org_name: t.org_name ?? 'Standalone Teams',
          teams: [],
        });
      }
      orgMap.get(key)!.teams.push(t);
    }

    // Sort: named orgs first, standalone last
    const groups = Array.from(orgMap.values());
    groups.sort((a, b) => {
      if (a.org_id === null) return 1;
      if (b.org_id === null) return -1;
      return a.org_name.localeCompare(b.org_name);
    });

    return groups;
  }, [teams]);

  const value = useMemo<CoachingContextType>(() => ({
    userId,
    teamId,
    teamName,
    teamRole,
    orgId,
    activeTeam,
    teams,
    teamsByOrg,
    filterTeamId,
    filterTeamName,
    setFilterTeamId,
    isLoadingTeam,
    teamError,
    hasTeam,
    switchTeam,
    refreshTeam,
  }), [userId, teamId, teamName, teamRole, orgId, activeTeam, teams, teamsByOrg, filterTeamId, filterTeamName, setFilterTeamId, isLoadingTeam, teamError, hasTeam, switchTeam, refreshTeam]);

  return (
    <CoachingContext.Provider value={value}>
      {children}
    </CoachingContext.Provider>
  );
}


