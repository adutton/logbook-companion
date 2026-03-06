/**
 * ImportCsvModal — multi-step CSV import for coaching assignment results.
 *
 * Steps:
 *   1. File/paste: select CSV file or paste text
 *   2. Review: preview parsed rows, name matching, manual resolution
 *   3. Confirm: save matched results via saveAssignmentResults()
 */

import { useState, useCallback, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ChevronRight,
  Loader2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { Modal } from '../ui/Modal';
import { parseCsvScores, type CsvScoreRow } from '../../utils/csvScoreParser';
import { matchAthleteNames, type NameMatch } from '../../utils/athleteNameMatcher';
import {
  saveAssignmentResults,
  addAthleteToAssignment,
  getAssignmentResultsWithAthletes,
  type IntervalResult,
  type GroupAssignment,
} from '../../services/coaching/coachingService';
import type { CoachingAthlete } from '../../services/coaching/types';
import { parseWorkoutStructureForEntry, computeSplit } from '../../utils/workoutEntryClassifier';
import { supabase } from '../../services/supabase';

// ─── Props ────────────────────────────────────────────────────────────────────

interface ImportCsvModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
  groupAssignmentId: string;
  assignment: GroupAssignment;
  athletes: CoachingAthlete[];
  teamId: string;
  orgId?: string | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ImportCsvModal({
  open,
  onClose,
  onComplete,
  groupAssignmentId,
  assignment,
  athletes,
  teamId,
  orgId,
}: ImportCsvModalProps) {
  const [step, setStep] = useState<'upload' | 'review' | 'saving'>('upload');
  const [csvText, setCsvText] = useState('');
  const [parsedRows, setParsedRows] = useState<CsvScoreRow[]>([]);
  const [repCount, setRepCount] = useState(0);
  const [matches, setMatches] = useState<NameMatch[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Step 1: Parse & Match ─────────────────────────────────────────────────

  const handleParse = useCallback(
    (text: string) => {
      const { rows, repCount: reps, errors } = parseCsvScores(text);
      setParsedRows(rows);
      setRepCount(reps);
      setParseErrors(errors);

      if (rows.length === 0) {
        toast.error(errors.length > 0 ? errors[0] : 'No data rows found in CSV.');
        return;
      }

      // Match names to athletes
      const result = matchAthleteNames(
        rows.map((r) => ({ name: r.name, line: r.line })),
        athletes
      );
      setMatches(result.matches);
      setStep('review');
    },
    [athletes]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        setCsvText(text);
        handleParse(text);
      };
      reader.readAsText(file);
    },
    [handleParse]
  );

  const handlePasteSubmit = useCallback(() => {
    if (!csvText.trim()) {
      toast.error('Paste or type CSV data first.');
      return;
    }
    handleParse(csvText);
  }, [csvText, handleParse]);

  // ── Step 2: Manual Match Override ────────────────────────────────────────

  const updateMatch = useCallback((csvLine: number, athleteId: string | null) => {
    setMatches((prev) =>
      prev.map((m) => {
        if (m.csvLine !== csvLine) return m;
        if (!athleteId) {
          return { ...m, athlete: null, confidence: 'none' as const };
        }
        const found = athletes.find((a) => a.id === athleteId);
        return found
          ? { ...m, athlete: found, confidence: 'fuzzy' as const }
          : m;
      })
    );
  }, [athletes]);

  // ── Step 3: Save ──────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    const toSave = matches.filter((m) => m.athlete !== null);
    if (toSave.length === 0) {
      toast.error('No matched athletes to import.');
      return;
    }

    setIsSaving(true);
    setStep('saving');

    try {
      // Determine distance per rep from workout structure (needed for split calc)
      const shape = parseWorkoutStructureForEntry(
        assignment.workout_structure ?? undefined
      );

      // Find which athletes already have assignment rows
      const existingRows = await getAssignmentResultsWithAthletes(
        groupAssignmentId,
        teamId,
        orgId
      );
      const existingAthleteIds = new Set(existingRows.map((r) => r.athlete_id));

      // Create assignment rows for athletes that don't have them yet
      const missingAthletes = toSave.filter(
        (m) => !existingAthleteIds.has(m.athlete!.id)
      );
      if (missingAthletes.length > 0) {
        for (const m of missingAthletes) {
          await addAthleteToAssignment(groupAssignmentId, m.athlete!.id, {
            team_id: assignment.team_id,
            org_id: assignment.org_id,
            template_id: assignment.template_id,
            scheduled_date: assignment.scheduled_date,
            title: assignment.title,
          });
        }
      }

      // Look up most recent result_weight_kg for each athlete (for W/kg display)
      const athleteIds = toSave.map((m) => m.athlete!.id);
      const latestWeightMap = new Map<string, number>();
      if (athleteIds.length > 0) {
        const { data: weightData } = await supabase
          .from('daily_workout_assignments')
          .select('athlete_id, result_weight_kg, completed_at')
          .in('athlete_id', athleteIds)
          .not('result_weight_kg', 'is', null)
          .gt('result_weight_kg', 0)
          .order('completed_at', { ascending: false, nullsFirst: false });
        if (weightData) {
          for (const w of weightData) {
            if (!latestWeightMap.has(w.athlete_id)) {
              latestWeightMap.set(w.athlete_id, Number(w.result_weight_kg));
            }
          }
        }
      }

      // Build results with proper split_seconds, distance_meters, and weight
      const results = toSave.map((m) => {
        const csvRow = parsedRows.find((r) => r.line === m.csvLine)!;
        const allDnf = csvRow.intervals.every((i) => i.dnf);

        const enrichedIntervals: IntervalResult[] = csvRow.intervals.map((iv, i) => {
          if (iv.dnf) {
            return { rep: iv.rep, dnf: true, time_seconds: null, distance_meters: null, split_seconds: null, stroke_rate: null };
          }

          let repDistance: number | null = null;
          if (shape?.type === 'distance_interval' && shape.fixedDistance) {
            repDistance = shape.fixedDistance;
          } else if (shape?.type === 'variable_interval' && shape.variableReps?.[i]) {
            const vr = shape.variableReps[i];
            if (vr.fixedType === 'distance') repDistance = vr.fixedValue;
          }

          const splitSeconds = iv.time_seconds != null && repDistance
            ? computeSplit(iv.time_seconds, repDistance)
            : null;

          return {
            rep: iv.rep,
            time_seconds: iv.time_seconds,
            distance_meters: repDistance,
            split_seconds: splitSeconds,
            stroke_rate: null,
          };
        });

        const totalTime = allDnf
          ? null
          : enrichedIntervals.reduce((sum, iv) => sum + (iv.time_seconds ?? 0), 0) || null;

        // Resolve weight: latest assignment weight → athlete profile weight
        const ath = m.athlete!;
        const weight = latestWeightMap.get(ath.id)
          ?? (ath.weight_kg && ath.weight_kg > 0 ? ath.weight_kg : null);

        return {
          athlete_id: ath.id,
          completed: true,
          result_time_seconds: totalTime,
          result_intervals: enrichedIntervals,
          result_weight_kg: weight,
        };
      });

      await saveAssignmentResults(groupAssignmentId, results);
      toast.success(`Imported results for ${results.length} athletes.`);
      onComplete();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save results.');
      setStep('review');
    } finally {
      setIsSaving(false);
    }
  }, [matches, parsedRows, groupAssignmentId, assignment, teamId, orgId, onComplete]);

  // ── Derived ───────────────────────────────────────────────────────────────

  const matchedCount = matches.filter((m) => m.athlete !== null).length;
  const unmatchedCount = matches.filter((m) => m.athlete === null).length;
  const fuzzyCount = matches.filter((m) => m.confidence === 'fuzzy').length;

  // Athletes already matched (to exclude from dropdowns)
  const matchedAthleteIds = new Set(
    matches.filter((m) => m.athlete).map((m) => m.athlete!.id)
  );

  // ── Format helpers ────────────────────────────────────────────────────────

  const fmtTime = (s: number | null | undefined): string => {
    if (s == null) return '—';
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toFixed(1).padStart(4, '0')}`;
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Import Results from CSV"
      description={
        step === 'upload'
          ? 'Upload a CSV file or paste data. First column = athlete name, remaining columns = rep times.'
          : step === 'review'
            ? `${matchedCount} matched · ${unmatchedCount} unmatched · ${repCount} reps detected`
            : 'Saving results…'
      }
      size="full"
      className="max-w-5xl"
      closeOnBackdrop={!isSaving}
      closeOnEscape={!isSaving}
      footer={
        step === 'review' ? (
          <>
            <button
              onClick={() => setStep('upload')}
              className="px-4 py-2 text-sm rounded-lg border border-border text-content-secondary hover:bg-surface-secondary transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleSave}
              disabled={matchedCount === 0}
              className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              Import {matchedCount} Result{matchedCount !== 1 ? 's' : ''}
            </button>
          </>
        ) : undefined
      }
    >
      {/* ── Step 1: Upload / Paste ── */}
      {step === 'upload' && (
        <div className="space-y-4">
          {/* File input */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex flex-col items-center gap-3 p-8 border-2 border-dashed border-border rounded-xl hover:border-indigo-500/50 hover:bg-indigo-600/5 transition-colors cursor-pointer"
          >
            <Upload className="w-8 h-8 text-content-muted" />
            <div className="text-sm text-content-secondary">
              <span className="font-medium text-indigo-400">Click to select a CSV file</span>
              {' '}or paste data below
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-content-muted">or paste CSV text</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Text area */}
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder={`Name,1,2,3,4,5,6\nJohn Smith,03:46.8,04:01.4,03:52.4,...`}
            rows={10}
            className="w-full p-3 text-sm font-mono rounded-lg border border-border bg-surface-secondary text-content-primary placeholder:text-content-muted/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-y"
          />
          <button
            onClick={handlePasteSubmit}
            disabled={!csvText.trim()}
            className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            Parse CSV
            <ChevronRight className="w-4 h-4 inline ml-1" />
          </button>

          {parseErrors.length > 0 && (
            <div className="text-sm text-red-400 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>{parseErrors.join('. ')}</div>
            </div>
          )}
        </div>
      )}

      {/* ── Step 2: Review Matches ── */}
      {step === 'review' && (
        <div className="space-y-3">
          {/* Summary badges */}
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-900/30 text-emerald-400 border border-emerald-800/50">
              <CheckCircle2 className="w-3 h-3" />
              {matchedCount - fuzzyCount} exact
            </span>
            {fuzzyCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-900/30 text-amber-400 border border-amber-800/50">
                <HelpCircle className="w-3 h-3" />
                {fuzzyCount} fuzzy
              </span>
            )}
            {unmatchedCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-900/30 text-red-400 border border-red-800/50">
                <AlertTriangle className="w-3 h-3" />
                {unmatchedCount} unmatched
              </span>
            )}
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700">
              <FileSpreadsheet className="w-3 h-3" />
              {parsedRows.length} rows · {repCount} reps
            </span>
          </div>

          {/* Match table */}
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-secondary text-content-muted text-xs">
                  <th className="text-left px-3 py-2 font-medium">CSV Name</th>
                  <th className="text-left px-3 py-2 font-medium">Matched Athlete</th>
                  <th className="text-left px-3 py-2 font-medium">Status</th>
                  {Array.from({ length: repCount }, (_, i) => (
                    <th key={i} className="text-right px-2 py-2 font-medium font-mono">
                      R{i + 1}
                    </th>
                  ))}
                  <th className="text-right px-3 py-2 font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {matches.map((m) => {
                  const csvRow = parsedRows.find((r) => r.line === m.csvLine);
                  return (
                    <tr
                      key={m.csvLine}
                      className={
                        m.confidence === 'none'
                          ? 'bg-red-900/10'
                          : m.confidence === 'fuzzy'
                            ? 'bg-amber-900/10'
                            : ''
                      }
                    >
                      {/* CSV Name */}
                      <td className="px-3 py-2 font-medium text-content-primary whitespace-nowrap">
                        {m.csvName}
                      </td>

                      {/* Matched athlete or dropdown */}
                      <td className="px-3 py-2">
                        {m.confidence === 'exact' ? (
                          <span className="text-content-primary">{m.athlete?.name}</span>
                        ) : (
                          <select
                            value={m.athlete?.id ?? ''}
                            onChange={(e) =>
                              updateMatch(m.csvLine, e.target.value || null)
                            }
                            className="w-full text-sm rounded border border-border bg-surface-secondary text-content-primary px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                          >
                            <option value="">— Skip —</option>
                            {/* Show fuzzy candidates first */}
                            {m.candidates.length > 0 && (
                              <optgroup label="Suggested">
                                {m.candidates.map((c) => (
                                  <option
                                    key={c.athlete.id}
                                    value={c.athlete.id}
                                    disabled={
                                      matchedAthleteIds.has(c.athlete.id) &&
                                      m.athlete?.id !== c.athlete.id
                                    }
                                  >
                                    {c.athlete.name} ({Math.round(c.score * 100)}%)
                                  </option>
                                ))}
                              </optgroup>
                            )}
                            {/* All remaining athletes */}
                            <optgroup label="All Athletes">
                              {athletes
                                .filter(
                                  (a) =>
                                    !matchedAthleteIds.has(a.id) ||
                                    m.athlete?.id === a.id
                                )
                                .sort((a, b) => a.name.localeCompare(b.name))
                                .map((a) => (
                                  <option key={a.id} value={a.id}>
                                    {a.name}
                                    {a.team_name ? ` (${a.team_name})` : ''}
                                  </option>
                                ))}
                            </optgroup>
                          </select>
                        )}
                      </td>

                      {/* Status icon */}
                      <td className="px-3 py-2 text-center">
                        {m.confidence === 'exact' && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 inline" />
                        )}
                        {m.confidence === 'fuzzy' && (
                          <HelpCircle className="w-4 h-4 text-amber-400 inline" />
                        )}
                        {m.confidence === 'none' && (
                          <X className="w-4 h-4 text-red-400 inline" />
                        )}
                      </td>

                      {/* Rep times */}
                      {csvRow?.intervals.map((iv, i) => (
                        <td
                          key={i}
                          className={`text-right px-2 py-2 font-mono text-xs ${
                            iv.dnf
                              ? 'text-red-400'
                              : iv.time_seconds == null
                                ? 'text-content-muted'
                                : 'text-content-secondary'
                          }`}
                        >
                          {iv.dnf ? 'DNF' : fmtTime(iv.time_seconds)}
                        </td>
                      ))}

                      {/* Total */}
                      <td className="text-right px-3 py-2 font-mono text-xs text-content-primary font-medium">
                        {fmtTime(csvRow?.total_seconds)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Step 3: Saving ── */}
      {step === 'saving' && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
          <p className="text-sm text-content-muted">
            Saving results for {matchedCount} athletes…
          </p>
        </div>
      )}
    </Modal>
  );
}
