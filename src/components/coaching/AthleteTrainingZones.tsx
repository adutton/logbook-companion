import { useMemo } from 'react';
import type { CoachingErgScore } from '../../services/coaching/coachingService';
import {
  TRAINING_ZONE_CONFIG,
  calculateZonePaceRange,
  formatSplit,
  calculateWattsFromSplit,
  type TrainingZone,
} from '../../utils/paceCalculator';

interface Props {
  ergScores: CoachingErgScore[];
}

const ZONES = ['UT2', 'UT1', 'AT', 'TR', 'AN'] as const satisfies readonly TrainingZone[];

const ZONE_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
  UT2: { bg: 'bg-emerald-900/20', text: 'text-emerald-400', bar: 'bg-emerald-500' },
  UT1: { bg: 'bg-blue-900/20', text: 'text-blue-400', bar: 'bg-blue-500' },
  AT:  { bg: 'bg-amber-900/20', text: 'text-amber-400', bar: 'bg-amber-500' },
  TR:  { bg: 'bg-orange-900/20', text: 'text-orange-400', bar: 'bg-orange-500' },
  AN:  { bg: 'bg-red-900/20', text: 'text-red-400', bar: 'bg-red-500' },
};

const ZONE_BAR_WIDTH_CLASSES: Record<TrainingZone, string> = {
  UT2: 'w-1/5',
  UT1: 'w-2/5',
  AT: 'w-3/5',
  TR: 'w-4/5',
  AN: 'w-full',
};

export function AthleteTrainingZones({ ergScores }: Props) {
  // Use the most recent 2k test as the current anchor for training zones.
  const baseline = useMemo(() => {
    const twoKScores = ergScores.filter(s => s.distance === 2000);
    if (twoKScores.length === 0) return null;

    const sorted = [...twoKScores].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const best = sorted[0];

    const splitSec = best.split_500m ?? (best.time_seconds / best.distance) * 500;
    const watts = best.watts ?? calculateWattsFromSplit(splitSec);

    return {
      date: best.date,
      time_seconds: best.time_seconds,
      split: splitSec,
      watts,
    };
  }, [ergScores]);

  if (!baseline) {
    return (
      <div>
        <h3 className="text-sm font-medium text-neutral-400 mb-3">Training Zones</h3>
        <p className="text-neutral-500 text-sm">
          No 2k test recorded. Mark a 2k assignment as a test to calculate training zones.
        </p>
      </div>
    );
  }

  // Format the 2k time
  const baselineMins = Math.floor(baseline.time_seconds / 60);
  const baselineSecs = (baseline.time_seconds % 60).toFixed(1);
  const baselineTimeStr = `${baselineMins}:${baselineSecs.padStart(4, '0')}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-neutral-400">Training Zones</h3>
        <div className="text-xs text-neutral-500">
          Based on 2k: {baselineTimeStr} ({formatSplit(baseline.split)}/500m · {Math.round(baseline.watts)}W)
        </div>
      </div>

      <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-4 py-3 text-xs text-neutral-400">
        These bands follow common rowing practice and stay intentionally broad for normal day-to-day variance. Use split, feel, and heart rate together rather than treating any zone as a single exact number.
      </div>

      <div className="space-y-2">
        {ZONES.map(zone => {
          const range = calculateZonePaceRange(zone, baseline.watts);
          if (!range) return null;

          const colors = ZONE_COLORS[zone];
          const config = TRAINING_ZONE_CONFIG[zone];
          const minWatts = Math.round(range.minWatts);
          const maxWatts = Math.round(range.maxWatts);

          return (
            <div key={zone} className={`p-3 rounded-lg border border-neutral-700/50 ${colors.bg}`}>
              <div className="flex items-center justify-between mb-1 gap-3">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${colors.text}`}>{zone}</span>
                  <span className="text-xs text-neutral-500">{config.label} · {config.subtitle}</span>
                </div>
                <span className="text-[11px] text-neutral-500">{minWatts}–{maxWatts}W</span>
              </div>
              <p className="text-xs text-neutral-400 mb-2">{config.guidance}</p>
              <div className="flex items-center justify-between text-xs">
                <div className="font-mono text-neutral-300">
                  {range.lowFormatted} – {range.highFormatted} /500m
                </div>
                <div className="text-neutral-500">{Math.round(config.min * 100)}–{Math.round(config.max * 100)}% of 2k watts</div>
              </div>
              <div className="mt-2 h-1 bg-neutral-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${colors.bar} opacity-60 ${ZONE_BAR_WIDTH_CLASSES[zone]}`} />
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-neutral-500">
        TR tops out around current 2k pace; AN now starts at 2k pace and moves above it, which better matches common rowing usage for short sprint and power work.
      </p>
    </div>
  );
}
