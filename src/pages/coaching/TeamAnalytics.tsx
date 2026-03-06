import { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2, BarChart3 } from 'lucide-react';
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
  type CoachingAthlete,
  type TeamErgComparison,
  type ZoneDistribution,
  type SeasonLeaderboardEntry,
} from '../../services/coaching/coachingService';
import { CoachingNav } from '../../components/coaching/CoachingNav';
import { SquadPowerComparisonChart } from '../../components/coaching/SquadPowerComparisonChart';
import { WattsPerKgChart } from '../../components/coaching/WattsPerKgChart';
import { TrainingZoneDonut } from '../../components/coaching/TrainingZoneDonut';

export function TeamAnalytics() {
  const { teamId, orgId, isLoadingTeam, teamError, filterTeamId } = useCoachingContext();

  const [athletes, setAthletes] = useState<CoachingAthlete[]>([]);
  const [ergComparison, setErgComparison] = useState<TeamErgComparison[]>([]);
  const [zoneDistribution, setZoneDistribution] = useState<{ zones: ZoneDistribution[]; total: number } | null>(null);
  const [seasonLeaderboard, setSeasonLeaderboard] = useState<SeasonLeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [squadFilter, setSquadFilter] = useState<string | 'all'>('all');

  const isOrg = !!orgId;
  // Sync team filter with nav pills — null means "all"
  const teamFilter = filterTeamId ?? 'all';

  const loadData = useCallback(async () => {
    if (!teamId) return;
    setIsLoading(true);
    try {
      if (isOrg && orgId) {
        // Org-level: load data across all teams
        const [, loadedAthletes, ergData, zoneDist] = await Promise.all([
          getTeamsForOrg(orgId),
          getOrgAthletesWithTeam(orgId),
          getOrgErgComparison(orgId).catch(() => [] as TeamErgComparison[]),
          getOrgTrainingZoneDistribution(orgId).catch(() => null),
        ]);
        // Exclude coxswain-sided athletes — they don't erg
        setAthletes(loadedAthletes.filter((a) => a.side !== 'coxswain'));
        setErgComparison(ergData);
        setZoneDistribution(zoneDist);
        setSeasonLeaderboard([]);
      } else {
        // Single team
        const [loadedAthletes, ergData, zoneDist, leaderboard] = await Promise.all([
          getAthletes(teamId),
          getTeamErgComparison(teamId).catch(() => [] as TeamErgComparison[]),
          getTeamTrainingZoneDistribution(teamId).catch(() => null),
          getSeasonMeasuredLeaderboard(teamId, { limit: 10 }).catch(() => [] as SeasonLeaderboardEntry[]),
        ]);
        // Exclude coxswain-sided athletes — they don't erg
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

  // Reset squad filter when org changes
  useEffect(() => { setSquadFilter('all'); }, [orgId, filterTeamId]);

  // Filter by team first, then by squad
  const teamFilteredErgData = useMemo(
    () => teamFilter === 'all' ? ergComparison : ergComparison.filter((e) => e.team_id === teamFilter),
    [ergComparison, teamFilter]
  );

  const teamFilteredAthletes = useMemo(
    () => teamFilter === 'all' ? athletes : athletes.filter((a) => a.team_id === teamFilter),
    [athletes, teamFilter]
  );

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

  const filteredErgData = useMemo(
    () => squadFilter === 'all' ? teamFilteredErgData : teamFilteredErgData.filter((e) => e.squad === squadFilter),
    [teamFilteredErgData, squadFilter]
  );

  const filteredAthletes = useMemo(
    () => squadFilter === 'all' ? teamFilteredAthletes : teamFilteredAthletes.filter((a) => a.squad === squadFilter),
    [teamFilteredAthletes, squadFilter]
  );

  const hasZoneData = zoneDistribution && zoneDistribution.total > 0;
  const hasErgData = ergComparison.length > 0;
  const hasAnyData = hasZoneData || hasErgData;

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

        {/* Erg Charts */}
        {!isLoading && hasErgData && (
          <>
            {filteredErgData.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
                  <h3 className="text-sm font-medium text-neutral-400 mb-4">Power Comparison</h3>
                  <SquadPowerComparisonChart data={filteredErgData} />
                </div>
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
                  <h3 className="text-sm font-medium text-neutral-400 mb-4">Watts / kg Ratio</h3>
                  <WattsPerKgChart ergData={filteredErgData} athletes={filteredAthletes} />
                </div>
              </div>
            ) : (
              <p className="text-sm text-neutral-500">
                No erg data for this {teamFilter !== 'all' ? 'team' : squadFilter !== 'all' ? 'squad' : 'selection'}.
              </p>
            )}
          </>
        )}

        {/* Season leaderboard */}
        {!isLoading && !isOrg && seasonLeaderboard.length > 0 && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
            <h3 className="text-sm font-medium text-neutral-400 mb-4">Measured Workout Leaderboard (Season-to-date)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-neutral-500 border-b border-neutral-800">
                    <th className="text-left py-2 pr-3">#</th>
                    <th className="text-left py-2 pr-3">Athlete</th>
                    <th className="text-right py-2 pr-3">Avg Rank</th>
                    <th className="text-right py-2 pr-3">Avg W/lb Rank</th>
                    <th className="text-right py-2 pr-3">Tests</th>
                    <th className="text-right py-2">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {seasonLeaderboard.slice(0, 10).map((row, idx) => (
                    <tr key={row.athlete_id} className="border-b border-neutral-800/50">
                      <td className="py-2 pr-3 text-neutral-400">{idx + 1}</td>
                      <td className="py-2 pr-3">
                        <div className="text-white">{row.athlete_name}</div>
                        <div className="text-[11px] text-neutral-500">
                          {[row.squad, row.performance_tier].filter(Boolean).join(' · ') || '—'}
                        </div>
                      </td>
                      <td className="py-2 pr-3 text-right font-mono text-neutral-200">{row.avg_raw_rank != null ? row.avg_raw_rank.toFixed(2) : '—'}</td>
                      <td className="py-2 pr-3 text-right font-mono text-neutral-200">{row.avg_wplb_rank != null ? row.avg_wplb_rank.toFixed(2) : '—'}</td>
                      <td className="py-2 pr-3 text-right font-mono text-neutral-300">{row.assignment_count}</td>
                      <td className="py-2 text-right font-mono">
                        {row.trend_raw_rank == null ? (
                          <span className="text-neutral-500">—</span>
                        ) : row.trend_raw_rank < 0 ? (
                          <span className="text-emerald-400">{row.trend_raw_rank.toFixed(0)}</span>
                        ) : row.trend_raw_rank > 0 ? (
                          <span className="text-amber-400">+{row.trend_raw_rank.toFixed(0)}</span>
                        ) : (
                          <span className="text-neutral-400">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
