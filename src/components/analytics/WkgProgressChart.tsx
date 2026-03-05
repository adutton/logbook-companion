import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Line,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, Scale } from 'lucide-react';

interface WkgProgressChartProps {
  workouts: Array<{
    id: string;
    completed_at: string;
    average_watts?: number;
    watts?: number;
    distance_meters?: number;
    duration_seconds?: number;
    workout_name?: string;
  }>;
  weightKg?: number;
}

interface WkgDataPoint {
  date: string;
  dateRaw: string;
  wkg: number;
  watts: number;
  name: string;
  ma30: number | null;
}

function computeMovingAverage(data: { wkg: number; dateRaw: string }[], windowDays: number): (number | null)[] {
  return data.map((point, _i) => {
    const pointDate = new Date(point.dateRaw).getTime();
    const windowStart = pointDate - windowDays * 24 * 60 * 60 * 1000;
    const windowPoints = data.filter(p => {
      const d = new Date(p.dateRaw).getTime();
      return d >= windowStart && d <= pointDate;
    });
    if (windowPoints.length < 2) return null;
    return windowPoints.reduce((sum, p) => sum + p.wkg, 0) / windowPoints.length;
  });
}

export const WkgProgressChart: React.FC<WkgProgressChartProps> = ({ workouts, weightKg }) => {
  const dataPoints: WkgDataPoint[] = useMemo(() => {
    if (!weightKg || weightKg <= 0) return [];

    const valid = workouts
      .filter(w => {
        const watts = w.average_watts ?? w.watts;
        return watts != null && watts > 0;
      })
      .map(w => {
        const watts = (w.average_watts ?? w.watts)!;
        return {
          dateRaw: w.completed_at,
          wkg: watts / weightKg,
          watts,
          name: w.workout_name ?? 'Workout',
        };
      })
      .sort((a, b) => new Date(a.dateRaw).getTime() - new Date(b.dateRaw).getTime());

    const ma = computeMovingAverage(valid, 30);

    return valid.map((v, i) => ({
      ...v,
      date: new Date(v.dateRaw).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      ma30: ma[i] != null ? Math.round(ma[i]! * 100) / 100 : null,
    }));
  }, [workouts, weightKg]);

  if (!weightKg || weightKg <= 0) {
    return (
      <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6">
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Scale size={18} className="text-emerald-400" />
          Watts / kg
        </h3>
        <p className="text-sm text-neutral-500 text-center py-8">
          Set your weight in Preferences to see W/kg trends.
        </p>
      </div>
    );
  }

  if (dataPoints.length === 0) {
    return (
      <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6">
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Scale size={18} className="text-emerald-400" />
          Watts / kg
        </h3>
        <p className="text-sm text-neutral-500 text-center py-8">
          No workouts with power data found.
        </p>
      </div>
    );
  }

  const latestWkg = dataPoints[dataPoints.length - 1].wkg;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const olderPoints = dataPoints.filter(d => new Date(d.dateRaw) <= thirtyDaysAgo);
  const olderWkg = olderPoints.length > 0 ? olderPoints[olderPoints.length - 1].wkg : null;
  const trend = olderWkg != null ? latestWkg - olderWkg : null;

  return (
    <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6">
      {/* Summary card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Scale size={18} className="text-emerald-400" />
            Watts / kg
          </h3>
          <p className="text-xs text-neutral-500 mt-1">
            Power-to-weight ratio over time
          </p>
        </div>
        <div className="bg-neutral-800/50 rounded-lg px-4 py-2 border border-neutral-700/50 flex items-center gap-3">
          <div
            className={`p-2 rounded-full ${
              trend == null || Math.abs(trend) < 0.05
                ? 'bg-neutral-700 text-neutral-400'
                : trend > 0
                  ? 'bg-emerald-500/10 text-emerald-500'
                  : 'bg-red-500/10 text-red-500'
            }`}
          >
            {trend == null || Math.abs(trend) < 0.05 ? (
              <Minus size={18} />
            ) : trend > 0 ? (
              <TrendingUp size={18} />
            ) : (
              <TrendingDown size={18} />
            )}
          </div>
          <div>
            <div className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Current W/kg</div>
            <div className="text-base font-mono font-bold text-emerald-400">
              {latestWkg.toFixed(2)}
              {trend != null && Math.abs(trend) >= 0.05 && (
                <span className={`text-xs ml-2 ${trend > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {trend > 0 ? '+' : ''}{trend.toFixed(2)} vs 30d ago
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div role="img" aria-label="Watts per kilogram progress chart" className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={dataPoints} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
            <defs>
              <linearGradient id="wkgFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              stroke="#525252"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#525252"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => v.toFixed(2)}
              domain={['auto', 'auto']}
              label={{ value: 'W/kg', angle: -90, position: 'insideLeft', style: { fill: '#737373', fontSize: 11 } }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as WkgDataPoint;
                return (
                  <div className="bg-neutral-950 border border-neutral-800 p-3 rounded-lg shadow-xl text-xs space-y-1.5 min-w-[180px]">
                    <p className="text-neutral-400 font-medium">{d.name}</p>
                    <p className="text-neutral-500">{d.date}</p>
                    <div className="border-t border-neutral-800 pt-1.5 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-neutral-400">W/kg</span>
                        <span className="text-emerald-400 font-mono font-bold">{d.wkg.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Raw watts</span>
                        <span className="text-white font-mono">{Math.round(d.watts)}W</span>
                      </div>
                      {d.ma30 != null && (
                        <div className="flex justify-between">
                          <span className="text-neutral-400">30-day avg</span>
                          <span className="text-neutral-300 font-mono">{d.ma30.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="wkg"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#wkgFill)"
              dot={{ r: 2.5, fill: '#10b981', strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#10b981', stroke: '#064e3b', strokeWidth: 2 }}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="ma30"
              stroke="#059669"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
              connectNulls
              isAnimationActive={false}
              name="30-day avg"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
