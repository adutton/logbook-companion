import { useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import type { SeasonLeaderboardEntry } from '../../services/coaching/coachingService';

interface Props {
  leaderboard: SeasonLeaderboardEntry[];
  /** Max athletes to show lines for (top N by composite rank) */
  maxLines?: number;
}

const COLORS = [
  '#818cf8', '#34d399', '#f472b6', '#fbbf24', '#60a5fa',
  '#a78bfa', '#fb923c', '#2dd4bf', '#f87171', '#94a3b8',
  '#c084fc', '#4ade80', '#e879f9', '#facc15', '#38bdf8',
];

export function RankOverTimeChart({ leaderboard, maxLines = 10 }: Props) {
  const [topN, setTopN] = useState(maxLines);

  // Only athletes with rank history (≥2 data points)
  const eligible = useMemo(
    () => leaderboard.filter((e) => e.rank_history.length >= 2),
    [leaderboard],
  );

  // Top N by composite rank (best = lowest)
  const topAthletes = useMemo(
    () =>
      [...eligible]
        .sort((a, b) => (a.composite_rank ?? 999) - (b.composite_rank ?? 999))
        .slice(0, topN),
    [eligible, topN],
  );

  // Collect all unique dates and build chart rows
  const { chartData, athleteKeys } = useMemo(() => {
    const dateSet = new Set<string>();
    for (const athlete of topAthletes) {
      for (const h of athlete.rank_history) dateSet.add(h.date);
    }
    const dates = [...dateSet].sort();

    const keys = topAthletes.map((a) => ({
      key: a.athlete_id,
      name: a.athlete_name,
    }));

    const rows = dates.map((date) => {
      const row: Record<string, string | number | null> = { date };
      for (const athlete of topAthletes) {
        const entry = athlete.rank_history.find((h) => h.date === date);
        row[athlete.athlete_id] = entry ? entry.rank : null;
      }
      return row;
    });

    return { chartData: rows, athleteKeys: keys };
  }, [topAthletes]);

  if (eligible.length < 2 || chartData.length < 2) return null;

  const formatDate = (d: string) => {
    const dt = new Date(d + 'T00:00:00');
    return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-neutral-400">Rank Over Time</h3>
          <p className="text-[11px] text-neutral-600">Composite rank per assignment. Lower is better.</p>
        </div>
        <select
          value={topN}
          onChange={(e) => setTopN(Number(e.target.value))}
          className="px-2 py-1 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
          aria-label="Number of athletes to show"
        >
          {[5, 10, 15, 20].map((n) => (
            <option key={n} value={n}>Top {n}</option>
          ))}
        </select>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fill: '#888', fontSize: 11 }} />
          <YAxis
            reversed
            tick={{ fill: '#888', fontSize: 11 }}
            allowDecimals={false}
            label={{ value: 'Rank', angle: -90, position: 'insideLeft', fill: '#666', fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #333', borderRadius: 8, fontSize: 12 }}
            labelFormatter={formatDate}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value?: number, _name?: string, props?: any) => {
              const athlete = athleteKeys.find((a) => a.key === props?.dataKey);
              return [value ?? '—', athlete?.name ?? ''];
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11 }}
            formatter={(value: string) => {
              const athlete = athleteKeys.find((a) => a.key === value);
              return athlete?.name ?? value;
            }}
          />
          {athleteKeys.map((a, i) => (
            <Line
              key={a.key}
              type="monotone"
              dataKey={a.key}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
