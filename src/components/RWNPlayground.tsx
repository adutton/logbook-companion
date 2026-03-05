import React, { useMemo, useState } from 'react';
import { Terminal, AlertCircle, CheckCircle2, ArrowRight, Cpu, Users2, Info, ClipboardList } from 'lucide-react';
import { parseRWN } from '../utils/rwnParser';
import { structureToIntervals } from '../utils/structureAdapter';
import { structureToRWN } from '../utils/structureToRWN';
import { structureToWhiteboard } from '../utils/structureToWhiteboard';
import { calculateCanonicalName } from '../utils/workoutNaming';
import { lowerWorkoutStructureToPm5 } from '../utils/rwnPm5Lowering';
import type { Pm5LoweringMode } from '../utils/rwnPm5Lowering';
import type { WorkoutStructure } from '../types/workoutStructure.types';

const PM5_BADGE: Record<Pm5LoweringMode, { label: string; color: string; bg: string; border: string }> = {
    exact: { label: 'PM5: Exact', color: 'text-emerald-400', bg: 'bg-emerald-900/20', border: 'border-emerald-800/40' },
    prompt_only: { label: 'PM5: Prompt Only', color: 'text-amber-400', bg: 'bg-amber-900/20', border: 'border-amber-800/40' },
    unsupported: { label: 'PM5: Unsupported', color: 'text-red-400', bg: 'bg-red-900/20', border: 'border-red-800/40' },
};

