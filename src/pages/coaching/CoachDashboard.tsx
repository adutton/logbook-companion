import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Users, Calendar, Loader2, Activity, ClipboardList, BarChart3, CheckCircle2, XCircle, Settings, Plus, ChevronsRight, Building2, ChevronDown, ChevronRight, Shield, Search } from 'lucide-react';
import { useCoachingContext } from '../../hooks/useCoachingContext';
import { RowingShellIcon } from '../../components/icons/RowingIcons';
import { WeeklyFocusCard } from '../../components/coaching/WeeklyFocusCard';
import {
  getAssignmentsForDate,
  getAssignmentCompletions,
  getAthletes,
  getSessions,
  getBoatings,
  getGroupAssignments,
  getTeamStats,
  getTeamAthleteCounts,
  getOrgAthletesWithTeam,
  type GroupAssignment,
  type AssignmentCompletion,
  type CoachingAthlete,
} from '../../services/coaching/coachingService';
import type { OrgTeamGroup } from '../../contexts/coachingContextDef';
import type { CoachingBoating, CoachingSession, UserTeamInfo, TeamRole } from '../../services/coaching/types';
import { format } from 'date-fns';

type OrgSessionRow = CoachingSession & { team_name: string };
type OrgAssignmentRow = GroupAssignment & { team_name: string };
type OrgBoatingRow = CoachingBoating & { team_name: string };

const sections = [
  { path: '/team-management/roster', label: 'Roster', icon: Users, description: 'Manage athletes' },
  { path: '/team-management/schedule', label: 'Schedule & Log', icon: Calendar, description: 'Calendar, sessions & notes' },
  { path: '/team-management/assignments', label: 'Assignments', icon: ClipboardList, description: 'Assign & track workouts' },
  { path: '/team-management/boatings', label: 'Boatings', icon: RowingShellIcon, description: 'Lineups' },
  { path: '/team-management/analytics', label: 'Analytics', icon: BarChart3, description: 'Charts & performance data' },
  { path: '/team-management/live', label: 'Live Sessions', icon: Activity, description: 'Real-time monitoring' },
  { path: '/team-management/settings', label: 'Settings', icon: Settings, description: 'Team settings & members' },
];

function roleBadge(role: TeamRole) {
  switch (role) {
    case 'coach':
      return <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300"><Shield className="w-2.5 h-2.5" />Coach</span>;
    case 'coxswain':
      return <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">Coxswain</span>;
    case 'member':
      return <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-neutral-600/40 text-neutral-400">Member</span>;
    default:
      return null;
  }
}

/* ── Org Card ─────────────────────────────────────────────── */

interface OrgCardProps {
  group: OrgTeamGroup;
  activeTeamId: string;
  athleteCounts: Record<string, number>;
  onSelectTeam: (teamId: string) => void;
}

