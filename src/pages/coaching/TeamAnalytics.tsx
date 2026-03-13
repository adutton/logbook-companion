import { useState, useEffect, useCallback, useMemo,  Fragment } from 'react';
import { Loader2, BarChart3, ChevronUp, ChevronDown, ChevronsUpDown, ChevronRight, Share2, Check } from 'lucide-react';
import { EmptyState } from '../../components/ui';
import { useCoachingContext } from '../../hooks/useCoachingContext';
import {
  getAthletes,
  getTeamErgComparison,
  getTeamTrainingZoneDistribution,
  getOrgErgComparison,
  getOrgTrainingZoneDistribution,
  getOrgAthletesWithTeam,
  getTeamsForOrg,
  getSeasonMeasuredLeaderboard,
  getTeam,
  rerankLeaderboard,
  getErgScores,
  type CoachingAthlete,
  type TeamErgComparison,
  type ZoneDistribution,
  type SeasonLeaderboardEntry,
  createTeamLeaderboardShare,
  buildTeamLeaderboardShareUrl,
} from '../../services/coaching/coachingService';
import { CoachingNav } from '../../components/coaching/CoachingNav';
import { ErgComparisonChart } from '../../components/coaching/ErgComparisonChart';
import { TrainingZoneDonut } from '../../components/coaching/TrainingZoneDonut';
import { RankOverTimeChart } from '../../components/coaching/RankOverTimeChart';
import { buildBest2kByAthlete, deriveBenchmarkTier, TIER_SORT_ORDER, type PerformanceTierRubricConfig } from '../../utils/performanceTierRubric';
import { getOrganizationsForUser } from '../../services/coaching/coachingService';
import { formatSplit } from '../../utils/paceCalculator';

