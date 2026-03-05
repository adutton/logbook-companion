import React, { useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Line,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface SplitVarianceChartProps {
  workouts: Array<{
    id: string;
    name?: string;
    workout_name?: string;
    completed_at: string;
    intervals?: Array<{
      split_seconds?: number;
      distance_meters?: number;
    }>;
  }>;
}

interface VarianceDataPoint {
  id: string;
  date: string;
  dateRaw: string;
  name: string;
  cv: number;
  meanSplit: number;
  bestSplit: number;
  worstSplit: number;
  splitRange: number;
  stdDev: number;
  intervalCount: number;
}

function formatSplitTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const tenths = Math.round((seconds % 1) * 10);
  return `${m}:${s.toString().padStart(2, '0')}.${tenths}`;
}

function computeStats(splits: number[]) {
  const n = splits.length;
  const mean = splits.reduce((a, b) => a + b, 0) / n;
  const variance = splits.reduce((sum, s) => sum + (s - mean) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);
  const cv = mean > 0 ? (stdDev / mean) * 100 : 0;
  const best = Math.min(...splits);
  const worst = Math.max(...splits);
  return { mean, stdDev, cv, best, worst };
}

function getCvColor(cv: number): string {
  if (cv < 3) return '#10b981'; // emerald-500
  if (cv <= 5) return '#f59e0b'; // amber-500
  return '#ef4444'; // red-500
}

function getCvLabel(cv: number): string {
  if (cv < 3) return 'Excellent';
  if (cv <= 5) return 'Moderate';
  return 'High variance';
}

export const SplitVarianceChart: React.FC<SplitVarianceChartProps> = ({ workouts }) => {
  const dataPoints: VarianceDataPoint[] = useMemo(() => {
    return workouts
      .filter(w => {
        const validIntervals = w.intervals?.filter(i => i.split_seconds != null && i.split_seconds > 0) ?? [];
        return validIntervals.length >= 3;
      })
      .map(w => {
        const splits = w.intervals!
          .filter(i => i.split_seconds != null && i.split_seconds > 0)
          .map(i => i.split_seconds!);
        const stats = computeStats(splits);
        return {
          id: w.id,
          date: new Date(w.completed_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          dateRaw: w.completed_at,
          name: w.workout_name ?? w.name ?? 'Workout',
          cv: Math.round(stats.cv * 100) / 100,
          meanSplit: stats.mean,
          bestSplit: stats.best,
          worstSplit: stats.worst,
          splitRange: stats.worst - stats.best,
          stdDev: stats.stdDev,
          intervalCount: splits.length,
        };
      })
      .sort((a, b) => new Date(a.dateRaw).getTime() - new Date(b.dateRaw).getTime());
  }, [workouts]);

  if (dataPoints.length === 0) {
    return (
      <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6">
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <TrendingUp size={18} className="text-emerald-400" />
          Split Variance
        </h3>
        <p className="text-sm text-neutral-500 text-center py-8">
          No interval workouts with 3+ splits found. Log interval sessions to see pacing consistency.
        </p>
      </div>
    );
  }

  const avgCv = dataPoints.reduce((sum, d) => sum + d.cv, 0) / dataPoints.length;
  const recentCv = dataPoints.length >= 2 ? dataPoints[dataPoints.length - 1].cv : null;
  const olderCv = dataPoints.length >= 2 ? dataPoints[0].cv : null;
  const trend = recentCv != null && olderCv != null ? olderCv - recentCv : 0; // positive = improving (lower CV)

  return (
    <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6">
      {/* Summary card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp size={18} className="text-emerald-400" />
            Split Variance
          </h3>
          <p className="text-xs text-neutral-500 mt-1">
            Lower CV% = more consistent pacing across intervals
          </p>
        </div>
        <div className="bg-neutral-800/50 rounded-lg px-4 py-2 border border-neutral-700/50 flex items-center gap-3">
          <div className={`p-2 rounded-full ${Math.abs(trend) < 0.5 ? 'bg-neutral-700 text-neutral-400' : trend > 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
            {Math.abs(trend) < 0.5 ? <Minus size={18} /> : trend > 0 ? <TrendingDown size={18} /> : <TrendingUp size={18} />}
          </div>
          <div>
            <div className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Avg Consistency</div>
            <div className="text-base font-mono font-bold" style={{ color: getCvColor(avgCv) }}>
              {avgCv.toFixed(1)}% CV
              <span className="text-xs ml-2 text-neutral-500">({getCvLabel(avgCv)})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div role="img" aria-label="Split variance chart showing pacing consistency" className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={dataPoints} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
            <XAxis
              dataKey="date"
              stroke="#525252"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              yAxisId="cv"
              orientation="left"
              stroke="#525252"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `${v}%`}
              domain={[0, 'auto']}
              label={{ value: 'CV%', angle: -90, position: 'insideLeft', style: { fill: '#737373', fontSize: 11 } }}
            />
            <YAxis
              yAxisId="range"
              orientation="right"
              stroke="#525252"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `${v.toFixed(1)}s`}
              domain={[0, 'auto']}
              label={{ value: 'Split Range', angle: 90, position: 'insideRight', style: { fill: '#737373', fontSize: 11 } }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#171717',
                borderColor: '#262626',
                borderRadius: '8px',
              }}
              itemStyle={{ color: '#fff' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as VarianceDataPoint;
                return (
                  <div className="bg-neutral-950 border border-neutral-800 p-3 rounded-lg shadow-xl text-xs space-y-1.5 min-w-[200px]">
                    <p className="text-neutral-400 font-medium">{d.name}</p>
                    <p className="text-neutral-500">{d.date} · {d.intervalCount} intervals</p>
                    <div className="border-t border-neutral-800 pt-1.5 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-neutral-400">CV%</span>
                        <span className="font-mono font-bold" style={{ color: getCvColor(d.cv) }}>{d.cv.toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Mean split</span>
                        <span className="text-white font-mono">{formatSplitTime(d.meanSplit)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Best</span>
                        <span className="text-emerald-400 font-mono">{formatSplitTime(d.bestSplit)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Worst</span>
                        <span className="text-red-400 font-mono">{formatSplitTime(d.worstSplit)}</span>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
            <Bar yAxisId="cv" dataKey="cv" radius={[4, 4, 0, 0]} maxBarSize={40}>
              {dataPoints.map((d, i) => (
                <Cell key={i} fill={getCvColor(d.cv)} fillOpacity={0.8} />
              ))}
            </Bar>
            <Line
              yAxisId="range"
              type="monotone"
              dataKey="splitRange"
              stroke="#a78bfa"
              strokeWidth={2}
              dot={{ r: 3, fill: '#a78bfa', strokeWidth: 0 }}
              name="Split range"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
