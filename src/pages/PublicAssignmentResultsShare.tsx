import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, Loader2, ExternalLink } from 'lucide-react';

import {
  resolveAssignmentResultsShare,
  type AssignmentResultRow,
  type AssignmentResultsShareData,
} from '../services/coaching/coachingService';
import { splitToWatts, formatSplit } from '../utils/zones';

interface EnrichedRow extends AssignmentResultRow {
  watts: number | null;
  wpkg: number | null;
  wplb: number | null;
}

function fmtSplit(sec: number | null | undefined): string {
  if (sec == null || sec <= 0) return '—';
  return formatSplit(sec);
}

function fmtTime(sec: number | null | undefined): string {
  if (sec == null || sec <= 0) return '—';
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function fmtDist(m: number | null | undefined): string {
  if (m == null || m <= 0) return '—';
  return `${Math.round(m).toLocaleString()}m`;
}

function fmtWatts(w: number | null | undefined): string {
  if (w == null || w <= 0) return '—';
  return `${Math.round(w)}W`;
}

function fmtPowerToWeight(wpkg: number | null | undefined, wplb: number | null | undefined): string {
  if (wpkg == null || wpkg <= 0 || wplb == null || wplb <= 0) return '—';
  return `${wpkg.toFixed(2)} W/kg · ${wplb.toFixed(2)} W/lb`;
}

export function PublicAssignmentResultsShare() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [payload, setPayload] = useState<AssignmentResultsShareData | null>(null);
  const [isInvalid, setIsInvalid] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!shareToken) {
        setIsInvalid(true);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const data = await resolveAssignmentResultsShare(shareToken);
        if (cancelled) return;
        if (!data) {
          setIsInvalid(true);
          setPayload(null);
        } else {
          setPayload(data);
          setIsInvalid(false);
        }
      } catch {
        if (!cancelled) {
          setIsInvalid(true);
          setPayload(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [shareToken]);

  const rows = useMemo<EnrichedRow[]>(() => {
    const source = payload?.rows ?? [];
    return source
      .map((row) => {
        const split = row.result_split_seconds ?? null;
        const watts = split && split > 0 ? Math.round(splitToWatts(split)) : null;
        const effectiveWeightKg = row.result_weight_kg && row.result_weight_kg > 0
          ? row.result_weight_kg
          : row.weight_kg && row.weight_kg > 0
            ? row.weight_kg
            : null;
        const wpkg = watts != null && effectiveWeightKg != null ? watts / effectiveWeightKg : null;
        const wplb = wpkg != null ? wpkg / 2.20462 : null;
        return { ...row, watts, wpkg, wplb };
      })
      .sort((a, b) => {
        if (a.completed && !b.completed) return -1;
        if (!a.completed && b.completed) return 1;
        const as = a.result_split_seconds ?? Number.POSITIVE_INFINITY;
        const bs = b.result_split_seconds ?? Number.POSITIVE_INFINITY;
        return as - bs;
      });
  }, [payload?.rows]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (isInvalid || !payload) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-6">
        <div className="max-w-lg w-full rounded-xl border border-neutral-800 bg-neutral-900 p-6 space-y-4 text-center">
          <h1 className="text-xl font-semibold">This shared link is invalid or expired</h1>
          <p className="text-sm text-neutral-400">Ask the coach to generate a fresh assignment results share link.</p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  const { assignment } = payload;
  const dateLabel = (() => {
    try {
      return format(parseISO(assignment.scheduled_date), 'EEEE, MMMM d, yyyy');
    } catch {
      return assignment.scheduled_date;
    }
  })();

  const expiresLabel = (() => {
    try {
      return format(parseISO(payload.expiresAt), 'PPP p');
    } catch {
      return payload.expiresAt;
    }
  })();

  const completed = rows.filter((r) => r.completed).length;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-indigo-300">
            <ArrowLeft className="w-4 h-4" />
            Back to sign in
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 text-xs font-medium"
          >
            Sign up for full access
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-900/80 p-5 space-y-2">
          <h1 className="text-2xl font-bold">{assignment.title || assignment.template_name || 'Assignment Results'}</h1>
          <div className="text-sm text-neutral-400">{dateLabel}</div>
          {assignment.canonical_name && <div className="text-xs text-neutral-500 font-mono">{assignment.canonical_name}</div>}
          {assignment.instructions && <p className="text-sm text-neutral-300 pt-1">{assignment.instructions}</p>}
          <div className="text-xs text-neutral-500 pt-1">{completed} of {rows.length} completed • Link expires {expiresLabel}</div>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800 text-xs uppercase text-neutral-400">
                <th className="px-3 py-2 text-left">Athlete</th>
                <th className="px-3 py-2 text-center">Status</th>
                <th className="px-3 py-2 text-right">Split /500m</th>
                <th className="px-3 py-2 text-right">Watts</th>
                <th className="px-3 py-2 text-right">W/kg · W/lb</th>
                <th className="px-3 py-2 text-right">Distance</th>
                <th className="px-3 py-2 text-right">Time</th>
                <th className="px-3 py-2 text-right">SR</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-neutral-800/40">
                  <td className="px-3 py-2 text-neutral-200">{row.athlete_name}</td>
                  <td className="px-3 py-2 text-center">{row.completed ? '✓' : '—'}</td>
                  <td className="px-3 py-2 text-right font-mono">{fmtSplit(row.result_split_seconds)}</td>
                  <td className="px-3 py-2 text-right font-mono">{fmtWatts(row.watts)}</td>
                  <td className="px-3 py-2 text-right font-mono">{fmtPowerToWeight(row.wpkg, row.wplb)}</td>
                  <td className="px-3 py-2 text-right font-mono">{fmtDist(row.result_distance_meters)}</td>
                  <td className="px-3 py-2 text-right font-mono">{fmtTime(row.result_time_seconds)}</td>
                  <td className="px-3 py-2 text-right">{row.result_stroke_rate ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