const OrgCard: React.FC<OrgCardProps> = ({ group, activeTeamId, athleteCounts, onSelectTeam }) => {
  const [expanded, setExpanded] = useState(true);
  const isOrg = group.org_id !== null;
  const totalAthletes = group.teams.reduce((sum, t) => sum + (athleteCounts[t.team_id] ?? 0), 0);

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
      {/* Org Header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4 hover:bg-neutral-800/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          {isOrg ? (
            <Building2 className="w-5 h-5 text-indigo-400 shrink-0" />
          ) : (
            <Users className="w-5 h-5 text-neutral-500 shrink-0" />
          )}
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-white truncate">{group.org_name}</h2>
            <p className="text-xs text-neutral-500">
              {group.teams.length} {group.teams.length === 1 ? 'team' : 'teams'} · {totalAthletes} {totalAthletes === 1 ? 'athlete' : 'athletes'}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-neutral-500">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </button>

      {/* Team Rows */}
      {expanded && (
        <div className="border-t border-neutral-800">
          {group.teams.map((team: UserTeamInfo) => {
            const isActive = team.team_id === activeTeamId;
            const count = athleteCounts[team.team_id] ?? 0;
            return (
              <button
                type="button"
                key={team.team_id}
                onClick={() => onSelectTeam(team.team_id)}
                className={`w-full flex items-center justify-between gap-3 px-4 py-3 sm:px-5 transition-colors text-left ${
                  isActive
                    ? 'bg-indigo-500/10 border-l-2 border-l-indigo-500'
                    : 'hover:bg-neutral-800/40 border-l-2 border-l-transparent'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium truncate ${isActive ? 'text-white' : 'text-neutral-200'}`}>
                        {team.team_name}
                      </span>
                      {isActive && (
                        <span className="shrink-0 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {roleBadge(team.role)}
                      <span className="text-xs text-neutral-500">
                        {count} {count === 1 ? 'athlete' : 'athletes'}
                      </span>
                    </div>
                  </div>
                </div>
                <ChevronRight className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-400' : 'text-neutral-600'}`} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ── Main Dashboard ───────────────────────────────────────── */

export const CoachDashboard: React.FC = () => {
  const { hasTeam, isLoadingTeam, teamId, orgId, userId, teamName, teams, teamsByOrg, switchTeam } = useCoachingContext();

  const [todayAssignments, setTodayAssignments] = useState<GroupAssignment[]>([]);
  const [completions, setCompletions] = useState<AssignmentCompletion[]>([]);
  const [todayLoading, setTodayLoading] = useState(true);
  const [teamStats, setTeamStats] = useState<{
    athleteCount: number;
    squadCount: number;
    weeklyCompletionRate: number | null;
    sessionsThisWeek: number;
  } | null>(null);
  const [athleteCounts, setAthleteCounts] = useState<Record<string, number>>({});
  const [showSectionScrollHint, setShowSectionScrollHint] = useState(false);
  const sectionTabsRef = useRef<HTMLDivElement | null>(null);
  const [orgRoster, setOrgRoster] = useState<CoachingAthlete[]>([]);
  const [orgRosterLoading, setOrgRosterLoading] = useState(false);
  const [showOrgRoster, setShowOrgRoster] = useState(false);
  const [orgRosterSearch, setOrgRosterSearch] = useState('');
  const [orgDataLoading, setOrgDataLoading] = useState(false);
  const [orgSessions, setOrgSessions] = useState<OrgSessionRow[]>([]);
  const [orgAssignments, setOrgAssignments] = useState<OrgAssignmentRow[]>([]);
  const [orgBoatings, setOrgBoatings] = useState<OrgBoatingRow[]>([]);

  // All team IDs for batch athlete count fetch
  const allTeamIds = useMemo(() => teams.map((t) => t.team_id), [teams]);
  const orgTeams = useMemo(
    () => (orgId ? teams.filter((team) => team.org_id === orgId) : []),
    [orgId, teams]
  );
  const currentOrgName = useMemo(() => {
    if (!orgId) return null;
    const fromTeam = teams.find((team) => team.org_id === orgId)?.org_name;
    if (fromTeam) return fromTeam;
    const fromGroup = teamsByOrg.find((group) => group.org_id === orgId)?.org_name;
    return fromGroup ?? 'Organization';
  }, [orgId, teams, teamsByOrg]);

  // Fetch athlete counts for all teams (single batch query)
  useEffect(() => {
    if (allTeamIds.length === 0) return;
    getTeamAthleteCounts(allTeamIds)
      .then(setAthleteCounts)
      .catch(() => { /* non-critical */ });
  }, [allTeamIds]);

  // Compute org groups with named orgs first, standalone last
  const sortedOrgGroups = useMemo(() => {
    const named = teamsByOrg.filter((g) => g.org_id !== null);
    const standalone = teamsByOrg.filter((g) => g.org_id === null);
    return [...named, ...standalone];
  }, [teamsByOrg]);

  const orgAthleteTotal = useMemo(() => {
    if (!orgId) return null;
    const orgTeamIds = teams
      .filter((team) => team.org_id === orgId)
      .map((team) => team.team_id);
    return orgTeamIds.reduce((sum, currentTeamId) => sum + (athleteCounts[currentTeamId] ?? 0), 0);
  }, [athleteCounts, orgId, teams]);

  const rosterBadgeCount = orgAthleteTotal ?? teamStats?.athleteCount;
  const orgSectionAnchors: Record<string, string> = {
    '/team-management/roster': '#org-roster',
    '/team-management/schedule': '#org-schedule',
    '/team-management/assignments': '#org-assignments',
    '/team-management/boatings': '#org-boatings',
  };

  // Fetch org roster when panel is opened
  useEffect(() => {
    if (!showOrgRoster || orgRoster.length > 0) return;
    if (!orgId && !teamId) return;
    setOrgRosterLoading(true);
    const load = orgId
      ? getOrgAthletesWithTeam(orgId)
      : getAthletes(teamId);
    load
      .then(setOrgRoster)
      .catch(() => { /* non-critical */ })
      .finally(() => setOrgRosterLoading(false));
  }, [showOrgRoster, orgRoster.length, orgId, teamId]);

  // Group org roster by team name, with search filter
  const groupedOrgRoster = useMemo(() => {
    const q = orgRosterSearch.toLowerCase().trim();
    const filtered = q
      ? orgRoster.filter(
          (a) =>
            a.name.toLowerCase().includes(q) ||
            (a.squad && a.squad.toLowerCase().includes(q)) ||
            (a.team_name && a.team_name.toLowerCase().includes(q)) ||
            (a.side && a.side.toLowerCase().includes(q))
        )
      : orgRoster;

    const groups = new Map<string, CoachingAthlete[]>();
    for (const a of filtered) {
      const key = a.team_name ?? teamName ?? 'Team';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(a);
    }
    return groups;
  }, [orgRoster, orgRosterSearch, teamName]);

  const filteredOrgRosterCount = useMemo(
    () => [...groupedOrgRoster.values()].reduce((sum, arr) => sum + arr.length, 0),
    [groupedOrgRoster]
  );

  const groupedOrgSessions = useMemo(() => {
    const groups = new Map<string, OrgSessionRow[]>();
    for (const row of orgSessions) {
      const key = row.team_name;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(row);
    }
    return groups;
  }, [orgSessions]);

  const groupedOrgAssignments = useMemo(() => {
    const groups = new Map<string, OrgAssignmentRow[]>();
    for (const row of orgAssignments) {
      const key = row.team_name;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(row);
    }
    return groups;
  }, [orgAssignments]);

  const groupedOrgBoatings = useMemo(() => {
    const groups = new Map<string, OrgBoatingRow[]>();
    for (const row of orgBoatings) {
      const key = row.team_name;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(row);
    }
    return groups;
  }, [orgBoatings]);

  useEffect(() => {
    if (!teamId) return;

    // Reset state so stale data from previous team doesn't linger
    setTodayLoading(true);
    setTodayAssignments([]);
    setCompletions([]);
    setTeamStats(null);

    const todayStr = format(new Date(), 'yyyy-MM-dd');

    Promise.all([
      getAssignmentsForDate(teamId, todayStr, orgId ?? undefined),
      getAthletes(teamId).then((athletes: CoachingAthlete[]) =>
        getAssignmentCompletions(teamId, todayStr, athletes, orgId ?? undefined)
      ),
      getTeamStats(teamId),
    ])
      .then(([asgn, comps, stats]) => {
        setTodayAssignments(asgn);
        setCompletions(comps);
        setTeamStats(stats);
      })
      .catch(() => { /* non-critical dashboard card */ })
      .finally(() => setTodayLoading(false));
  }, [teamId]);

  useEffect(() => {
    if (!orgId || orgTeams.length === 0) {
      setOrgSessions([]);
      setOrgAssignments([]);
      setOrgBoatings([]);
      return;
    }

    let cancelled = false;
    setOrgDataLoading(true);

    Promise.all(
      orgTeams.map(async (team) => {
        const [sessions, assignments, boatings] = await Promise.all([
          getSessions(team.team_id),
          getGroupAssignments(team.team_id, { orgId }),
          getBoatings(team.team_id),
        ]);
        return { teamName: team.team_name, sessions, assignments, boatings };
      })
    )
      .then((rows) => {
        if (cancelled) return;

        const assignmentSeen = new Set<string>();
        const mergedAssignments: OrgAssignmentRow[] = [];

        for (const row of rows) {
          for (const assignment of row.assignments) {
            if (assignmentSeen.has(assignment.id)) continue;
            assignmentSeen.add(assignment.id);
            mergedAssignments.push({
              ...assignment,
              team_name: assignment.team_id ? row.teamName : `${currentOrgName ?? 'Organization'}-wide`,
            });
          }
        }

        setOrgSessions(
          rows
            .flatMap((row) => row.sessions.map((session) => ({ ...session, team_name: row.teamName })))
            .sort((a, b) => b.date.localeCompare(a.date))
        );
        setOrgAssignments(
          mergedAssignments.sort((a, b) => b.scheduled_date.localeCompare(a.scheduled_date))
        );
        setOrgBoatings(
          rows
            .flatMap((row) => row.boatings.map((boating) => ({ ...boating, team_name: row.teamName })))
            .sort((a, b) => b.date.localeCompare(a.date))
        );
      })
      .catch(() => {
        if (cancelled) return;
        setOrgSessions([]);
        setOrgAssignments([]);
        setOrgBoatings([]);
      })
      .finally(() => {
        if (!cancelled) setOrgDataLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentOrgName, orgId, orgTeams]);

  useEffect(() => {
    const el = sectionTabsRef.current;
    if (!el) {
      setShowSectionScrollHint(false);
      return;
    }

    const updateHint = () => {
      const maxScrollLeft = el.scrollWidth - el.clientWidth;
      const hasOverflow = maxScrollLeft > 2;
      const atRightEdge = el.scrollLeft >= maxScrollLeft - 2;
      setShowSectionScrollHint(hasOverflow && !atRightEdge);
    };

    const raf = requestAnimationFrame(updateHint);
    el.addEventListener('scroll', updateHint, { passive: true });
    window.addEventListener('resize', updateHint);

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('scroll', updateHint);
      window.removeEventListener('resize', updateHint);
    };
  }, [teamStats?.athleteCount, teamId]);

  if (isLoadingTeam) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  // No team yet — send to onboarding
  if (hasTeam === false) {
    return <Navigate to="/team-management/setup" replace />;
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      {/* ── Page Header ──────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-white">Team Management</h1>
            <p className="text-neutral-400 mt-1">Your organizations, teams, and coaching tools.</p>
          </div>
          <Link
            to="/team-management/setup"
            className="self-start flex items-center gap-1.5 px-3 py-2 border border-neutral-700 text-neutral-300 rounded-lg hover:bg-neutral-800 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Team</span>
          </Link>
        </div>
      </div>

      {/* ── Team Section Navigation (Top-level) ───────────────── */}
      {teamId && (
        <div className="mb-8 bg-neutral-900 border border-neutral-800 rounded-xl p-2">
          <div className="relative">
            <div ref={sectionTabsRef} className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {sections.map(({ path, label, icon: Icon }) => (
                orgId && orgSectionAnchors[path] ? (
                  <a
                    key={path}
                    href={orgSectionAnchors[path]}
                    className="shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors whitespace-nowrap"
                  >
                    <Icon className="w-4 h-4 text-indigo-400" />
                    {label}
                    {path === '/team-management/roster' && rosterBadgeCount !== undefined && (
                      <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full text-[10px] font-semibold bg-neutral-700 text-neutral-200">
                        {rosterBadgeCount}
                      </span>
                    )}
                  </a>
                ) : (
                  <Link
                    key={path}
                    to={path}
                    className="shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors whitespace-nowrap"
                  >
                    <Icon className="w-4 h-4 text-indigo-400" />
                    {label}
                    {path === '/team-management/roster' && rosterBadgeCount !== undefined && (
                      <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full text-[10px] font-semibold bg-neutral-700 text-neutral-200">
                        {rosterBadgeCount}
                      </span>
                    )}
                  </Link>
                )
              ))}
            </div>
            {showSectionScrollHint && (
              <ChevronsRight className="sm:hidden pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500/80" aria-hidden="true" />
            )}
          </div>
        </div>
      )}

      {/* ── Org Roster Table ──────────────────────────────── */}
      <div id="org-roster" className="mb-8 scroll-mt-24">
        <button
          type="button"
          onClick={() => setShowOrgRoster((v) => !v)}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4 bg-neutral-900 border border-neutral-800 rounded-xl hover:bg-neutral-800/50 transition-colors text-left"
        >
          <div className="flex items-center gap-3 min-w-0">
            <Users className="w-5 h-5 text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-white">
                {orgId ? `${currentOrgName} Roster` : 'Team Roster'}
              </h2>
              <p className="text-xs text-neutral-500">
                {orgRoster.length > 0
                  ? `${orgRoster.length} athlete${orgRoster.length !== 1 ? 's' : ''} across all teams`
                  : 'View all athletes in one table'}
              </p>
            </div>
          </div>
          <div className="shrink-0 text-neutral-500">
            {showOrgRoster ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
        </button>

        {showOrgRoster && (
          <div className="mt-2 bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
            {/* Search */}
            <div className="p-3 border-b border-neutral-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  type="text"
                  value={orgRosterSearch}
                  onChange={(e) => setOrgRosterSearch(e.target.value)}
                  placeholder="Search by name, squad, team, or side…"
                  className="w-full pl-9 pr-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
              {orgRosterSearch && (
                <p className="text-xs text-neutral-500 mt-1.5 px-1">
                  {filteredOrgRosterCount} result{filteredOrgRosterCount !== 1 ? 's' : ''}
                </p>
              )}
            </div>

            {orgRosterLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
              </div>
            ) : orgRoster.length === 0 ? (
              <div className="py-10 text-center text-neutral-500 text-sm">No athletes found</div>
            ) : (
              <div className="divide-y divide-neutral-800">
                {[...groupedOrgRoster.entries()].map(([groupTeamName, athletes]) => (
                  <div key={groupTeamName}>
                    {/* Team sub-header — only when org-level with multiple teams */}
                    {orgId && groupedOrgRoster.size > 1 && (
                      <div className="px-4 py-2 bg-neutral-800/50 text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center justify-between">
                        <span>{groupTeamName}</span>
                        <span className="text-neutral-500 font-normal normal-case">
                          {athletes.length} athlete{athletes.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                    <table className="w-full text-sm">
                      <thead className="sr-only">
                        <tr>
                          <th>Name</th>
                          <th>Side</th>
                          <th>Squad</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-800/50">
                        {athletes.map((a) => (
                          <tr key={`${a.id}-${groupTeamName}`} className="hover:bg-neutral-800/30 transition-colors">
                            <td className="px-4 py-2.5 text-white font-medium">{a.name}</td>
                            <td className="px-4 py-2.5 text-neutral-400 capitalize">{a.side ?? '—'}</td>
                            <td className="px-4 py-2.5">
                              {a.squad ? (
                                <span className="inline-block px-2 py-0.5 text-xs font-medium bg-indigo-500/10 text-indigo-400 rounded-full">
                                  {a.squad}
                                </span>
                              ) : (
                                <span className="text-neutral-600">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Org / Team Hierarchy ──────────────────────────── */}
      <div className="mb-8 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500 flex items-center gap-2">
          <Building2 className="w-4 h-4" />
          {orgId ? `${currentOrgName} & Teams` : 'Organizations & Teams'}
        </h2>
        {sortedOrgGroups.map((group) => (
          <OrgCard
            key={group.org_id ?? '__standalone'}
            group={group}
            activeTeamId={teamId}
            athleteCounts={athleteCounts}
            onSelectTeam={switchTeam}
          />
        ))}
      </div>

      {/* ── Active Team Section ───────────────────────────── */}
      {teamId && (
        <>
          {orgId && (
            <div className="mb-8 space-y-4">
              <section id="org-schedule" className="scroll-mt-24 bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-5">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-500 mb-3">{currentOrgName} Schedule &amp; Log</h3>
                {orgDataLoading ? (
                  <div className="flex items-center gap-2 text-sm text-neutral-400"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
                ) : groupedOrgSessions.size === 0 ? (
                  <p className="text-sm text-neutral-500">No sessions found.</p>
                ) : (
                  <div className="space-y-3">
                    {[...groupedOrgSessions.entries()].map(([groupTeamName, rows]) => (
                      <div key={groupTeamName} className="border border-neutral-800 rounded-lg overflow-hidden">
                        <div className="px-3 py-2 bg-neutral-800/40 text-xs font-semibold uppercase tracking-wider text-neutral-400">{groupTeamName}</div>
                        <ul className="divide-y divide-neutral-800">
                          {rows.slice(0, 5).map((row) => (
                            <li key={row.id} className="px-3 py-2 text-sm text-neutral-300 flex items-center justify-between gap-2">
                              <span className="truncate">{row.type} {row.focus ? `· ${row.focus}` : ''}</span>
                              <span className="text-xs text-neutral-500 shrink-0">{row.date}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section id="org-assignments" className="scroll-mt-24 bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-5">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-500 mb-3">{currentOrgName} Assignments</h3>
                {orgDataLoading ? (
                  <div className="flex items-center gap-2 text-sm text-neutral-400"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
                ) : groupedOrgAssignments.size === 0 ? (
                  <p className="text-sm text-neutral-500">No assignments found.</p>
                ) : (
                  <div className="space-y-3">
                    {[...groupedOrgAssignments.entries()].map(([groupTeamName, rows]) => (
                      <div key={groupTeamName} className="border border-neutral-800 rounded-lg overflow-hidden">
                        <div className="px-3 py-2 bg-neutral-800/40 text-xs font-semibold uppercase tracking-wider text-neutral-400">{groupTeamName}</div>
                        <ul className="divide-y divide-neutral-800">
                          {rows.slice(0, 6).map((row) => (
                            <li key={row.id} className="px-3 py-2 text-sm text-neutral-300 flex items-center justify-between gap-2">
                              <Link
                                to={`/team-management/assignments/${row.id}/results`}
                                className="truncate text-neutral-200 hover:text-indigo-300 transition-colors"
                              >
                                {row.title || row.template_name || 'Workout assignment'}
                              </Link>
                              <div className="shrink-0 flex items-center gap-3">
                                <span className="text-xs text-neutral-500">{row.scheduled_date}</span>
                                <Link
                                  to={`/team-management/assignments/${row.id}/results`}
                                  className="text-xs text-indigo-400 hover:text-indigo-300"
                                >
                                  Results →
                                </Link>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section id="org-boatings" className="scroll-mt-24 bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-5">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-500 mb-3">{currentOrgName} Boatings</h3>
                {orgDataLoading ? (
                  <div className="flex items-center gap-2 text-sm text-neutral-400"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
                ) : groupedOrgBoatings.size === 0 ? (
                  <p className="text-sm text-neutral-500">No boatings found.</p>
                ) : (
                  <div className="space-y-3">
                    {[...groupedOrgBoatings.entries()].map(([groupTeamName, rows]) => (
                      <div key={groupTeamName} className="border border-neutral-800 rounded-lg overflow-hidden">
                        <div className="px-3 py-2 bg-neutral-800/40 text-xs font-semibold uppercase tracking-wider text-neutral-400">{groupTeamName}</div>
                        <ul className="divide-y divide-neutral-800">
                          {rows.slice(0, 6).map((row) => (
                            <li key={row.id} className="px-3 py-2 text-sm text-neutral-300 flex items-center justify-between gap-2">
                              <span className="truncate">{row.boat_name} · {row.boat_type}</span>
                              <span className="text-xs text-neutral-500 shrink-0">{row.date}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          <div className="mb-4 flex items-center gap-2">
            <div className="h-px flex-1 bg-neutral-800" />
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 shrink-0">
              {teamName} — Quick View
            </span>
            <div className="h-px flex-1 bg-neutral-800" />
          </div>

          {/* Weekly Focus */}
          <div className="mb-6">
            <WeeklyFocusCard teamId={teamId} userId={userId} />
          </div>

          {/* Team Stats */}
          {teamStats && (
            <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-white">{teamStats.athleteCount}</div>
                <div className="text-xs text-neutral-500 mt-1 flex items-center justify-center gap-1">
                  <Users className="w-3 h-3" />
                  Athletes
                </div>
              </div>
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-white">{teamStats.squadCount}</div>
                <div className="text-xs text-neutral-500 mt-1">Squads</div>
              </div>
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-white">{teamStats.sessionsThisWeek}</div>
                <div className="text-xs text-neutral-500 mt-1 flex items-center justify-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Sessions this week
                </div>
              </div>
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-center">
                {teamStats.weeklyCompletionRate !== null ? (
                  <>
                    <div className={`text-2xl font-bold ${
                      teamStats.weeklyCompletionRate >= 80 ? 'text-green-400' :
                      teamStats.weeklyCompletionRate >= 50 ? 'text-amber-400' :
                      'text-red-400'
                    }`}>
                      {teamStats.weeklyCompletionRate}%
                    </div>
                    <div className="text-xs text-neutral-500 mt-1 flex items-center justify-center gap-1">
                      <Activity className="w-3 h-3" />
                      Weekly completion
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-neutral-600">—</div>
                    <div className="text-xs text-neutral-500 mt-1">No assignments</div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Today's Workouts Card */}
          {!todayLoading && todayAssignments.length > 0 && (
            <div className="mb-6 bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-indigo-400" />
                  <h2 className="text-lg font-semibold text-neutral-100">Today&apos;s Workouts</h2>
                </div>
                <Link
                  to="/team-management/assignments"
                  className="text-xs text-indigo-400 hover:text-indigo-300"
                >
                  View all →
                </Link>
              </div>
              {todayAssignments.map((a) => {
                const comp = completions.find((c) => c.group_assignment_id === a.id);
                return (
                  <div
                    key={a.id}
                    className="flex items-center justify-between bg-neutral-800/50 rounded-lg px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-neutral-200 truncate">
                        {a.title || a.template_name || 'Workout'}
                      </div>
                      {a.training_zone && (
                        <span className="text-xs text-emerald-400">{a.training_zone}</span>
                      )}
                      {a.canonical_name && (
                        <span className="text-xs text-neutral-500 ml-2 font-mono">{a.canonical_name}</span>
                      )}
                      {a.instructions && (
                        <p className="text-xs text-neutral-500 mt-0.5 truncate">{a.instructions}</p>
                      )}
                    </div>
                    {comp && (
                      <div className="flex items-center gap-2 shrink-0 ml-4">
                        {comp.completed === comp.total ? (
                          <span className="flex items-center gap-1 text-sm text-green-400">
                            <CheckCircle2 className="w-4 h-4" />
                            All done
                          </span>
                        ) : (
                          <Link
                            to="/team-management/roster"
                            className="flex items-center gap-1 text-sm text-amber-400 hover:text-amber-300"
                          >
                            <XCircle className="w-4 h-4" />
                            {comp.completed}/{comp.total}
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};
