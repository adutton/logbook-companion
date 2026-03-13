import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import type { TeamErgComparison, CoachingAthlete } from '../../services/coaching/coachingService';
import { formatSplit } from '../../utils/paceCalculator';

interface Props {
  data: TeamErgComparison[];
  athletes: CoachingAthlete[];
}

const ATHLETE_COLORS = [
  '#8b5cf6', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#f97316', '#14b8a6', '#a855f7',
  '#6366f1', '#0ea5e9', '#22c55e', '#eab308', '#f43f5e',
];

function getAthleteColor(index: number): string {
  return ATHLETE_COLORS[index % ATHLETE_COLORS.length];
}

function formatTimeFull(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(1);
  return `${mins}:${secs.padStart(4, '0')}`;
}

type YMetric = 'watts' | 'split' | 'wlb';

interface ChartRow {
  athleteId: string;
  name: string;
  squad?: string;
  team_name?: string;
  distance: number;
  bestTime: number;
  bestSplit: number;
  bestWatts: number;
  weightKg: number | null;
  wattsPerLb: number | null;
  value: number;
  colorIndex: number;
  [key: string]: unknown;
}

export function ErgComparisonChart({ data, athletes }: Props) {
  const [yMetric, setYMetric] = useState<YMetric>('watts');

  // Unique assignment labels, ordered by most recent date first
  const assignmentLabels = useMemo(() => {
    const labelDateMap = new Map<string, string>();
    for (const d of data) {
      const existing = labelDateMap.get(d.assignmentLabel);
      if (!existing || d.date > existing) labelDateMap.set(d.assignmentLabel, d.date);
    }
    return [...labelDateMap.entries()]
      .sort((a, b) => b[1].localeCompare(a[1])) // newest first
      .map(([label]) => label);
  }, [data]);

  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const activeLabel = selectedLabel ?? assignmentLabels[0];

  const athleteMap = useMemo(() => new Map(athletes.map(a => [a.id, a])), [athletes]);
  const hasAnyWeight = athletes.some(a => a.weight_kg && a.weight_kg > 0);

  const chartData = useMemo((): ChartRow[] => {
    if (!activeLabel) return [];

    const rows: ChartRow[] = [];
    for (const d of data) {
      if (d.assignmentLabel !== activeLabel) continue;
      const athlete = athleteMap.get(d.athleteId);
      const weightKg = athlete?.weight_kg && athlete.weight_kg > 0 ? athlete.weight_kg : null;
      const weightLb = weightKg ? weightKg * 2.20462 : null;
      const wlb = weightLb ? Math.round((d.bestWatts / weightLb) * 100) / 100 : null;

      if (yMetric === 'wlb' && wlb == null) continue;

      let value: number;
      if (yMetric === 'watts') value = Math.round(d.bestWatts);
      else if (yMetric === 'split') value = d.bestSplit;
      else value = wlb!;

      rows.push({
        athleteId: d.athleteId,
        name: d.athleteName,
        squad: d.squad,
        team_name: d.team_name,
        distance: d.distance,
        bestTime: d.bestTime,
        bestSplit: d.bestSplit,
        bestWatts: d.bestWatts,
        weightKg,
        wattsPerLb: wlb,
        value,
        colorIndex: 0,
      });
    }

    if (yMetric === 'split') {
      rows.sort((a, b) => a.value - b.value);
    } else {
      rows.sort((a, b) => b.value - a.value);
    }

    return rows.map((d, i) => ({ ...d, colorIndex: i }));
  }, [data, athleteMap, activeLabel, yMetric]);

  const avgWlb = yMetric === 'wlb' && chartData.length > 0
    ? Math.round(chartData.reduce((sum, d) => sum + (d.wattsPerLb ?? 0), 0) / chartData.length * 100) / 100
    : 0;

  if (data.length === 0) {
    return <div className="text-neutral-500 text-sm">No erg scores recorded yet.</div>;
  }

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        {/* Assignment/workout selector */}
        <select
          value={activeLabel ?? ''}
          onChange={(e) => setSelectedLabel(e.target.value)}
          className="px-3 py-1.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none max-w-[220px] truncate"
          aria-label="Select workout"
        >
          {assignmentLabels.map(label => (
            <option key={label} value={label}>{label}</option>
          ))}
        </select>

        <div className="flex items-center gap-3">
          {/* Metric toggle */}
          <div className="flex gap-1 bg-neutral-800/50 rounded-lg p-0.5">
            <button
              onClick={() => setYMetric('watts')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                yMetric === 'watts' ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Watts
            </button>
            <button
              onClick={() => setYMetric('split')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                yMetric === 'split' ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Split
            </button>
            {hasAnyWeight && (
              <button
                onClick={() => setYMetric('wlb')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  yMetric === 'wlb' ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Efficiency
              </button>
            )}
          </div>
          {yMetric === 'wlb' && avgWlb > 0 && (
            <span className="text-xs text-neutral-500">
              Avg: <span className="text-neutral-300 font-mono">{avgWlb} W/lb</span>
            </span>
          )}
        </div>
      </div>

      {/* Chart */}
      {chartData.length === 0 ? (
        <p className="text-neutral-500 text-sm">
          {yMetric === 'wlb'
            ? 'No athletes with both weight and scores for this workout.'
            : 'No scores for this workout.'}
        </p>
      ) : (
        <div role="img" aria-label="Erg comparison chart">
          <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 36 + 40)}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
              <XAxis
                type="number"
                tickFormatter={(v: number) =>
                  yMetric === 'watts' ? `${v}W`
                    : yMetric === 'split' ? formatSplit(v)
                    : `${v} W/lb`
                }
                stroke="#666"
                tick={{ fontSize: 11 }}
                reversed={yMetric === 'split'}
                domain={yMetric === 'wlb' ? [0, 'auto'] : undefined}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={80}
                stroke="#666"
                tick={{ fontSize: 11 }}
              />
              {yMetric === 'wlb' && avgWlb > 0 && (
                <ReferenceLine
                  x={avgWlb}
                  stroke="#6b7280"
                  strokeDasharray="3 3"
                  label={{ value: 'Avg', position: 'top', fill: '#6b7280', fontSize: 10 }}
                />
              )}
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as ChartRow;
                  return (
                    <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-3 shadow-xl text-xs">
                      <p className="text-white font-semibold">{d.name}</p>
                      {d.team_name && <p className="text-indigo-400 text-[10px]">{d.team_name}</p>}
                      {d.squad && <p className="text-neutral-500">{d.squad}</p>}
                      <div className="mt-1.5 space-y-0.5 text-neutral-300">
                        <div>Distance: {d.distance}m</div>
                        <div>Time: {formatTimeFull(d.bestTime)}</div>
                        <div>Split: {formatSplit(d.bestSplit)}/500m</div>
                        <div>Watts: {Math.round(d.bestWatts)}W</div>
                        {d.wattsPerLb != null && (
                          <div>W/lb: <span className="font-mono font-semibold text-indigo-400">{d.wattsPerLb}</span></div>
                        )}
                        {d.weightKg != null && <div>Weight: {Math.round(d.weightKg * 2.20462)} lbs</div>}
                      </div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, i) => (
                  <Cell
                    key={entry.athleteId}
                    fill={getAthleteColor(i)}
                    fillOpacity={0.8}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
