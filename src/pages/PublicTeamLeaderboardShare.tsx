import { useState, useEffect, useMemo, Fragment } from 'react';
import { Loader2, ChevronRight, Trophy, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import {
  resolveTeamLeaderboardShare,
  type TeamLeaderboardShareData,
} from '../services/coaching/coachingService';
import { formatSplit } from '../utils/paceCalculator';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function wattsFromSplit(splitSec: number): number {
  return 2.8 / Math.pow(splitSec / 500, 3);
}

function calcAvgSplit(intervals: Array<{ split_seconds?: number | null; time_seconds?: number | null; distance_meters?: number | null }> | null): number | null {
  if (!intervals || intervals.length === 0) return null;
  const valid = intervals.filter((i) => i.split_seconds != null && i.split_seconds > 0);
  if (valid.length === 0) return null;
  return valid.reduce((s, i) => s + i.split_seconds!, 0) / valid.length;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec - m * 60;
  return `${m}:${s < 10 ? '0' : ''}${s.toFixed(1)}`;
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface LeaderboardRow {
  athlete_id: string;
  athlete_name: string;
  squad: string | null;
  performance_tier: string | null;
  team_name: string | null;
  titan_index: number | null;
  latest_split: number | null;
  latest_time: number | null;
  latest_distance: number | null;
  latest_wplb: number | null;
  avg_speed_rank: number | null;
  avg_eff_rank: number | null;
  assignment_count: number;
  score_history: Array<{
    assignmentId: string;
    label: string;
    date: string;
    split: number;
    time: number | null;
    wplb: number | null;
  }>;
}

type SortField = 'titan' | 'speed' | 'efficiency';

// ─── Leaderboard Computation ─────────────────────────────────────────────────

function buildLeaderboard(data: TeamLeaderboardShareData): LeaderboardRow[] {
  const { assignments, results } = data;
  if (assignments.length === 0 || results.length === 0) return [];

  // Build assignment label map
  const assignmentLabels = new Map<string, string>();
  for (const a of assignments) {
    assignmentLabels.set(a.id, a.title || a.template_name || a.canonical_name || 'Workout');
  }

  // Group results by athlete
  const perAthlete = new Map<string, {
    name: string; squad: string | null; tier: string | null; teamName: string | null;
    speedRanks: number[]; effRanks: number[];
    latest: { split: number | null; time: number | null; distance: number | null; wplb: number | null; date: string };
    history: LeaderboardRow['score_history'];
  }>();

  // Process assignments newest-first (they come DESC from RPC)
  for (const assignment of assignments) {
    const assignmentResults = results
      .filter((r) => r.group_assignment_id === assignment.id && r.completed)
      .map((r) => {
        const split = r.result_split_seconds && r.result_split_seconds > 0
          ? r.result_split_seconds
          : calcAvgSplit(r.result_intervals as Array<{ split_seconds?: number | null }> | null);
        if (!split || split <= 0) return null;

        const weightKg = (r.result_weight_kg && r.result_weight_kg > 0)
          ? r.result_weight_kg
          : (r.weight_kg && r.weight_kg > 0 ? r.weight_kg : null);
        const watts = wattsFromSplit(split);
        const wplb = weightKg ? (watts / weightKg) / 2.20462 : null;
        const time = r.result_time_seconds && r.result_time_seconds > 0 ? r.result_time_seconds : null;
        const distance = r.result_distance_meters && r.result_distance_meters > 0 ? r.result_distance_meters : null;

        return {
          athlete_id: r.athlete_id,
          athlete_name: r.athlete_name,
          squad: r.squad,
          tier: r.performance_tier,
          team_name: r.team_name,
          split, wplb, time, distance,
        };
      })
      .filter(Boolean) as Array<{
        athlete_id: string; athlete_name: string; squad: string | null; tier: string | null; team_name: string | null;
        split: number; wplb: number | null; time: number | null; distance: number | null;
      }>;

    if (assignmentResults.length === 0) continue;

    // Rank by speed
    const bySplit = [...assignmentResults].sort((a, b) => a.split - b.split);
    bySplit.forEach((r, idx) => {
      const entry = perAthlete.get(r.athlete_id) ?? {
        name: r.athlete_name, squad: r.squad, tier: r.tier, teamName: r.team_name,
        speedRanks: [], effRanks: [],
        latest: { split: null, time: null, distance: null, wplb: null, date: '' },
        history: [],
      };
      entry.speedRanks.push(idx + 1);
      if (!entry.latest.date) {
        entry.latest = { split: r.split, time: r.time, distance: r.distance, wplb: r.wplb, date: assignment.scheduled_date };
      }
      entry.history.push({
        assignmentId: assignment.id,
        label: assignmentLabels.get(assignment.id) ?? 'Workout',
        date: assignment.scheduled_date,
        split: r.split,
        time: r.time,
        wplb: r.wplb,
      });
      perAthlete.set(r.athlete_id, entry);
    });

    // Rank by efficiency
    const byEff = assignmentResults.filter((r) => r.wplb != null).sort((a, b) => (b.wplb ?? 0) - (a.wplb ?? 0));
    byEff.forEach((r, idx) => {
      const entry = perAthlete.get(r.athlete_id);
      if (entry) entry.effRanks.push(idx + 1);
    });
  }

  // Build rows
  const rows: LeaderboardRow[] = [];
  for (const [athleteId, data] of perAthlete) {
    const avgSpeed = data.speedRanks.length > 0 ? Math.round(data.speedRanks.reduce((s, v) => s + v, 0) / data.speedRanks.length) : null;
    const avgEff = data.effRanks.length > 0 ? Math.round(data.effRanks.reduce((s, v) => s + v, 0) / data.effRanks.length) : null;
    rows.push({
      athlete_id: athleteId,
      athlete_name: data.name,
      squad: data.squad,
      performance_tier: data.tier,
      team_name: data.teamName,
      titan_index: null, // computed below
      latest_split: data.latest.split,
      latest_time: data.latest.time,
      latest_distance: data.latest.distance,
      latest_wplb: data.latest.wplb,
      avg_speed_rank: avgSpeed,
      avg_eff_rank: avgEff,
      assignment_count: data.speedRanks.length,
      score_history: data.history,
    });
  }

  // Compute Titan Index (Z-scores)
  const eligible = rows.filter((r) => r.latest_split != null && r.latest_wplb != null);
  if (eligible.length >= 2) {
    const splits = eligible.map((r) => r.latest_split!);
    const wplbs = eligible.map((r) => r.latest_wplb!);
    const mean = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;
    const std = (arr: number[], m: number) => Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
    const splitMean = mean(splits);
    const splitStd = std(splits, splitMean);
    const wplbMean = mean(wplbs);
    const wplbStd = std(wplbs, wplbMean);

    if (splitStd > 0 && wplbStd > 0) {
      const raw: { id: string; z: number }[] = [];
      for (const r of eligible) {
        const speedZ = -(r.latest_split! - splitMean) / splitStd;
        const effZ = (r.latest_wplb! - wplbMean) / wplbStd;
        raw.push({ id: r.athlete_id, z: (speedZ + effZ) / 2 });
      }
      const minZ = Math.min(...raw.map((r) => r.z));
      const maxZ = Math.max(...raw.map((r) => r.z));
      const range = maxZ - minZ || 1;
      for (const r of raw) {
        const row = rows.find((e) => e.athlete_id === r.id);
        if (row) row.titan_index = ((r.z - minZ) / range) * 100;
      }
    }
  }

  // Sort by Titan Index desc (higher = better)
  rows.sort((a, b) => (b.titan_index ?? -Infinity) - (a.titan_index ?? -Infinity));
  return rows;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PublicTeamLeaderboardShare() {
  const shareToken = window.location.pathname.split('/').pop() ?? null;
  const [isLoading, setIsLoading] = useState(true);
  const [payload, setPayload] = useState<TeamLeaderboardShareData | null>(null);
  const [isInvalid, setIsInvalid] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!shareToken) { setIsInvalid(true); setIsLoading(false); return; }
      setIsLoading(true);
      try {
        const data = await resolveTeamLeaderboardShare(shareToken);
        if (cancelled) return;
        if (!data) { setIsInvalid(true); setPayload(null); }
        else { setPayload(data); setIsInvalid(false); }
      } catch {
        if (!cancelled) { setIsInvalid(true); setPayload(null); }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [shareToken]);

  const leaderboard = useMemo(() => payload ? buildLeaderboard(payload) : [], [payload]);

  const [sortField, setSortField] = useState<SortField>('titan');
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [teamFilter, setTeamFilter] = useState<string>('all');

  const teams = useMemo(() => {
    const t = new Set<string>();
    for (const r of leaderboard) if (r.team_name) t.add(r.team_name);
    return [...t].sort();
  }, [leaderboard]);

  const filtered = useMemo(() => {
    let rows = leaderboard;
    if (payload?.filterTier) rows = rows.filter((r) => r.performance_tier === payload.filterTier);
    if (payload?.filterSquad) rows = rows.filter((r) => r.squad === payload.filterSquad);
    if (teamFilter !== 'all') rows = rows.filter((r) => r.team_name === teamFilter);
    return rows;
  }, [leaderboard, payload, teamFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av: number | null = null;
      let bv: number | null = null;
      switch (sortField) {
        case 'titan': av = a.titan_index; bv = b.titan_index; break;
        case 'speed': av = a.latest_split; bv = b.latest_split; break;
        case 'efficiency': av = a.latest_wplb; bv = b.latest_wplb; break;
      }
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return sortAsc ? av - bv : bv - av;
    });
  }, [filtered, sortField, sortAsc]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortAsc((v) => !v);
    else { setSortField(field); setSortAsc(field === 'speed'); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown className="w-3 h-3 inline ml-1 text-neutral-600" />;
    return sortAsc
      ? <ChevronUp className="w-3 h-3 inline ml-1 text-indigo-400" />
      : <ChevronDown className="w-3 h-3 inline ml-1 text-indigo-400" />;
  };

  const heading = payload
    ? [payload.orgName, payload.teamName].filter(Boolean).join(' · ')
    : 'Team Leaderboard';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (isInvalid || !payload) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center px-4">
        <div className="text-center">
          <Trophy className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-neutral-200 mb-2">Link expired or invalid</h1>
          <p className="text-sm text-neutral-500">This share link may have expired. Ask the coach for a new one.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-medium mb-1">
            <Trophy className="w-4 h-4" /> Season Leaderboard
          </div>
          <h1 className="text-2xl font-bold text-white">{heading}</h1>
          <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
            Season rankings averaged across all workouts. Expand a row to see individual scores.
          </p>
          <p className="text-[11px] text-neutral-600 mt-1">
            Titan Index = Z-score composite of speed + efficiency. Higher is better.
          </p>
        </div>

        {/* Filters */}
        {teams.length > 1 && (
          <div className="mb-4">
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="text-xs rounded-md bg-neutral-900 border border-neutral-700 text-neutral-300 px-2 py-1.5"
            >
              <option value="all">All teams</option>
              {teams.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        )}

        {/* Table */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-neutral-500 border-b border-neutral-800 text-xs">
                  <th className="text-left py-2 px-3 w-8">#</th>
                  <th className="text-left py-2 px-3">Athlete</th>
                  <th className="text-center py-2 px-2 cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort('titan')}>
                    Titan Index<SortIcon field="titan" />
                  </th>
                  <th className="text-right py-2 px-2 cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort('speed')}>
                    Speed<SortIcon field="speed" />
                  </th>
                  <th className="text-right py-2 px-2 cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort('efficiency')}>
                    Efficiency<SortIcon field="efficiency" />
                  </th>
                  <th className="text-center py-2 px-2 w-10">
                    <span title="Workouts">#</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row, idx) => {
                  const isExpanded = expandedId === row.athlete_id;
                  const recentHistory = row.score_history.slice(0, 5);
                  const speedDisplay = row.latest_time != null && row.latest_distance != null
                    ? formatTime(row.latest_time)
                    : row.latest_split != null
                      ? formatSplit(row.latest_split)
                      : null;
                  return (
                    <Fragment key={row.athlete_id}>
                      <tr
                        className={`border-b border-neutral-800/50 cursor-pointer hover:bg-neutral-800/40 transition-colors ${isExpanded ? 'bg-neutral-800/30' : ''}`}
                        onClick={() => setExpandedId(isExpanded ? null : row.athlete_id)}
                      >
                        <td className="py-2 px-3 text-neutral-500">{idx + 1}</td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-1.5">
                            <ChevronRight className={`w-3 h-3 text-neutral-600 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                            <div>
                              <div className="text-white">{row.athlete_name}</div>
                              <div className="text-[11px] text-neutral-500">
                                {[row.team_name, row.squad, row.performance_tier].filter(Boolean).join(' · ') || '—'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2 px-2 text-center font-mono text-white font-semibold">
                          {row.titan_index != null ? row.titan_index.toFixed(1) : '—'}
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-neutral-300 whitespace-nowrap">
                          {speedDisplay != null ? (
                            <>{speedDisplay} <span className="text-neutral-600">({row.avg_speed_rank})</span></>
                          ) : '—'}
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-neutral-300 whitespace-nowrap">
                          {row.latest_wplb != null ? (
                            <>{row.latest_wplb.toFixed(2)} <span className="text-neutral-600">({row.avg_eff_rank})</span></>
                          ) : '—'}
                        </td>
                        <td className="py-2 px-2 text-center font-mono text-neutral-500">{row.assignment_count}</td>
                      </tr>
                      {isExpanded && recentHistory.length > 0 && (
                        <tr className="bg-neutral-800/20">
                          <td colSpan={6} className="px-4 py-2">
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
                                    <td className="py-1 pr-2 text-neutral-300">{h.label}</td>
                                    <td className="py-1 px-2 text-neutral-500">{new Date(h.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                                    <td className="py-1 px-2 text-right font-mono">{formatSplit(h.split)}</td>
                                    <td className="py-1 px-2 text-right font-mono">{h.time != null ? formatTime(h.time) : '—'}</td>
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
                          <td colSpan={6} className="px-4 py-3 text-xs text-neutral-500 italic">No workout history</td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
                {sorted.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-neutral-500">
                      No athletes with scores in this view.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-[11px] text-neutral-600">
          Powered by <a href="https://log.train-better.app" className="text-indigo-500 hover:text-indigo-400">ReadyAll</a>
          {payload.expiresAt && (
            <> · Expires {new Date(payload.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</>
          )}
        </div>
      </div>
    </div>
  );
}