export function TeamAnalytics() {
  const { userId, teamId, orgId, isLoadingTeam, teamError, filterTeamId } = useCoachingContext();

  const [athletes, setAthletes] = useState<CoachingAthlete[]>([]);
  const [ergComparison, setErgComparison] = useState<TeamErgComparison[]>([]);
  const [zoneDistribution, setZoneDistribution] = useState<{ zones: ZoneDistribution[]; total: number } | null>(null);
  const [seasonLeaderboard, setSeasonLeaderboard] = useState<SeasonLeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [squadFilter, setSquadFilter] = useState<string | 'all'>('all');
  const [tierFilter, setTierFilter] = useState<string | 'all'>('all');
  const [best2kByAthlete, setBest2kByAthlete] = useState<Record<string, number>>({});
  const [orgRubric, setOrgRubric] = useState<PerformanceTierRubricConfig | null>(null);
  const [lbSortField, setLbSortField] = useState<'titan_index' | 'composite_rank' | 'avg_raw_rank' | 'avg_wplb_rank'>('titan_index');
  const [lbSortAsc, setLbSortAsc] = useState(false);
  const [lbPage, setLbPage] = useState(0);
  const [expandedAthleteId, setExpandedAthleteId] = useState<string | null>(null);
  const [shareStatus, setShareStatus] = useState<'idle' | 'loading' | 'copied'>('idle');
  const [titanTestOnly, setTitanTestOnly] = useState(false);
  const LB_PAGE_SIZE = 16;

  const isOrg = !!orgId;
  // The effective team ID for single-team queries (2k benchmarks)
  const effectiveTeamId = filterTeamId ?? teamId;

  const loadData = useCallback(async () => {
    if (!teamId) return;
    setIsLoading(true);
    try {
      // Fetch team config for titan window size
      const teamConfig = await getTeam(teamId);
      const windowSize = teamConfig?.titan_window_size ?? 5;
      if (isOrg && orgId) {
        // Always fetch org-wide data; client-filter by filterTeamId
        const [, loadedAthletes, ergData, zoneDist, leaderboard] = await Promise.all([
          getTeamsForOrg(orgId),
          getOrgAthletesWithTeam(orgId),
          getOrgErgComparison(orgId).catch(() => [] as TeamErgComparison[]),
          getOrgTrainingZoneDistribution(orgId).catch(() => null),
          getSeasonMeasuredLeaderboard(teamId, { orgId, titanWindowSize: windowSize }).catch(() => [] as SeasonLeaderboardEntry[]),
        ]);
        setAthletes(loadedAthletes.filter((a) => a.side !== 'coxswain'));
        setErgComparison(ergData);
        setZoneDistribution(zoneDist);
        setSeasonLeaderboard(leaderboard);
      } else {
        // Non-org: single team only
        const [loadedAthletes, ergData, zoneDist, leaderboard] = await Promise.all([
          getAthletes(teamId),
          getTeamErgComparison(teamId).catch(() => [] as TeamErgComparison[]),
          getTeamTrainingZoneDistribution(teamId).catch(() => null),
          getSeasonMeasuredLeaderboard(teamId, { titanWindowSize: windowSize }).catch(() => [] as SeasonLeaderboardEntry[]),
        ]);
        setAthletes(loadedAthletes.filter((a) => a.side !== 'coxswain'));
        setErgComparison(ergData);
        setZoneDistribution(zoneDist);
        setSeasonLeaderboard(leaderboard);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  }, [teamId, orgId, isOrg]);

  useEffect(() => {
    if (!isLoadingTeam) loadData();
  }, [isLoadingTeam, loadData]);

  // Load org rubric
  useEffect(() => {
    if (!userId || !orgId) { setOrgRubric(null); return; }
    getOrganizationsForUser(userId)
      .then((orgs) => {
        const org = orgs.find((o) => o.id === orgId);
        setOrgRubric(org?.performance_tier_rubric ?? null);
      })
      .catch(() => setOrgRubric(null));
  }, [userId, orgId]);

  // Load 2k benchmarks
  useEffect(() => {
    if (!effectiveTeamId) return;
    getErgScores(effectiveTeamId)
      .then((scores) => setBest2kByAthlete(buildBest2kByAthlete(scores)))
      .catch(() => {});
  }, [effectiveTeamId]);

  // Reset filters when org/team changes
  useEffect(() => { setSquadFilter('all'); setTierFilter('all'); }, [orgId, filterTeamId]);

  // Client-filter by team when a specific team is selected in CoachingNav
  const teamFilteredErgData = useMemo(() => {
    if (!filterTeamId) return ergComparison;
    return ergComparison.filter((e) => e.team_id === filterTeamId);
  }, [ergComparison, filterTeamId]);

  const teamFilteredAthletes = useMemo(() => {
    if (!filterTeamId) return athletes;
    return athletes.filter((a) => a.team_id === filterTeamId);
  }, [athletes, filterTeamId]);

  const teamFilteredLeaderboard = useMemo(() => {
    if (!filterTeamId) return seasonLeaderboard;
    return seasonLeaderboard.filter((e) => e.team_id === filterTeamId);
  }, [seasonLeaderboard, filterTeamId]);

  // Squads available within the current team filter
  const squads = useMemo(
    () => [...new Set(teamFilteredAthletes.map((a) => a.squad).filter((s): s is string => !!s))].sort(),
    [teamFilteredAthletes]
  );

  // Reset squad filter when team filter changes and squad no longer exists
  useEffect(() => {
    if (squadFilter !== 'all' && !squads.includes(squadFilter)) {
      setSquadFilter('all');
    }
  }, [squads, squadFilter]);

  // Compute effective tier per athlete
  const effectiveTierByAthlete = useMemo(() => {
    const map: Record<string, string | null> = {};
    for (const a of teamFilteredAthletes) {
      const best2k = best2kByAthlete[a.id] ?? null;
      const benchmarkTier = deriveBenchmarkTier(a.squad ?? null, best2k, orgRubric);
      map[a.id] = benchmarkTier ?? a.performance_tier ?? null;
    }
    return map;
  }, [teamFilteredAthletes, best2kByAthlete, orgRubric]);

  // Distinct tiers present
  const activeTiers = useMemo(() => {
    const tierSet = new Set<string>();
    for (const tier of Object.values(effectiveTierByAthlete)) {
      if (tier) tierSet.add(tier);
    }
    return [...tierSet].sort((a, b) => (TIER_SORT_ORDER[a] ?? 99) - (TIER_SORT_ORDER[b] ?? 99));
  }, [effectiveTierByAthlete]);

  // Reset tier filter when tier no longer exists
  useEffect(() => {
    if (tierFilter !== 'all' && !activeTiers.includes(tierFilter)) {
      setTierFilter('all');
    }
  }, [activeTiers, tierFilter]);

  const filteredErgData = useMemo(() => {
    let data = squadFilter === 'all' ? teamFilteredErgData : teamFilteredErgData.filter((e) => e.squad === squadFilter);
    if (tierFilter !== 'all') {
      const athleteIdsInTier = new Set(
        teamFilteredAthletes.filter((a) => effectiveTierByAthlete[a.id] === tierFilter).map((a) => a.id)
      );
      data = data.filter((e) => athleteIdsInTier.has(e.athleteId));
    }
    return data;
  }, [teamFilteredErgData, squadFilter, tierFilter, teamFilteredAthletes, effectiveTierByAthlete]);

  const filteredAthletes = useMemo(() => {
    let result = squadFilter === 'all' ? teamFilteredAthletes : teamFilteredAthletes.filter((a) => a.squad === squadFilter);
    if (tierFilter !== 'all') {
      result = result.filter((a) => effectiveTierByAthlete[a.id] === tierFilter);
    }
    return result;
  }, [teamFilteredAthletes, squadFilter, tierFilter, effectiveTierByAthlete]);

  // Apply squad + tier filters to leaderboard (same as erg data)
  const filteredLeaderboard = useMemo(() => {
    let data = teamFilteredLeaderboard;
    if (squadFilter !== 'all') {
      data = data.filter((e) => e.squad === squadFilter);
    }
    if (tierFilter !== 'all') {
      const athleteIdsInTier = new Set(
        teamFilteredAthletes.filter((a) => effectiveTierByAthlete[a.id] === tierFilter).map((a) => a.id)
      );
      data = data.filter((e) => athleteIdsInTier.has(e.athlete_id));
    }
    // Re-rank within the filtered group so ranks are relative to visible athletes
    // Apply whenever any filter narrows the set (team, squad, or tier)
    const isFiltered = !!filterTeamId || squadFilter !== 'all' || tierFilter !== 'all';
    return isFiltered ? rerankLeaderboard(data) : data;
  }, [teamFilteredLeaderboard, squadFilter, tierFilter, teamFilteredAthletes, effectiveTierByAthlete, filterTeamId]);

  // Recompute all ranks when test-only toggle is active
  const leaderboardWithTitan = useMemo(() => {
    if (!titanTestOnly) return filteredLeaderboard; // use server-computed (all workouts)
    // Filter score_history to tests only, then re-rank everything from that subset
    const testFiltered = filteredLeaderboard.map((entry) => ({
      ...entry,
      score_history: entry.score_history.filter((h) => h.is_test),
    }));
    // Remove athletes with no test scores
    const withTests = testFiltered.filter((e) => e.score_history.length > 0);
    // Re-rank speed, efficiency, composite, and titan from test-only data
    return rerankLeaderboard(withTests);
  }, [filteredLeaderboard, titanTestOnly]);

  // Sorted leaderboard (from filtered data with titan index)
  const sortedLeaderboard = useMemo(() => {
    const sorted = [...leaderboardWithTitan].sort((a, b) => {
      if (lbSortField === 'titan_index') {
        // Higher is better, default descending
        const av = a.titan_index ?? -Infinity;
        const bv = b.titan_index ?? -Infinity;
        return lbSortAsc ? av - bv : bv - av;
      }
      // composite_rank, avg_raw_rank, avg_wplb_rank — lower is better
      const av = a[lbSortField] ?? Number.POSITIVE_INFINITY;
      const bv = b[lbSortField] ?? Number.POSITIVE_INFINITY;
      return lbSortAsc ? av - bv : bv - av;
    });
    return sorted;
  }, [leaderboardWithTitan, lbSortField, lbSortAsc]);

  const lbTotalPages = Math.max(1, Math.ceil(sortedLeaderboard.length / LB_PAGE_SIZE));
  const pagedLeaderboard = sortedLeaderboard.slice(lbPage * LB_PAGE_SIZE, (lbPage + 1) * LB_PAGE_SIZE);

  // Reset page when data or sort changes
  useEffect(() => { setLbPage(0); }, [lbSortField, lbSortAsc, filteredLeaderboard]);

  const toggleLbSort = (field: typeof lbSortField) => {
    if (lbSortField === field) {
      setLbSortAsc((prev) => !prev);
    } else {
      setLbSortField(field);
      // Titan Index: higher is better → default descending. Others: lower is better → ascending.
      setLbSortAsc(field !== 'titan_index');
    }
  };

  const LbSortIcon = ({ field }: { field: typeof lbSortField }) => {
    if (lbSortField !== field) return <ChevronsUpDown className="w-3 h-3 inline ml-1 text-neutral-600" />;
    return lbSortAsc
      ? <ChevronUp className="w-3 h-3 inline ml-1 text-indigo-400" />
      : <ChevronDown className="w-3 h-3 inline ml-1 text-indigo-400" />;
  };

  const hasZoneData= zoneDistribution && zoneDistribution.total > 0;
  const hasErgData = filteredErgData.length > 0;
  const hasLeaderboardData = sortedLeaderboard.length > 0;
  const hasAnyData = hasZoneData || hasErgData || hasLeaderboardData;

/*   // Trend arrow with popover showing per-assignment rank history
  const TrendBadge = ({ value, history }: { value: number | null; history: { date: string; rank: number; totalAthletes: number }[] }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLSpanElement>(null);

    // Close on outside click
    useEffect(() => {
      if (!open) return;
      const handler = (e: MouseEvent) => {
        if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
      };
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const arrow = (() => {
      if (value == null) return <Minus className="w-3.5 h-3.5 text-neutral-500 inline" />;
      if (value === 0) return <Minus className="w-3.5 h-3.5 text-neutral-500 inline" />;
      if (value < 0) return <ArrowUp className="w-3.5 h-3.5 text-emerald-400 inline" />;
      return <ArrowDown className="w-3.5 h-3.5 text-amber-400 inline" />;
    })();

    const fmtDate = (d: string) => {
      const dt = new Date(d + 'T00:00:00');
      return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
      <span ref={ref} className="relative inline-flex items-center cursor-pointer" onClick={() => history.length > 0 && setOpen(!open)}>
        {arrow}
        {open && history.length > 0 && (
          <div className="absolute right-0 bottom-full mb-1 z-50 bg-neutral-900 border border-neutral-700 rounded-lg p-3 shadow-xl text-xs whitespace-nowrap min-w-[140px]">
            <p className="text-neutral-400 font-medium mb-1.5">Rank History</p>
            <div className="space-y-1">
              {history.map((h, i) => (
                <div key={i} className="flex justify-between gap-4">
                  <span className="text-neutral-500">{fmtDate(h.date)}</span>
                  <span className="text-white font-mono">{h.rank}<span className="text-neutral-600">/{h.totalAthletes}</span></span>
                </div>
              ))}
            </div>
          </div>
        )}
      </span>
    );
  };
 */
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <CoachingNav />
      <div className="px-4 sm:px-6 py-6 max-w-[1400px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <BarChart3 className="w-7 h-7 text-indigo-400" />
              {isOrg ? 'Organization Analytics' : 'Team Analytics'}
            </h1>
            <p className="text-neutral-400 mt-1">Performance data and training insights</p>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4 flex-wrap">
            {/* Squad filter */}
            {squads.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Squad</span>
                <select
                  value={squadFilter}
                  onChange={(e) => setSquadFilter(e.target.value)}
                  className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  aria-label="Filter by squad"
                >
                  <option value="all">All Squads</option>
                  {squads.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            )}
            {/* Tier filter */}
            {activeTiers.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Tier</span>
                <select
                  value={tierFilter}
                  onChange={(e) => setTierFilter(e.target.value)}
                  className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  aria-label="Filter by performance tier"
                >
                  <option value="all">All Tiers</option>
                  {activeTiers.map((t) => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          </div>
        )}

        {/* Error */}
        {(error || teamError) && (
          <div className="bg-red-900/20 border border-red-800/30 rounded-xl p-4 text-red-400 text-sm">
            {error || teamError}
            {error && (
              <button onClick={() => { setError(null); loadData(); }} className="ml-3 underline hover:text-red-300">
                Retry
              </button>
            )}
          </div>
        )}

        {/* No data */}
        {!isLoading && !error && !hasAnyData && (
          <EmptyState
            icon={<BarChart3 className="w-8 h-8" />}
            title="Not enough data"
            description="Analytics will appear once athletes have completed assignments."
          />
        )}

        {/* Training Zone Distribution */}
        {!isLoading && hasZoneData && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 max-w-lg">
            <h3 className="text-sm font-medium text-neutral-400 mb-4">Training Zone Distribution</h3>
            <TrainingZoneDonut
              zones={zoneDistribution!.zones.flatMap(z =>
                Array.from({ length: z.count }, () => z.zone === 'Unset' ? null : z.zone)
              )}
            />
          </div>
        )}

        {/* Leaderboard — full width */}
        {!isLoading && hasLeaderboardData && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-medium text-neutral-400">Season Leaderboard</h3>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  if (shareStatus !== 'idle') return;
                  setShareStatus('loading');
                  try {
                    const { token } = await createTeamLeaderboardShare(teamId!, {
                      orgId,
                      filterSquad: squadFilter !== 'all' ? squadFilter : null,
                      filterTier: tierFilter !== 'all' ? tierFilter : null,
                      filterTeamId: filterTeamId ?? null,
                    });
                    const url = buildTeamLeaderboardShareUrl(token);
                    await navigator.clipboard.writeText(url);
                    setShareStatus('copied');
                    setTimeout(() => setShareStatus('idle'), 2500);
                  } catch {
                    setShareStatus('idle');
                  }
                }}
                disabled={shareStatus === 'loading'}
                className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 transition-colors disabled:opacity-50"
              >
                {shareStatus === 'copied' ? <Check className="w-3 h-3 text-emerald-400" /> : <Share2 className="w-3 h-3" />}
                {shareStatus === 'copied' ? 'Link copied!' : shareStatus === 'loading' ? 'Creating…' : 'Share'}
              </button>
            </div>
            <div className="bg-neutral-800/50 border border-neutral-700/40 rounded-lg px-4 py-3 mb-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    <span className="font-semibold text-neutral-200">{titanTestOnly ? 'Erg Test Rankings' : 'Season Rankings'}</span> — {titanTestOnly
                      ? 'see who is performing on erg tests. Rankings reflect only scored test pieces so you can identify your strongest testers.'
                      : 'see who is consistently performing across all tested workouts. Rankings reflect every scored assignment this season.'
                    } Expand a row to see individual scores, or go to <a href="/team-management/assignments" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2">Team Workouts</a> for per-workout rankings.
                  </p>
                  <p className="text-[11px] text-neutral-500 mt-1">
                    Titan Index = Z-score composite of speed + efficiency. Higher is better.{titanTestOnly ? ' Filtered to tests only.' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setTitanTestOnly(false)}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${!titanTestOnly ? 'bg-indigo-600 text-white' : 'bg-neutral-700 text-neutral-400 hover:text-neutral-200'}`}
                  >All Workouts</button>
                  <button
                    onClick={() => setTitanTestOnly(true)}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${titanTestOnly ? 'bg-indigo-600 text-white' : 'bg-neutral-700 text-neutral-400 hover:text-neutral-200'}`}
                  >Tests Only</button>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-neutral-500 border-b border-neutral-800 text-xs">
                    <th className="text-left py-2 pr-2 w-8">#</th>
                    <th className="text-left py-2 pr-2">Athlete</th>
                    <th className="text-center py-2 px-2 cursor-pointer select-none whitespace-nowrap" onClick={() => toggleLbSort('titan_index')}>
                      Titan Index<LbSortIcon field="titan_index" />
                    </th>
                    <th className="text-center py-2 px-2 cursor-pointer select-none whitespace-nowrap" onClick={() => toggleLbSort('composite_rank')}>
                      Composite<LbSortIcon field="composite_rank" />
                    </th>
                    <th className="text-center py-2 px-2 cursor-pointer select-none whitespace-nowrap" onClick={() => toggleLbSort('avg_raw_rank')}>
                      Speed<LbSortIcon field="avg_raw_rank" />
                    </th>
                    <th className="text-center py-2 px-2 cursor-pointer select-none whitespace-nowrap" onClick={() => toggleLbSort('avg_wplb_rank')}>
                      Efficiency<LbSortIcon field="avg_wplb_rank" />
                    </th>
                    <th className="text-center py-2 px-2 w-10">
                      <span title="Workouts"># Workouts</span>
                    </th>
                    {/* <th className="text-center py-2 pl-2 w-10">Trend</th> */}
                  </tr>
                </thead>
                <tbody>
                  {pagedLeaderboard.map((row, idx) => {
                    const isExpanded = expandedAthleteId === row.athlete_id;
                    const recentHistory = row.score_history.slice(0, 5); // already newest-first from service
                    return (
                      <Fragment key={row.athlete_id}>
                        <tr
                          className={`border-b border-neutral-800/50 cursor-pointer hover:bg-neutral-800/40 transition-colors ${isExpanded ? 'bg-neutral-800/30' : ''}`}
                          onClick={() => setExpandedAthleteId(isExpanded ? null : row.athlete_id)}
                        >
                          <td className="py-2 pr-2 text-neutral-500">{lbPage * LB_PAGE_SIZE + idx + 1}</td>
                          <td className="py-2 pr-2">
                            <div className="flex items-center gap-1.5">
                              <ChevronRight className={`w-3 h-3 text-neutral-600 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                              <div>
                                <div className="text-white">{row.athlete_name}</div>
                                <div className="text-[11px] text-neutral-500">
                                  {[row.squad, row.performance_tier].filter(Boolean).join(' · ') || '—'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-2 px-2 text-center font-mono text-white font-semibold">{row.titan_index != null ? row.titan_index.toFixed(1) : '—'}</td>
                          <td className="py-2 px-2 text-center font-mono text-neutral-300">{row.composite_rank ?? '—'}</td>
                          <td className="py-2 px-2 text-center font-mono text-neutral-300">{row.avg_raw_rank ?? '—'}</td>
                          <td className="py-2 px-2 text-center font-mono text-neutral-300">{row.avg_wplb_rank ?? '—'}</td>
                          <td className="py-2 px-2 text-center font-mono text-neutral-500">{row.assignment_count}</td>
                          {/* <td className="py-2 pl-2 text-center">
                            <TrendBadge value={row.trend_raw_rank} history={row.rank_history} />
                          </td> */}
                        </tr>
                        {isExpanded && recentHistory.length > 0 && (
                          <tr className="bg-neutral-800/20">
                            <td colSpan={8} className="px-4 py-2">
                              <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1.5 font-semibold">Recent workouts (newest first)</div>
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-neutral-600">
                                    <th className="text-left py-1 pr-2">Workout</th>
                                    <th className="text-left py-1 px-2">Date</th>
                                    <th className="text-right py-1 px-2">Split</th>
                                    <th className="text-right py-1 px-2">Time</th>
                                    <th className="text-right py-1 pl-2">Efficiency</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {recentHistory.map((h) => (
                                    <tr key={h.assignmentId} className="text-neutral-400 border-t border-neutral-800/30">
                                      <td className="py-1 pr-2">
                                        <a
                                          href={`/team-management/assignments/${h.assignmentId}/results`}
                                          className="text-indigo-400 hover:text-indigo-300 hover:underline"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          {h.label}
                                        </a>
                                      </td>
                                      <td className="py-1 px-2 text-neutral-500">{new Date(h.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                                      <td className="py-1 px-2 text-right font-mono">{formatSplit(h.split)}</td>
                                      <td className="py-1 px-2 text-right font-mono">{h.time != null ? formatLeaderboardTime(h.time) : '—'}</td>
                                      <td className="py-1 pl-2 text-right font-mono">{h.wplb != null ? h.wplb.toFixed(2) : '—'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        )}
                        {isExpanded && recentHistory.length === 0 && (
                          <tr className="bg-neutral-800/20">
                            <td colSpan={8} className="px-4 py-3 text-xs text-neutral-500 italic">No workout history available</td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
              {/* Pagination */}
              {lbTotalPages > 1 && (
                <div className="flex items-center justify-between mt-3 text-xs text-neutral-500">
                  <span>Page {lbPage + 1} of {lbTotalPages} ({sortedLeaderboard.length} athletes)</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setLbPage((p) => Math.max(0, p - 1))}
                      disabled={lbPage === 0}
                      className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed"
                    >Prev</button>
                    <button
                      onClick={() => setLbPage((p) => Math.min(lbTotalPages - 1, p + 1))}
                      disabled={lbPage >= lbTotalPages - 1}
                      className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed"
                    >Next</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Charts row */}
        {!isLoading && (hasErgData || hasLeaderboardData) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Erg Comparison Chart */}
            {hasErgData && (
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
                <h3 className="text-sm font-medium text-neutral-400 mb-4">Erg Comparison</h3>
                <ErgComparisonChart data={filteredErgData} athletes={filteredAthletes} />
              </div>
            )}

            {/* Rank Over Time Chart */}
            {hasLeaderboardData && (
              <RankOverTimeChart leaderboard={filteredLeaderboard} />
            )}
          </div>
        )}

      </div>
    </div>
  );
}

/** Format total seconds as M:SS.t (e.g. 6:46.2) for leaderboard display */
function formatLeaderboardTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs.toFixed(1)}`;
}