export const RWNPlayground: React.FC = () => {
    const [input, setInput] = useState('3 x 2000m / 4:00r');

    const { parsed, error, canonicalName, pm5Mode, pm5Notes, roundTrip, whiteboard } = useMemo((): {
        parsed: WorkoutStructure | null;
        error: string | null;
        canonicalName: string;
        pm5Mode: Pm5LoweringMode | null;
        pm5Notes: string[];
        roundTrip: string;
        whiteboard: string[];
    } => {
        if (!input.trim()) {
            return { parsed: null, error: null, canonicalName: '—', pm5Mode: null, pm5Notes: [], roundTrip: '', whiteboard: [] };
        }

        const result = parseRWN(input);
        if (!result) {
            return { parsed: null, error: 'Invalid RWN Syntax', canonicalName: '—', pm5Mode: null, pm5Notes: [], roundTrip: '', whiteboard: [] };
        }

        const pm5 = lowerWorkoutStructureToPm5(result);
        const rt = structureToRWN(result);
        const wb = structureToWhiteboard(result);

        try {
            const intervals = structureToIntervals(result);
            const name = calculateCanonicalName(intervals);
            return { parsed: result, error: null, canonicalName: name, pm5Mode: pm5.mode, pm5Notes: pm5.notes, roundTrip: rt, whiteboard: wb };
        } catch {
            return { parsed: result, error: null, canonicalName: 'Error generating name', pm5Mode: pm5.mode, pm5Notes: pm5.notes, roundTrip: rt, whiteboard: wb };
        }
    }, [input]);

    const EXAMPLES = [
        // Basic
        { label: 'Intervals', value: '4x500m/1:00r', desc: 'Distance Sprints', category: 'Basic' },
        { label: 'Time Intervals', value: '8x1:00/1:00r', desc: 'Time-based', category: 'Basic' },
        { label: 'Steady State', value: '10000m', desc: 'Distance SS', category: 'Basic' },
        { label: 'Just Row', value: '30:00', desc: 'Open time', category: 'Basic' },
        // Pace & Rate
        { label: 'Training Zone', value: '20:00@UT1', desc: 'Zone pace', category: 'Pace' },
        { label: 'Relative Pace', value: '5000m@2k+10', desc: 'PR + offset', category: 'Pace' },
        { label: 'Rate Range', value: '30:00@18..22spm', desc: 'Rate band', category: 'Pace' },
        { label: 'Pace Range', value: '60:00@2:05..2:10', desc: 'Split band', category: 'Pace' },
        { label: 'Chained', value: '30:00@UT2@r20', desc: 'Zone + rate', category: 'Pace' },
        // Advanced
        { label: 'W/U & C/D', value: '[w]10:00 + 5x500m/1:00r + [c]5:00', desc: 'Full session', category: 'Advanced' },
        { label: 'Rate Pyramid', value: '[w]5:00 + 5:00@r20 + 5:00@r22 + 5:00@r24 + 5:00@r22 + [c]5:00', desc: 'Rate steps', category: 'Advanced' },
        { label: 'Rate Shorthand', value: '30:00r20', desc: '30 min @ r20', category: 'Advanced' },
        { label: 'Variable', value: '(2000m+1000m+500m)/3:00r', desc: 'Ladder/Pyramid', category: 'Advanced' },
        { label: 'Grouped', value: '3x(750m/3:00r + 500m/3:00r)', desc: 'Nested blocks', category: 'Advanced' },
        { label: 'Undefined Rest', value: '4x2000m/...r', desc: 'Open rest', category: 'Advanced' },
        { label: 'Rate Ladder', value: '4000m@r20 + 3000m@r22 + 2000m@r24 + 1000m@r28', desc: '10K rate build', category: 'Advanced' },
        { label: 'PM5 Splits', value: '10000m [1000m]', desc: 'Split every 1k', category: 'Advanced' },
        { label: 'Rate Build', value: '2000m[500m@r22 + 500m@r24 + 500m@r26 + 500m@r30]', desc: 'Sub-segments', category: 'Advanced' },
        // Multi-Modal
        { label: 'BikeErg', value: 'Bike: 15000m', desc: 'Single modality', category: 'Multi-Modal' },
        { label: 'SkiErg', value: 'Ski: 8x500m/3:30r', desc: 'Ski intervals', category: 'Multi-Modal' },
        { label: 'Cross-Train', value: '[w]Row: 5:00 + Row: 2000m + Bike: 5000m + Ski: 2000m + [c]Row: 5:00', desc: 'Mixed modality', category: 'Multi-Modal' },
        // Orchestration
        { label: 'Partner (wait)', value: 'partner(on=4x1000m/...r, off=wait)', desc: 'Alternate with partner', category: 'Orchestration' },
        { label: 'Partner (active)', value: 'partner(on=4x1000m/...r, off=circuit(20 burpees,20 pushups,20 situps))', desc: 'Active off-task', category: 'Orchestration' },
        { label: 'Relay (basic)', value: 'relay(leg=500m, total=6000m)', desc: 'Team relay', category: 'Orchestration' },
        { label: 'Relay (sized)', value: 'relay(leg=500m, total=6000m, team_size=6)', desc: 'Explicit team size', category: 'Orchestration' },
        { label: 'Rotate', value: 'rotate(stations=3, switch=15:00, rounds=3, plan=[run(15:00),row(5:00@r20+5:00@r24+5:00@r28),bike(15:00)])', desc: 'Station rotation', category: 'Orchestration' },
        { label: 'Circuit', value: 'circuit(20 burpees, 20 pushups, 20 situps, 1:00 plank)', desc: 'Off-erg circuit', category: 'Orchestration' },
    ];

    return (
        <div className="bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden shadow-sm">
            <div className="bg-neutral-900/50 p-4 border-b border-neutral-800 flex items-center gap-2">
                <Terminal className="text-emerald-500" size={18} />
                <h3 className="font-semibold text-white">Interactive Validator</h3>
                <span className="text-xs text-neutral-500">v0.1.0-draft · RFC</span>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Input Section */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-neutral-400 mb-2">
                            Enter RWN String
                        </label>
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            className="w-full h-32 bg-neutral-900 border border-neutral-700 rounded-lg p-4 text-emerald-400 font-mono text-sm focus:outline-none focus:border-emerald-500 resize-none transition-colors"
                            placeholder="e.g., 4x500m/1:00r"
                            spellCheck={false}
                        />
                    </div>

                    {/* Status + PM5 Badge */}
                    <div className="flex items-center gap-2">
                        <div className={`flex-1 flex items-center gap-2 text-sm p-3 rounded-lg border ${error
                            ? 'bg-red-900/10 border-red-900/30 text-red-400'
                            : input.trim()
                                ? 'bg-emerald-900/10 border-emerald-900/30 text-emerald-400'
                                : 'bg-neutral-800 border-neutral-700 text-neutral-400'
                            }`}>
                            {error ? (
                                <>
                                    <AlertCircle size={16} />
                                    <span>{error}</span>
                                </>
                            ) : input.trim() ? (
                                <>
                                    <CheckCircle2 size={16} />
                                    <span>Valid Syntax</span>
                                </>
                            ) : (
                                <span>Waiting for input...</span>
                            )}
                        </div>
                        {pm5Mode && (
                            <div className={`flex items-center gap-1.5 text-xs font-medium px-3 py-3 rounded-lg border ${PM5_BADGE[pm5Mode].bg} ${PM5_BADGE[pm5Mode].border} ${PM5_BADGE[pm5Mode].color}`}>
                                <Cpu size={13} />
                                <span>{PM5_BADGE[pm5Mode].label}</span>
                            </div>
                        )}
                    </div>

                    {/* Reference Examples */}
                    <div>
                        <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wide mb-3">
                            Try Examples
                        </label>
                        <div className="space-y-3">
                            {['Basic', 'Pace', 'Advanced', 'Multi-Modal', 'Orchestration'].map(category => (
                                <div key={category}>
                                    <div className="text-[10px] font-semibold text-neutral-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        {category === 'Orchestration' && <Users2 size={10} className="text-blue-400" />}
                                        {category}
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {EXAMPLES.filter(ex => ex.category === category).map((ex) => (
                                            <button
                                                key={ex.label}
                                                onClick={() => setInput(ex.value)}
                                                className={`text-left px-3 py-2 rounded-lg border transition-all group ${
                                                    category === 'Orchestration'
                                                        ? 'border-blue-700/40 bg-blue-950/30 hover:bg-blue-900/30 hover:border-blue-600/50'
                                                        : 'border-neutral-800 bg-neutral-900 hover:bg-neutral-800 hover:border-neutral-700'
                                                }`}
                                            >
                                                <div className={`text-xs font-medium transition-colors ${
                                                    category === 'Orchestration'
                                                        ? 'text-blue-300 group-hover:text-blue-200'
                                                        : 'text-neutral-300 group-hover:text-emerald-400'
                                                }`}>
                                                    {ex.label}
                                                </div>
                                                <div className="text-[10px] text-neutral-500 mt-0.5">
                                                    {ex.desc}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Tags & Metadata */}
                    {parsed?.tags && parsed.tags.length > 0 && (
                        <div className="flex items-center justify-between bg-neutral-900 p-3 rounded-lg border border-neutral-800 mt-2">
                            <span className="text-sm text-neutral-500">Detected Tags</span>
                            <div className="flex gap-2 flex-wrap">
                                {parsed.tags.map((tag: string) => (
                                    <span key={tag} className={`px-2 py-0.5 rounded text-xs font-mono border ${
                                        tag === 'orchestration' ? 'bg-blue-900/30 text-blue-300 border-blue-700/40'
                                        : 'bg-yellow-900/20 text-yellow-500 border-yellow-800/30'
                                    }`}>
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Output Section */}
                <div className="flex flex-col h-full space-y-4">
                    {/* Whiteboard View */}
                    {whiteboard.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-neutral-400 mb-2 flex items-center gap-1.5">
                                <ClipboardList size={14} />
                                Whiteboard
                            </label>
                            <div className="bg-neutral-100 border border-neutral-300 rounded-lg p-5 font-mono text-sm text-neutral-900 leading-relaxed shadow-inner">
                                {whiteboard.map((line, i) => (
                                    <div key={i} className={
                                        // Header lines (PARTNERS, RELAY, etc.) get bold treatment
                                        /^(PARTNERS|RELAY|ROTATE|CIRCUIT|W\/U|C\/D|TEST)/.test(line)
                                            ? 'font-bold text-neutral-800'
                                            : 'text-neutral-700'
                                    }>
                                        {line || '\u00A0'}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex-1 flex flex-col">
                        <label className="block text-sm font-medium text-neutral-400 mb-2">
                            Parsed Structure
                        </label>
                        <div className="relative group flex-1">
                            <pre className="w-full h-full bg-neutral-900 border border-neutral-800 rounded-lg p-4 text-xs font-mono text-neutral-300 overflow-auto custom-scrollbar">
                                {parsed ? JSON.stringify(parsed, null, 2) : '// Output will appear here'}
                            </pre>
                            {/* Overlay Label for result */}
                            {parsed && (
                                <div className="absolute top-4 right-4 bg-neutral-800/80 backdrop-blur px-2 py-1 rounded text-xs text-emerald-400 border border-emerald-900/30">
                                    {parsed.type}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Derived Info */}
                    {parsed && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between bg-neutral-900 p-3 rounded-lg border border-neutral-800">
                                <span className="text-sm text-neutral-500">Canonical Name</span>
                                <div className="flex items-center gap-2">
                                    <ArrowRight size={14} className="text-neutral-600" />
                                    <span className="font-mono text-white font-medium">{canonicalName}</span>
                                </div>
                            </div>

                            {roundTrip && (
                                <div className="flex items-center justify-between bg-neutral-900 p-3 rounded-lg border border-neutral-800">
                                    <span className="text-sm text-neutral-500">Round-trip RWN</span>
                                    <span className="font-mono text-emerald-400 text-xs max-w-[60%] text-right truncate" title={roundTrip}>{roundTrip}</span>
                                </div>
                            )}

                            {/* Session Extension detail */}
                            {parsed.sessionExtension && (
                                <div className="bg-blue-950/30 p-3 rounded-lg border border-blue-700/40">
                                    <div className="flex items-center gap-1.5 mb-2">
                                        <Users2 size={13} className="text-blue-400" />
                                        <span className="text-xs font-semibold text-blue-300 uppercase tracking-wider">
                                            Session Extension: {parsed.sessionExtension.kind}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                        {Object.entries(parsed.sessionExtension).filter(([k]) => k !== 'kind').map(([key, val]) => (
                                            <div key={key} className="flex justify-between">
                                                <span className="text-neutral-400">{key}</span>
                                                <span className="text-blue-300 font-mono truncate max-w-[120px]" title={String(val)}>
                                                    {Array.isArray(val) ? val.join(', ') : String(val)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* PM5 Notes */}
                            {pm5Notes.length > 0 && (
                                <div className="flex items-start gap-2 bg-amber-950/10 p-3 rounded-lg border border-amber-900/20 text-xs text-amber-400">
                                    <Info size={13} className="mt-0.5 shrink-0" />
                                    <div className="space-y-1">
                                        {pm5Notes.map((note, i) => (
                                            <div key={i}>{note}</div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
